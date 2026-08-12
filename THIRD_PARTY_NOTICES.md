# Third-Party Notices

This project includes the following third-party dependencies. They are managed
via npm (see `package.json`) rather than checked into git, and are copied into
`vendor/` at build time by `scripts/copy-vendor.mjs` (`npm run build`).

## JSZip

- Package: `jszip`
- Version: `3.10.1`
- Source package: `https://registry.npmjs.org/jszip/-/jszip-3.10.1.tgz`
- Upstream project: `https://stuk.github.io/jszip/`
- License: `MIT`
- Bundled file (generert av build-scriptet): `vendor/jszip.min.js`
- Bundled license text (generert av build-scriptet): `vendor/JSZIP-LICENSE.markdown`

## PDF.js

- Package: `pdfjs-dist`
- Version: `6.2.108`
- Source package: `https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.2.108.tgz`
- Upstream project: `https://mozilla.github.io/pdf.js/`
- License: `Apache-2.0`
- Bundled files (generert av build-scriptet): `vendor/pdf.min.mjs`, `vendor/pdf.worker.min.mjs`
- Bundled license text (generert av build-scriptet): `vendor/PDFJS-LICENSE`
- Note: fra pdf.js 4 og oppover finnes det ikke lenger et UMD-bygg som setter
  `window.pdfjsLib`. Biblioteket er kun ESM (`.mjs`), og lastes derfor med en
  dynamisk `import()` fra `pdf-loader.js` i stedet for en `<script>`-tag.
- Sikkerhet: versjon 3.11.174 (tidligere brukt) var dekket av GHSA-wgrm-67xf-hhpq
  (arbitrary JavaScript execution ved åpning av ondsinnet PDF). Oppgradering til
  >= 6.2.108 fikser dette og ligger utenfor rekkevidden til den nyere
  GHSA-hq66-cqwq-w95j (>= 5.6.83, < 6.2.108). `isEvalSupported: false` i
  `pdf-loader.js` er en tilleggsmitigering som beholdes uavhengig av versjon.
