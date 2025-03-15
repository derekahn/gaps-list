const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const axios = require('axios');
const { setTimeout } = require('timers/promises');

// Configuration
const MIN_AVERAGE_VOLUME = 2000000; // 2 million
const MIN_SHARE_PRICE = 2.0; // $2 minimum share price
const MAX_SHARE_PRICE = 500.0; // $500 maximum share price
const INPUT_FILE = 'complete_list.csv';
const OUTPUT_FILE = 'filtered_list.csv';
const VOLUME_CACHE_FILE = 'volume_cache.json';
const PRICE_CACHE_FILE = 'price_cache.json';
const YAHOO_FINANCE_API_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CONCURRENCY_LIMIT = 20; // Number of parallel requests at once

// Create axios instance with retry capability
const api = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

// Add response interceptor for automatic retries
api.interceptors.response.use(null, async (error) => {
  const config = error.config;
  
  if (!config || config._retry === undefined) {
    if (config) config._retry = 0;
    else return Promise.reject(error);
  }
  
  // Log the failing URL to identify problematic tickers
  if (config && config.url) {
    // Extract ticker from URL for better debugging
    try {
      const urlObj = new URL(config.url);
      const pathParts = urlObj.pathname.split('/');
      const ticker = pathParts[pathParts.length - 1].split('?')[0];
      console.error(`Request failed for ticker: ${ticker}, Error: ${error.message}`);
    } catch (e) {
      console.error(`Request failed for URL: ${config.url}, Error: ${error.message}`);
    }
  }
  
  if (config._retry < MAX_RETRIES) {
    config._retry += 1;
    
    // Exponential backoff
    const delay = RETRY_DELAY * (2 ** (config._retry - 1));
    console.log(`Retrying request (${config._retry}/${MAX_RETRIES}) after ${delay}ms delay...`);
    
    await setTimeout(delay);
    return api(config);
  }
  
  return Promise.reject(error);
});

/**
 * Extract all tickers from the CSV file
 * @param {string} csvContent - The content of the CSV file
 * @returns {string[]} Array of unique ticker symbols
 */
function extractTickers(csvContent) {
  // Parse the CSV
  const result = Papa.parse(csvContent, {
    header: false,
    skipEmptyLines: true
  });
  
  console.log(`Parsed ${result.data.length} rows from CSV`);
  
  const tickers = new Set();
  const tickerRegex = /^[A-Z0-9./\-]{1,5}$/;
  
  // Process each row and column looking for potential ticker symbols
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    
    if (!row || !Array.isArray(row)) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      
      if (!cell || typeof cell !== 'string' || cell.startsWith('###')) continue;
      
      // A likely ticker is a short string with only uppercase letters, numbers, and occasional symbols
      const trimmedCell = cell.trim();
      if (trimmedCell && !trimmedCell.includes(' ') && tickerRegex.test(trimmedCell)) {
        tickers.add(trimmedCell);
      }
    }
  }
  
  console.log(`Extracted ${tickers.size} potential ticker symbols`);
  return Array.from(tickers);
}

/**
 * Load cached data from file
 * @param {string} cacheFile - Path to cache file
 * @returns {Object} Cached data
 */
function loadCache(cacheFile) {
  try {
    if (fs.existsSync(cacheFile)) {
      const cacheData = fs.readFileSync(cacheFile, 'utf8');
      return JSON.parse(cacheData);
    }
  } catch (error) {
    console.error(`Error loading cache from ${cacheFile}: ${error.message}`);
  }
  return {};
}

/**
 * Save data to cache file
 * @param {string} cacheFile - Path to cache file
 * @param {Object} data - Data to save
 */
function saveCache(cacheFile, data) {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving cache to ${cacheFile}: ${error.message}`);
  }
}

/**
 * Split array into chunks
 * @param {Array} array - Array to split
 * @param {number} chunkSize - Size of each chunk
 * @returns {Array} Array of chunks
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Extract data from Yahoo Finance API response
 * @param {Object} responseData - Yahoo Finance API response
 * @param {string} dataType - Type of data ('price' or 'volume')
 * @param {string} ticker - Ticker symbol
 * @returns {number|null} Extracted data value or null
 */
function extractDataFromResponse(responseData, dataType, ticker) {
  if (!responseData || !responseData.chart || !responseData.chart.result || !responseData.chart.result[0]) {
    return null;
  }
  
  const result = responseData.chart.result[0];
  
  if (dataType === 'price') {
    // Extract price data
    if (result.meta && result.meta.regularMarketPrice !== undefined) {
      return result.meta.regularMarketPrice;
    } else if (result.indicators && 
              result.indicators.quote && 
              result.indicators.quote[0] && 
              result.indicators.quote[0].close) {
      // Fall back to last close price
      const closes = result.indicators.quote[0].close.filter(p => p !== null);
      if (closes.length > 0) {
        return closes[closes.length - 1];
      }
    }
  } else if (dataType === 'volume') {
    // Extract volume data
    if (result.indicators && 
        result.indicators.quote && 
        result.indicators.quote[0] && 
        result.indicators.quote[0].volume) {
      
      const volumes = result.indicators.quote[0].volume.filter(v => v !== null);
      if (volumes.length > 0) {
        // Calculate average volume
        const sum = volumes.reduce((acc, vol) => acc + vol, 0);
        return sum / volumes.length;
      }
    }
  }
  
  return null;
}

/**
 * Fetch data for a single ticker
 * @param {string} ticker - Ticker symbol
 * @param {string} range - Data range ('1d' for price, '1mo' for volume)
 * @param {string} dataType - Type of data ('price' or 'volume')
 * @returns {Promise<Object>} Object with ticker and data
 */
async function fetchSingleTicker(ticker, range, dataType) {
  // Handle special cases like warrants
  const cleanedTicker = ticker.includes('/') ? ticker.split('/')[0] : ticker;
  
  try {
    const url = `${YAHOO_FINANCE_API_BASE}${cleanedTicker}?interval=1d&range=${range}`;
    const response = await api.get(url);
    
    const value = extractDataFromResponse(response.data, dataType, cleanedTicker);
    
    if (value !== null) {
      if (dataType === 'price') {
        console.log(`${cleanedTicker}: $${value.toFixed(2)}`);
      } else {
        console.log(`${cleanedTicker}: ${value.toLocaleString()} avg volume`);
      }
      
      // Return an object with the ticker as key and value as value
      return { [cleanedTicker]: value };
    }
    
    console.warn(`No ${dataType} data available for ${cleanedTicker}`);
    return { [cleanedTicker]: 0 };
  } catch (error) {
    console.error(`Failed to fetch ${dataType} for ${cleanedTicker}: ${error.message}`);
    return { [cleanedTicker]: 0 };
  }
}

/**
 * Process tickers in chunks with controlled concurrency
 * @param {string[]} tickers - Array of ticker symbols
 * @param {string} range - Data range ('1d' for price, '1mo' for volume)
 * @param {string} dataType - Type of data ('price' or 'volume')
 * @returns {Promise<Object>} Object mapping tickers to their data
 */
async function processTickersWithConcurrency(tickers, range, dataType) {
  const results = {};
  
  // Process tickers in chunks to control concurrency
  const chunks = chunkArray(tickers, CONCURRENCY_LIMIT);
  let processedCount = 0;
  const totalCount = tickers.length;
  
  for (const chunk of chunks) {
    // Create a promise for each ticker in the chunk
    const promises = chunk.map(ticker => fetchSingleTicker(ticker, range, dataType));
    
    // Execute all promises in the current chunk concurrently
    const chunkResults = await Promise.all(promises);
    
    // Merge results
    chunkResults.forEach(result => Object.assign(results, result));
    
    // Update progress
    processedCount += chunk.length;
    console.log(`Progress: ${processedCount}/${totalCount} (${Math.round(processedCount/totalCount*100)}%)`);
    
    // Small delay between chunks to avoid rate limiting
    if (processedCount < totalCount) {
      await setTimeout(500);
    }
  }
  
  return results;
}

/**
 * Fetch all required data for tickers
 * @param {string[]} tickers - All ticker symbols
 * @returns {Promise<Object>} Object with price and volume data
 */
async function fetchAllTickerData(tickers) {
  console.time('Data fetching');
  
  // Load cached data
  const cachedPriceData = loadCache(PRICE_CACHE_FILE);
  const cachedVolumeData = loadCache(VOLUME_CACHE_FILE);
  
  // Check if we should use only cached data
  const useOnlyCache = process.argv.includes('--cache-only');
  if (useOnlyCache) {
    console.log('Using cached data only (--cache-only flag used)');
    return {
      priceData: cachedPriceData,
      volumeData: cachedVolumeData
    };
  }
  
  // Filter tickers that need to be fetched
  const tickersNeedingPrice = tickers.filter(ticker => !(ticker in cachedPriceData));
  const tickersNeedingVolume = tickers.filter(ticker => !(ticker in cachedVolumeData));
  
  console.log(`Need to fetch price data for ${tickersNeedingPrice.length} tickers`);
  console.log(`Need to fetch volume data for ${tickersNeedingVolume.length} tickers`);
  
  const priceData = { ...cachedPriceData };
  const volumeData = { ...cachedVolumeData };
  
  // Process price data
  if (tickersNeedingPrice.length > 0) {
    console.log('Fetching price data...');
    const newPriceData = await processTickersWithConcurrency(tickersNeedingPrice, '1d', 'price');
    Object.assign(priceData, newPriceData);
    saveCache(PRICE_CACHE_FILE, priceData);
    console.log(`Fetched price data for ${Object.keys(newPriceData).length} tickers`);
  }
  
  // Process volume data
  if (tickersNeedingVolume.length > 0) {
    console.log('Fetching volume data...');
    const newVolumeData = await processTickersWithConcurrency(tickersNeedingVolume, '1mo', 'volume');
    Object.assign(volumeData, newVolumeData);
    saveCache(VOLUME_CACHE_FILE, volumeData);
    console.log(`Fetched volume data for ${Object.keys(newVolumeData).length} tickers`);
  }
  
  console.timeEnd('Data fetching');
  
  return { priceData, volumeData };
}

/**
 * Filter tickers based on criteria
 * @param {string[]} tickers - All ticker symbols
 * @param {Object} volumeData - Volume data by ticker
 * @param {Object} priceData - Price data by ticker
 * @returns {Object} Filtered results
 */
function filterTickers(tickers, volumeData, priceData) {
  const filtered = [];
  const removed = [];
  
  for (const ticker of tickers) {
    const avgVolume = volumeData[ticker] || 0;
    const price = priceData[ticker] || 0;
    
    const reasons = [];
    
    if (avgVolume < MIN_AVERAGE_VOLUME) {
      reasons.push(`low volume (${avgVolume.toLocaleString()} < ${MIN_AVERAGE_VOLUME.toLocaleString()})`);
    }
    
    if (price < MIN_SHARE_PRICE) {
      reasons.push(`low price ($${price.toFixed(2)} < $${MIN_SHARE_PRICE.toFixed(2)})`);
    }
    
    if (price > MAX_SHARE_PRICE) {
      reasons.push(`high price ($${price.toFixed(2)} > $${MAX_SHARE_PRICE.toFixed(2)})`);
    }
    
    if (reasons.length === 0) {
      filtered.push(ticker);
    } else {
      removed.push({
        ticker,
        volume: avgVolume,
        price,
        reasons: reasons.join(', ')
      });
    }
  }
  
  return { filtered, removed };
}

/**
 * Update CSV with filtered tickers
 * @param {string} inputCsvContent - Original CSV content
 * @param {string[]} filteredTickers - Filtered ticker symbols
 * @returns {string} Updated CSV content
 */
function updateCsvWithFilteredTickers(inputCsvContent, filteredTickers) {
  const result = Papa.parse(inputCsvContent, {
    header: false,
    skipEmptyLines: true
  });
  
  if (!result.data || result.data.length === 0) {
    return inputCsvContent;
  }
  
  const filteredData = [];
  const filteredTickersSet = new Set(filteredTickers);
  const tickerRegex = /^[A-Z0-9./\-]{1,5}$/;
  
  for (const row of result.data) {
    if (!row || !Array.isArray(row)) {
      filteredData.push(row);
      continue;
    }
    
    const newRow = [...row];
    
    for (let j = 0; j < newRow.length; j++) {
      const cell = newRow[j];
      
      if (!cell || typeof cell !== 'string' || cell.startsWith('###')) {
        continue;
      }
      
      const trimmedCell = cell.trim();
      if (trimmedCell && 
          !trimmedCell.includes(' ') && 
          tickerRegex.test(trimmedCell) && 
          !filteredTickersSet.has(trimmedCell)) {
        newRow[j] = '';
      }
    }
    
    filteredData.push(newRow);
  }
  
  return Papa.unparse(filteredData);
}

/**
 * Generate report for filtered tickers
 * @param {Object} params - Parameter object with all required data
 * @returns {string} Report content
 */
function generateReport({ tickers, filtered, removed, volumeData, priceData, inputFile, outputFile }) {
  let report = `Stock Filter Report\n`;
  report += `=================\n\n`;
  report += `Input file: ${inputFile}\n`;
  report += `Output file: ${outputFile}\n`;
  report += `Minimum volume threshold: ${MIN_AVERAGE_VOLUME.toLocaleString()}\n`;
  report += `Price range: $${MIN_SHARE_PRICE.toFixed(2)} - $${MAX_SHARE_PRICE.toFixed(2)}\n`;
  report += `Date: ${new Date().toLocaleString()}\n\n`;
  
  report += `Summary:\n`;
  report += `- Total tickers analyzed: ${tickers.length}\n`;
  report += `- Tickers meeting all criteria: ${filtered.length}\n`;
  report += `- Tickers filtered out: ${removed.length}\n\n`;
  
  report += `Tickers Meeting Criteria:\n`;
  filtered.sort().forEach(ticker => {
    report += `${ticker}: Volume=${volumeData[ticker].toLocaleString()}, Price=$${priceData[ticker].toFixed(2)}\n`;
  });
  
  report += `\nFiltered Out Tickers:\n`;
  removed.sort((a, b) => a.ticker.localeCompare(b.ticker)).forEach(item => {
    report += `${item.ticker}: Volume=${item.volume.toLocaleString()}, Price=$${item.price.toFixed(2)} - Removed due to: ${item.reasons}\n`;
  });
  
  return report;
}

/**
 * Main function
 */
async function main() {
  try {
    console.time('Total execution time');
    
    // Get command line args
    const args = process.argv.slice(2);
    const inputFile = args[0] || INPUT_FILE;
    const outputFile = args[1] || OUTPUT_FILE;
    
    console.log(`Reading input file: ${inputFile}`);
    
    // Read input file
    let csvContent;
    try {
      csvContent = fs.readFileSync(inputFile, { encoding: 'utf8' });
      console.log(`Successfully read file, size: ${csvContent.length} bytes`);
    } catch (fileError) {
      console.error(`File reading error: ${fileError.message}`);
      process.exit(1);
    }
    
    // Extract tickers
    console.time('Extract tickers');
    const tickers = extractTickers(csvContent);
    console.timeEnd('Extract tickers');
    
    if (!tickers || tickers.length === 0) {
      console.error("No valid tickers found in the CSV file.");
      process.exit(1);
    }
    
    // Fetch all data
    const { priceData, volumeData } = await fetchAllTickerData(tickers);
    
    // Apply filters
    console.time('Filter tickers');
    const { filtered, removed } = filterTickers(tickers, volumeData, priceData);
    console.timeEnd('Filter tickers');
    
    console.log(`\nResults:`);
    console.log(`- Total tickers: ${tickers.length}`);
    console.log(`- Tickers meeting criteria: ${filtered.length}`);
    console.log(`- Tickers filtered out: ${removed.length}`);
    
    // Create filtered CSV
    console.time('Create filtered CSV');
    const updatedCsvContent = updateCsvWithFilteredTickers(csvContent, filtered);
    fs.writeFileSync(outputFile, updatedCsvContent);
    console.timeEnd('Create filtered CSV');
    
    console.log(`\nFiltered tickers saved to ${outputFile}`);
    
    // Generate report
    console.time('Generate report');
    const reportFile = outputFile.replace('.csv', '_report.txt');
    const reportContent = generateReport({
      tickers,
      filtered,
      removed,
      volumeData,
      priceData,
      inputFile,
      outputFile
    });
    fs.writeFileSync(reportFile, reportContent);
    console.timeEnd('Generate report');
    
    console.log(`Detailed report saved to ${reportFile}`);
    console.timeEnd('Total execution time');
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
  }
}

// Display help or run main
if (process.argv.includes('--help')) {
  console.log(`
Usage: node filter-tickers.js [inputFile] [outputFile] [options]

Arguments:
  inputFile     Path to the input CSV file (default: ${INPUT_FILE})
  outputFile    Path to the output CSV file (default: ${OUTPUT_FILE})

Options:
  --cache-only  Use only cached volume and price data (no API calls)
  --help        Display this help information

Examples:
  node filter-tickers.js
  node filter-tickers.js my_watchlist.csv filtered_watchlist.csv
  node filter-tickers.js --cache-only
  `);
} else {
  main();
}
