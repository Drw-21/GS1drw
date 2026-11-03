# Shelf Life Scanner · by Lumetis Pharma

Scan a pack and see how much shelf life it has left. Reads GS1 DataMatrix, GS1-128, EAN/UPC and QR codes (expiry, batch, serial, manufacture date), or lets you type the dates, then checks them against your receiving rules.

- Landing page (about, GS1 DataMatrix, shelf life, FAQ, disclaimer, privacy): https://drw-21.github.io/gs1drw/
- Scanner: https://drw-21.github.io/gs1drw/app/

## Files
- `index.html`: landing page
- `app/index.html`: the scanner
- `gs1.js`: shared GS1 parsing (used by both)
- `products.csv`: shared product name list (GTIN, Description, Pack, Item code)
- `manifest.webmanifest`, `icons/`: home-screen app icon

Everything stays in the browser on the device. Nothing is uploaded.

© Lumetis Pharma
