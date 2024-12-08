# iwm-swim

While trying to debug why a Macintosh IIcx was randomly corrupting the first
track of a floppy when inserted, I thought it could be fun to watch what the
IWM was doing in the process. This hunk of bad JavaScript reads the CSV capture
exported from a logic analyzer and attempts to log the state changes detected.

**Usage:**

```
npm i
node decoder.js path-to-csv-export.txt | tee iwm-results.txt
```
