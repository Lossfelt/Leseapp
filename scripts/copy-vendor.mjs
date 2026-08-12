// Kopierer de nødvendige filene fra npm-avhengighetene til vendor/, slik at
// index.html kan laste dem med enkle <script>-tagger uten bundler.
// Kjøres på både Windows (lokal utvikling) og Linux (Netlify), derfor et
// Node-script framfor shell-kommandoer.
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const vendorDir = join(rootDir, "vendor");

const files = [
  {
    from: join(rootDir, "node_modules/pdfjs-dist/build/pdf.min.mjs"),
    to: join(vendorDir, "pdf.min.mjs"),
  },
  {
    from: join(rootDir, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
    to: join(vendorDir, "pdf.worker.min.mjs"),
  },
  {
    from: join(rootDir, "node_modules/pdfjs-dist/LICENSE"),
    to: join(vendorDir, "PDFJS-LICENSE"),
  },
  {
    from: join(rootDir, "node_modules/jszip/dist/jszip.min.js"),
    to: join(vendorDir, "jszip.min.js"),
  },
  {
    from: join(rootDir, "node_modules/jszip/LICENSE.markdown"),
    to: join(vendorDir, "JSZIP-LICENSE.markdown"),
  },
];

async function main() {
  await mkdir(vendorDir, { recursive: true });

  for (const { from, to } of files) {
    await copyFile(from, to);
    console.log(`Kopiert: ${from} -> ${to}`);
  }
}

main().catch((error) => {
  console.error("Kopiering av vendor-filer feilet:", error);
  process.exitCode = 1;
});
