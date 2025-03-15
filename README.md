# Gaps List

Simple node.js program(s) that format and filter daily gaps into a tradingview watch list.

- `format.js` formats an expected `Gaps\ \ \&\ Earnings\ -\ Gaps\ List.csv` to a [trading view watchlist](https://www.tradingview.com/support/solutions/43000487233-how-to-import-or-export-watchlist/) compatible format
- `filter.js` filters out tickers with low volume, too low and too high prices

## Quick Start

Project setup and execution:

```bash
$ npm install

$ node format.js

$ node filter.js
```

**Import List**:

![import](./assets/import.png)

**Select file**:

![file selection](./assets/select.png)

**Watch list**:

![watchlist](./assets/watchlist.png)

## format.js

Program is expecting filename to be `Gaps & Earnings - Gaps List.csv`

Expecting `csv` to be formatted like:

```csv
,,,,,,,,,,,,,,
,Complete List,,,Trimmed List,,,Favorite Gaps,,,"""Unique"" Gaps",,,,
,Up ,Down,,Up ,Down,,Bullish,Bearish,,Secondary,Ex-div,Spin-off,Buyout,Split
,ACNT,ADBE,,ACNT,ADBE,,FEMY,PATH,,ATEN (notes),,,,
,ADV,ADTX,,ADV,AEO,,,S,,SPIR,,,,
,AISPW,AEO,,CCLD,ATEN,,,CERO,,,,,,
,AVAH,AEYE,,DG,CERO,,,,,,,,,
,BBW,AIEV,,DLTR,CMI,,,,,,,,,
,BIDU,AREB,,FEMY,CMTL,,,,,,,,,
,BKYI,ATEN,,GIII,CSCI,,,,,,,,,
,CCLD,BABA,,HMR,DLTH,,,,,,,,,
,CRVO,BHAT,,INTC,GDS,,,,,,,,,
,DG,BTMD,,IONQ,MNSO,,,,,,,,,
,DLTR,BURU,,LUCK,NET,,,,,,,,,
,DMN,CDLX,,MGTX,NOVA,,,,,,,,,
,FEMY,CLRB,,QBTS,PATH,,,,,,,,,
,FFNW,CMI,,RAIL,PCAR,,,,,,,,,
,FN,CMTL,,SATL,S,,,,,,,,,
,FUTU,CSCI,,XCUR,SAP,,,,,,,,,
,GIII,CTMX,,WCT,SPIR,,,,,,,,,
,HAIN,DLTH,,,SSL,,,,,,,,,
,HMR,ECOR,,,TSM,,,,,,,,,
,INTC,GDS,,,VNET,,,,,,,,,
,INTW,HCTI,,,,,,,,,,,,
,IONQ,HEPA,,,,,,,,,,,,
,IONX,HIT,,,,,,,,,,,,
,IPA,HPH,,,,,,,,,,,,
,LUCD,IRBT,,,,,,,,,,,,
,LUCK,MNSO,,,,,,,,,,,,
,MGTX,MXCT,,,,,,,,,,,,
,MYNZ,NOVA,,,,,,,,,,,,
,NVO,ONCO,,,,,,,,,,,,
,NYXH,PALI,,,,,,,,,,,,
,ODC,PATH,,,,,,,,,,,,
,PHAR,PBM,,,,,,,,,,,,
,QBTS,PCAR,,,,,,,,,,,,
,QMMM,PESI,,,,,,,,,,,,
,RAIL,PSTV,,,,,,,,,,,,
,RNAZ,PWM,,,,,,,,,,,,
,SATL,S,,,,,,,,,,,,
,SNES,SAP,,,,,,,,,,,,
,SPGC,SBSW,,,,,,,,,,,,
,TRNR,SCNX,,,,,,,,,,,,
,UPB,SOUNW,,,,,,,,,,,,
,WLGS,SPHL,,,,,,,,,,,,
,XCUR,SPIR,,,,,,,,,,,,
,ZBIO,SSL,,,,,,,,,,,,
,WCT,STI,,,,,,,,,,,,
,,TSM,,,,,,,,,,,,
,,ULY,,,,,,,,,,,,
,,VNET,,,,,,,,,,,,
,,VSTE,,,,,,,,,,,,
```

Usage:

```bash
$ node format.js
```

## filter.js

Program is expecting filename to be `complete_list.csv`

Expecting `csv` to be formatted like:

```csv
###🐂 Bullish
FEMY

###🐻 Bearish
PATH
S
CERO

###⬆️ Gap Up
ACNT
ADV
CCLD
DG
DLTR
FEMY
GIII
HMR
INTC
IONQ
LUCK
MGTX
QBTS
RAIL
SATL
XCUR
WCT

###⬇️ Gap Down
ADBE
AEO
ATEN
CERO
CMI
CMTL
CSCI
DLTH
GDS
MNSO
NET
NOVA
PATH
PCAR
S
SAP
SPIR
SSL
TSM
VNET

###👍 Other Gap Ups
AISPW
AVAH
BBW
BIDU
BKYI
CRVO
DMN
FFNW
FN
FUTU
HAIN
INTW
IONX
IPA
LUCD
MYNZ
NVO
NYXH
ODC
PHAR
QMMM
RNAZ
SNES
SPGC
TRNR
UPB
WLGS
ZBIO

###👎 Other Gap Downs
ADTX
AEYE
AIEV
AREB
BABA
BHAT
BTMD
BURU
CDLX
CLRB
CTMX
ECOR
HCTI
HEPA
HIT
HPH
IRBT
MXCT
ONCO
PALI
PBM
PESI
PSTV
PWM
SBSW
SCNX
SOUNW
SPHL
STI
ULY
VSTE
```

Usage:

```bash
$ node filter.js
```

You can change the options:

```bash
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
```

## Shell Alias

Recommend adding this to your your `rc` (`.zshrc`, `.bashrc`) so anywhere in the terminal you can just execute:

`$ gaps`

Takes some strong opinionated conventions of filenames and paths though

```bash
function gaps() {
    # Set up paths
    DOWNLOAD_DIR="$HOME/Downloads"
    WATCHLIST_DIR="$HOME/code/watchlist"
    INPUT_FILE="Gaps  & Earnings - Gaps List.csv"
    FORMATTED_OUTPUT="🕳️_gaps.csv"

    # Move downloaded file to watchlist directory
    mv "$DOWNLOAD_DIR/$INPUT_FILE" "$WATCHLIST_DIR/"
    cd "$WATCHLIST_DIR"

    # Clean up previous files
    rm -f complete_list.csv \
          price_cache.json \
          volume_cache.json \
          filtered_list_report.txt \
          filtered_list.csv \
          2>/dev/null || true

    # Process data
    echo "Formatting data..."
    node format.js

    echo "Filtering tickers..."
    node filter.js

    # Move result back to downloads
    cp filtered_list.csv "$FORMATTED_OUTPUT"
    mv "$FORMATTED_OUTPUT" "$DOWNLOAD_DIR/"

    # Return to downloads directory
    cd "$DOWNLOAD_DIR/"

    echo "✅ Process complete! Filtered gaps file available in Downloads."
}
```

Example:

```bash
$ gaps

Formatting data...
Starting conversion...
Total rows: 52
Found "Complete List" at index 1
Found "Trimmed List" at index 4
Found "Favorite Gaps" at index 7
Complete List Up: column 1, Down: column 2
Trimmed List Up: column 4, Down: column 5
Favorite Gaps Bullish: column 7, Bearish: column 8

Complete List Up (before filtering): 45 symbols
Complete List Down (before filtering): 49 symbols
Trimmed List Up: 17 symbols
Trimmed List Down: 20 symbols
Complete List Up (after filtering): 28 symbols
Complete List Down (after filtering): 31 symbols
Favorite Gaps Bullish: 1 symbols
Favorite Gaps Bearish: 3 symbols

Conversion complete! Output saved to complete_list.csv

Output preview:
###🐂 Bullish,FEMY,###🐻 Bearish,PATH,S,CERO,###⬆️ Gap Up,ACNT,ADV,CCLD,DG,DLTR,FEMY,GIII,HMR,INTC,IONQ,LUCK,MGTX,QBTS,RAIL,SATL,XCUR,WCT,###⬇️ Gap Down,ADBE,AEO,ATEN,CERO,CMI,CMTL,CSCI,DLTH,GDS,MNSO,...

Sections in output:
- 🐂 Bullish: 1 symbols
- 🐻 Bearish: 3 symbols
- ⬆️ Gap Up: 17 symbols
- ⬇️ Gap Down: 20 symbols
- 👍 Other Gap Ups: 28 symbols (filtered)
- 👎 Other Gap Downs: 31 symbols (filtered)
Filtering tickers...
Reading input file: complete_list.csv
Successfully read file, size: 567 bytes
Parsed 1 rows from CSV
Extracted 96 potential ticker symbols
Extract tickers: 0.541ms
Need to fetch price data for 96 tickers
Need to fetch volume data for 96 tickers
Fetching price data...
PATH: $10.88
CERO: $1.02
DLTR: $64.56
HMR: $3.45
LUCK: $9.67
XCUR: $12.83
IONQ: $25.00
FEMY: $1.57
SATL: $3.58
QBTS: $10.15
WCT: $0.55
GIII: $26.68
MGTX: $7.79
CCLD: $1.47
DG: $79.02
ACNT: $12.45
RAIL: $6.58
S: $18.51
INTC: $24.05
ADV: $1.70
Progress: 20/96 (21%)
ATEN: $16.86
MNSO: $20.69
AVAH: $5.19
DLTH: $2.28
NET: $116.15
CMTL: $1.76
CSCI: $3.29
TSM: $174.09
AEO: $11.06
CMI: $321.70
PCAR: $99.21
SAP: $263.88
SPIR: $8.57
ADBE: $394.74
AISPW: $0.93
BBW: $36.49
VNET: $11.65
SSL: $4.33
GDS: $35.27
NOVA: $0.32
Progress: 40/96 (42%)
BIDU: $93.82
CRVO: $6.44
MYNZ: $4.37
BKYI: $1.20
IONX: $34.27
IPA: $0.39
DMN: $0.16
HAIN: $3.81
SNES: $2.19
RNAZ: $0.78
QMMM: $1.41
INTW: $26.33
PHAR: $8.95
NYXH: $10.51
FN: $220.00
LUCD: $1.39
FFNW: $22.53
FUTU: $118.47
NVO: $77.15
ODC: $48.27
Progress: 60/96 (63%)
SPGC: $0.10
ZBIO: $8.25
HIT: $0.82
HEPA: $0.02
CLRB: $0.32
WLGS: $4.08
BURU: $0.23
UPB: $9.61
AEYE: $11.34
BHAT: $0.03
AIEV: $0.17
ECOR: $8.56
AREB: $0.21
TRNR: $1.26
BTMD: $3.76
BABA: $141.10
HCTI: $0.45
CDLX: $2.47
CTMX: $0.65
ADTX: $0.02
Progress: 80/96 (83%)
PSTV: $0.68
SOUNW: $4.17
PESI: $7.29
IRBT: $3.70
SCNX: $1.49
HPH: $0.16
PWM: $0.53
MXCT: $3.29
PBM: $0.78
PALI: $1.00
ONCO: $0.13
STI: $0.15
ULY: $0.29
VSTE: $0.51
SPHL: $0.60
SBSW: $3.93
Progress: 96/96 (100%)
Fetched price data for 96 tickers
Fetching volume data...
S: 7,384,073.684 avg volume
XCUR: 51,300 avg volume
ADV: 658,110.526 avg volume
QBTS: 71,541,831.579 avg volume
SATL: 820,273.684 avg volume
GIII: 630,389.474 avg volume
MGTX: 746,431.579 avg volume
FEMY: 752,810.526 avg volume
HMR: 10,330,841.176 avg volume
LUCK: 510,642.105 avg volume
IONQ: 20,260,284.211 avg volume
CERO: 493,815.789 avg volume
DLTR: 3,811,568.421 avg volume
DG: 4,455,778.947 avg volume
CCLD: 2,035,536.842 avg volume
WCT: 9,795,726.316 avg volume
RAIL: 322,742.105 avg volume
PATH: 13,640,973.684 avg volume
ACNT: 31,426.316 avg volume
INTC: 125,942,257.895 avg volume
Progress: 20/96 (21%)
NET: 4,657,073.684 avg volume
AISPW: 34,950 avg volume
DLTH: 42,121.053 avg volume
AVAH: 395,278.947 avg volume
GDS: 5,084,894.737 avg volume
VNET: 15,365,500 avg volume
BBW: 297,763.158 avg volume
NOVA: 29,438,884.211 avg volume
ADBE: 3,800,173.684 avg volume
SPIR: 688,563.158 avg volume
CSCI: 42,342.105 avg volume
ATEN: 1,333,647.368 avg volume
AEO: 6,277,536.842 avg volume
TSM: 18,573,084.211 avg volume
SAP: 1,373,063.158 avg volume
CMTL: 528,263.158 avg volume
MNSO: 1,184,984.211 avg volume
CMI: 1,026,852.632 avg volume
SSL: 908,805.263 avg volume
PCAR: 3,115,994.737 avg volume
Progress: 40/96 (42%)
BIDU: 6,069,978.947 avg volume
SNES: 267,105.263 avg volume
IONX: 310,263.333 avg volume
QMMM: 1,414,273.684 avg volume
FUTU: 3,183,347.368 avg volume
RNAZ: 2,415,100 avg volume
LUCD: 816,957.895 avg volume
NYXH: 31,678.947 avg volume
HAIN: 2,272,936.842 avg volume
IPA: 4,914,926.316 avg volume
CRVO: 12,028,284.211 avg volume
MYNZ: 204,826.316 avg volume
BKYI: 369,310.526 avg volume
FN: 901,178.947 avg volume
DMN: 12,246,005.263 avg volume
PHAR: 7,910.526 avg volume
FFNW: 49,063.158 avg volume
INTW: 364,010.526 avg volume
ODC: 41,347.368 avg volume
NVO: 7,970,152.632 avg volume
Progress: 60/96 (63%)
TRNR: 38,744,005.263 avg volume
ZBIO: 138,042.105 avg volume
WLGS: 931,431.579 avg volume
BTMD: 265,952.632 avg volume
BHAT: 99,548,152.632 avg volume
AREB: 6,309,289.474 avg volume
CDLX: 1,536,705.263 avg volume
HEPA: 23,928,621.053 avg volume
BURU: 39,361,615.789 avg volume
ECOR: 222,021.053 avg volume
ADTX: 184,749,752.632 avg volume
AIEV: 1,822,210.526 avg volume
SPGC: 49,837,126.316 avg volume
BABA: 39,431,047.368 avg volume
CTMX: 3,718,384.211 avg volume
CLRB: 1,389,242.105 avg volume
HIT: 3,220,078.947 avg volume
HCTI: 11,468,752.632 avg volume
AEYE: 193,631.579 avg volume
UPB: 225,163.158 avg volume
Progress: 80/96 (83%)
IRBT: 3,226,531.579 avg volume
ONCO: 2,408,057.895 avg volume
SCNX: 2,964,089.474 avg volume
PBM: 456,521.053 avg volume
PSTV: 26,857,657.895 avg volume
PESI: 137,768.421 avg volume
MXCT: 732,700 avg volume
PALI: 713,084.211 avg volume
STI: 35,133,147.368 avg volume
PWM: 331,294.737 avg volume
ULY: 8,973,263.158 avg volume
HPH: 874,594.737 avg volume
SBSW: 9,028,036.842 avg volume
VSTE: 10,997,268.421 avg volume
SOUNW: 150,457 avg volume
SPHL: 2,016,615.789 avg volume
Progress: 96/96 (100%)
Fetched volume data for 96 tickers
Data fetching: 5.768s
Filter tickers: 0.665ms

Results:
- Total tickers: 96
- Tickers meeting criteria: 23
- Tickers filtered out: 73
Create filtered CSV: 2.02ms

Filtered tickers saved to filtered_list.csv
Generate report: 9.051ms
Detailed report saved to filtered_list_report.txt
Total execution time: 5.781s
✅ Process complete! Filtered gaps file available in Downloads.
```
