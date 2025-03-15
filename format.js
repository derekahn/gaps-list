const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

/**
 * CSV to TradingView Watchlist Converter
 * 
 * This script processes a CSV file with "Complete List", "Trimmed List", and "Favorite Gaps"
 * sections to create a TradingView watchlist with proper section formatting.
 * 
 * The "Complete List" sections will have any symbols removed that already exist in the 
 * corresponding "Trimmed List" sections.
 */

// Configuration
const inputFilePath = 'Gaps  & Earnings - Gaps List.csv'; // Change to your input file
const outputFilePath = 'complete_list.csv'; // Output file
const includedSections = ['Complete List', 'Trimmed List', 'Favorite Gaps']; // Include these sections

// Process the CSV directly to find and extract the sections we need
function convertToTradingViewFormat() {
  console.log('Starting conversion...');
  
  try {
    // Read the CSV file
    const csvData = fs.readFileSync(inputFilePath, 'utf8');
    
    // Parse the CSV
    const parsedCsv = Papa.parse(csvData, {
      header: false,
      skipEmptyLines: true
    });
    
    const rows = parsedCsv.data;
    console.log(`Total rows: ${rows.length}`);
    
    // Find all the sections we need
    const completeListIndex = rows[1].findIndex(cell => cell && cell.trim() === 'Complete List');
    const trimmedListIndex = rows[1].findIndex(cell => cell && cell.trim() === 'Trimmed List');
    const favoriteGapsIndex = rows[1].findIndex(cell => cell && cell.trim() === 'Favorite Gaps');
    
    console.log(`Found "Complete List" at index ${completeListIndex}`);
    console.log(`Found "Trimmed List" at index ${trimmedListIndex}`);
    console.log(`Found "Favorite Gaps" at index ${favoriteGapsIndex}`);
    
    // Find the columns for all subsections
    let completeListUp = -1;
    let completeListDown = -1;
    let trimmedListUp = -1;
    let trimmedListDown = -1;
    let favoriteGapsBullish = -1;
    let favoriteGapsBearish = -1;
    
    for (let i = 0; i < rows[2].length; i++) {
      const header = rows[2][i] && rows[2][i].trim();
      
      // For Complete List section
      if (header === 'Up' && i >= completeListIndex && i < trimmedListIndex &&
          (rows[1][i] === '' || rows[1][i] === 'Complete List')) {
        completeListUp = i;
      }
      else if (header === 'Down' && i >= completeListIndex && i < trimmedListIndex &&
              (rows[1][i] === '' || rows[1][i] === 'Complete List')) {
        completeListDown = i;
      }
      
      // For Trimmed List section
      if (header === 'Up' && i >= trimmedListIndex && i < favoriteGapsIndex &&
          (rows[1][i] === '' || rows[1][i] === 'Trimmed List')) {
        trimmedListUp = i;
      }
      else if (header === 'Down' && i >= trimmedListIndex && i < favoriteGapsIndex &&
              (rows[1][i] === '' || rows[1][i] === 'Trimmed List')) {
        trimmedListDown = i;
      }
      
      // For Favorite Gaps section
      if (header === 'Bullish' && i >= favoriteGapsIndex &&
          (rows[1][i] === '' || rows[1][i] === 'Favorite Gaps')) {
        favoriteGapsBullish = i;
      }
      else if (header === 'Bearish' && i >= favoriteGapsIndex &&
              (rows[1][i] === '' || rows[1][i] === 'Favorite Gaps')) {
        favoriteGapsBearish = i;
      }
    }
    
    console.log(`Complete List Up: column ${completeListUp}, Down: column ${completeListDown}`);
    console.log(`Trimmed List Up: column ${trimmedListUp}, Down: column ${trimmedListDown}`);
    console.log(`Favorite Gaps Bullish: column ${favoriteGapsBullish}, Bearish: column ${favoriteGapsBearish}`);
    
    // Extract the symbols for each section
    const completeListUpSymbols = [];
    const completeListDownSymbols = [];
    const trimmedListUpSymbols = [];
    const trimmedListDownSymbols = [];
    const favoriteGapsBullishSymbols = [];
    const favoriteGapsBearishSymbols = [];
    
    // Start from row 4 (index 3) to skip headers
    for (let rowIndex = 3; rowIndex < rows.length; rowIndex++) {
      // Extract Trimmed List symbols first (we need these for filtering)
      
      // Extract Trimmed List - Up symbols
      if (trimmedListUp !== -1 && rows[rowIndex][trimmedListUp] && rows[rowIndex][trimmedListUp].trim() !== '') {
        let symbol = rows[rowIndex][trimmedListUp].trim();
        if (symbol.includes('(')) {
          symbol = symbol.split('(')[0].trim();
        }
        trimmedListUpSymbols.push(symbol);
      }
      
      // Extract Trimmed List - Down symbols
      if (trimmedListDown !== -1 && rows[rowIndex][trimmedListDown] && rows[rowIndex][trimmedListDown].trim() !== '') {
        let symbol = rows[rowIndex][trimmedListDown].trim();
        if (symbol.includes('(')) {
          symbol = symbol.split('(')[0].trim();
        }
        trimmedListDownSymbols.push(symbol);
      }
      
      // Extract Complete List - Up symbols
      if (completeListUp !== -1 && rows[rowIndex][completeListUp] && rows[rowIndex][completeListUp].trim() !== '') {
        let symbol = rows[rowIndex][completeListUp].trim();
        // Remove any notes in parentheses
        if (symbol.includes('(')) {
          symbol = symbol.split('(')[0].trim();
        }
        completeListUpSymbols.push(symbol);
      }
      
      // Extract Complete List - Down symbols
      if (completeListDown !== -1 && rows[rowIndex][completeListDown] && rows[rowIndex][completeListDown].trim() !== '') {
        let symbol = rows[rowIndex][completeListDown].trim();
        if (symbol.includes('(')) {
          symbol = symbol.split('(')[0].trim();
        }
        completeListDownSymbols.push(symbol);
      }
      
      // Extract Favorite Gaps - Bullish symbols
      if (favoriteGapsBullish !== -1 && rows[rowIndex][favoriteGapsBullish] && rows[rowIndex][favoriteGapsBullish].trim() !== '') {
        let symbol = rows[rowIndex][favoriteGapsBullish].trim();
        if (symbol.includes('(')) {
          symbol = symbol.split('(')[0].trim();
        }
        favoriteGapsBullishSymbols.push(symbol);
      }
      
      // Extract Favorite Gaps - Bearish symbols
      if (favoriteGapsBearish !== -1 && rows[rowIndex][favoriteGapsBearish] && rows[rowIndex][favoriteGapsBearish].trim() !== '') {
        let symbol = rows[rowIndex][favoriteGapsBearish].trim();
        if (symbol.includes('(')) {
          symbol = symbol.split('(')[0].trim();
        }
        favoriteGapsBearishSymbols.push(symbol);
      }
    }
    
    console.log(`\nComplete List Up (before filtering): ${completeListUpSymbols.length} symbols`);
    console.log(`Complete List Down (before filtering): ${completeListDownSymbols.length} symbols`);
    console.log(`Trimmed List Up: ${trimmedListUpSymbols.length} symbols`);
    console.log(`Trimmed List Down: ${trimmedListDownSymbols.length} symbols`);
    
    // Filter out symbols from Complete List that are already in Trimmed List
    const filteredCompleteListUpSymbols = completeListUpSymbols.filter(
      symbol => !trimmedListUpSymbols.includes(symbol)
    );
    
    const filteredCompleteListDownSymbols = completeListDownSymbols.filter(
      symbol => !trimmedListDownSymbols.includes(symbol)
    );
    
    console.log(`Complete List Up (after filtering): ${filteredCompleteListUpSymbols.length} symbols`);
    console.log(`Complete List Down (after filtering): ${filteredCompleteListDownSymbols.length} symbols`);
    console.log(`Favorite Gaps Bullish: ${favoriteGapsBullishSymbols.length} symbols`);
    console.log(`Favorite Gaps Bearish: ${favoriteGapsBearishSymbols.length} symbols`);
    
    // Create the TradingView watchlist format
    let tradingViewFormat = '';
    
    // Add the sections in the requested order
    //
    if (favoriteGapsBullishSymbols.length > 0) {
      tradingViewFormat += `###🐂 Bullish,${favoriteGapsBullishSymbols.join(',')},`;
    }
    
    if (favoriteGapsBearishSymbols.length > 0) {
      tradingViewFormat += `###🐻 Bearish,${favoriteGapsBearishSymbols.join(',')},`;
    }

    if (trimmedListUpSymbols.length > 0) {
      tradingViewFormat += `###⬆️ Gap Up,${trimmedListUpSymbols.join(',')},`;
    }
    
    if (trimmedListDownSymbols.length > 0) {
      tradingViewFormat += `###⬇️ Gap Down,${trimmedListDownSymbols.join(',')},`;
    }

    if (filteredCompleteListUpSymbols.length > 0) {
      tradingViewFormat += `###👍 Other Gap Ups,${filteredCompleteListUpSymbols.join(',')},`;
    }
    
    if (filteredCompleteListDownSymbols.length > 0) {
      tradingViewFormat += `###👎 Other Gap Downs,${filteredCompleteListDownSymbols.join(',')},`;
    }
    
    // Remove trailing comma
    if (tradingViewFormat.endsWith(',')) {
      tradingViewFormat = tradingViewFormat.slice(0, -1);
    }
    
    // Write to output file
    fs.writeFileSync(outputFilePath, tradingViewFormat);
    
    console.log(`\nConversion complete! Output saved to ${outputFilePath}`);
    console.log('\nOutput preview:');
    console.log(tradingViewFormat.substring(0, 200) + (tradingViewFormat.length > 200 ? '...' : ''));
    
    // Print summary
    console.log('\nSections in output:');

    if (favoriteGapsBullishSymbols.length > 0) {
      console.log(`- 🐂 Bullish: ${favoriteGapsBullishSymbols.length} symbols`);
    }
    if (favoriteGapsBearishSymbols.length > 0) {
      console.log(`- 🐻 Bearish: ${favoriteGapsBearishSymbols.length} symbols`);
    }
    if (trimmedListUpSymbols.length > 0) {
      console.log(`- ⬆️ Gap Up: ${trimmedListUpSymbols.length} symbols`);
    }
    if (trimmedListDownSymbols.length > 0) {
      console.log(`- ⬇️ Gap Down: ${trimmedListDownSymbols.length} symbols`);
    }
    if (filteredCompleteListUpSymbols.length > 0) {
      console.log(`- 👍 Other Gap Ups: ${filteredCompleteListUpSymbols.length} symbols (filtered)`);
    }
    if (filteredCompleteListDownSymbols.length > 0) {
      console.log(`- 👎 Other Gap Downs: ${filteredCompleteListDownSymbols.length} symbols (filtered)`);
    }
    
  } catch (error) {
    console.error('Error processing file:', error);
  }
}

// Run the conversion
convertToTradingViewFormat();
