# Third-Party Notices

This project includes the following third-party dependencies:

## JSZip

- Package: `jszip`
- Version: `3.10.1`
- Source package: `https://registry.npmjs.org/jszip/-/jszip-3.10.1.tgz`
- Upstream project: `https://stuk.github.io/jszip/`
- License: `MIT`
- Bundled file: [vendor/jszip.min.js](./vendor/jszip.min.js)
- Bundled license text: [vendor/JSZIP-LICENSE.markdown](./vendor/JSZIP-LICENSE.markdown)

## PDF.js

- Package: `pdfjs-dist`
- Version: `3.11.174`
- Source package: `https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-3.11.174.tgz`
- Upstream project: `https://mozilla.github.io/pdf.js/`
- License: `Apache-2.0`
- Bundled files: [vendor/pdf.min.js](./vendor/pdf.min.js), [vendor/pdf.worker.min.js](./vendor/pdf.worker.min.js)
- Bundled license text: [vendor/PDFJS-LICENSE](./vendor/PDFJS-LICENSE)
- Note: the `legacy` UMD build is used so the library is available as `window.pdfjsLib` via a plain `<script>`-tag, uten byggesteg.
