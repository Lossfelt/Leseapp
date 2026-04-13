(function () {
  const CONTAINER_PATH = "META-INF/container.xml";
  const BLOCK_TAGS = new Set([
    "address",
    "article",
    "aside",
    "blockquote",
    "dd",
    "div",
    "dl",
    "dt",
    "figcaption",
    "figure",
    "footer",
    "header",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "pre",
    "section",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "ul",
  ]);
  const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
  const SKIP_TAGS = new Set(["audio", "img", "math", "noscript", "script", "style", "svg", "video"]);
  const XHTML_TYPES = new Set([
    "application/xhtml+xml",
    "application/xml",
    "text/html",
    "application/html+xml",
  ]);

  async function loadFile(file) {
    assertDependencies();

    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const packagePath = await getPackagePath(zip);
    const packageMarkup = await readZipText(zip, packagePath);
    const packageDoc = parseXml(packageMarkup, "application/xml");
    const metadata = extractMetadata(packageDoc);
    const manifest = buildManifest(packageDoc, packagePath);
    const spinePaths = buildSpinePaths(packageDoc, manifest);
    const paragraphEntries = [];

    for (const path of spinePaths) {
      const contentMarkup = await readZipText(zip, path);
      paragraphEntries.push(...extractParagraphEntries(contentMarkup));
    }

    const model = window.LeseappReadingModel.createModelFromParagraphs(paragraphEntries, {
      detectSections: false,
    });

    if (!model.words.length) {
      throw new Error("Fant ingen lesbar tekst i EPUB-filen.");
    }

    return {
      format: "epub",
      metadata,
      model,
    };
  }

  async function getPackagePath(zip) {
    const containerMarkup = await readZipText(zip, CONTAINER_PATH);
    const containerDoc = parseXml(containerMarkup, "application/xml");
    const rootfile = containerDoc.querySelector("rootfile");
    const packagePath = rootfile?.getAttribute("full-path");

    if (!packagePath) {
      throw new Error("Fant ikke package-dokumentet i EPUB-filen.");
    }

    return packagePath;
  }

  function buildManifest(packageDoc, packagePath) {
    const items = new Map();

    packageDoc.querySelectorAll("manifest > item").forEach((item) => {
      const id = item.getAttribute("id");
      const href = item.getAttribute("href");

      if (!id || !href) {
        return;
      }

      items.set(id, {
        href: resolvePath(packagePath, href),
        mediaType: item.getAttribute("media-type") ?? "",
        properties: item.getAttribute("properties") ?? "",
      });
    });

    return items;
  }

  function buildSpinePaths(packageDoc, manifest) {
    const paths = [];

    packageDoc.querySelectorAll("spine > itemref").forEach((itemref) => {
      const idref = itemref.getAttribute("idref");
      const manifestItem = manifest.get(idref);

      if (!manifestItem || manifestItem.properties.includes("nav")) {
        return;
      }

      if (isReadingMarkup(manifestItem.href, manifestItem.mediaType)) {
        paths.push(manifestItem.href);
      }
    });

    if (!paths.length) {
      throw new Error("Fant ingen lesbare kapitler i EPUB-filen.");
    }

    return paths;
  }

  function extractMetadata(packageDoc) {
    return {
      title: firstTextByLocalName(packageDoc, "title"),
    };
  }

  function extractParagraphEntries(markup) {
    const doc = parseMarkupDocument(markup);
    const body = doc.querySelector("body") ?? doc.documentElement;
    const entries = [];
    collectEntries(body, entries);
    return entries;
  }

  function collectEntries(node, entries) {
    for (const child of node.childNodes) {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const tag = child.localName?.toLowerCase() ?? "";

      if (SKIP_TAGS.has(tag)) {
        continue;
      }

      if (HEADING_TAGS.has(tag)) {
        pushEntry(entries, {
          sectionLabel: child.textContent ?? "",
          text: child.textContent ?? "",
        });
        continue;
      }

      if (BLOCK_TAGS.has(tag)) {
        const text = extractTextFromNode(child);

        if (text) {
          pushEntry(entries, { text });
        } else {
          collectEntries(child, entries);
        }

        continue;
      }

      collectEntries(child, entries);
    }
  }

  function pushEntry(entries, entry) {
    const text = window.LeseappReadingModel.normalizeWhitespace(entry.text ?? "");

    if (!text) {
      return;
    }

    entries.push({
      sectionLabel: window.LeseappReadingModel.normalizeWhitespace(entry.sectionLabel ?? ""),
      text,
    });
  }

  function extractTextFromNode(node) {
    const clone = node.cloneNode(true);

    clone.querySelectorAll("br").forEach((br) => {
      br.replaceWith(" ");
    });

    return clone.textContent ?? "";
  }

  function parseMarkupDocument(markup) {
    const xmlDoc = parseXml(markup, "application/xhtml+xml");

    if (!xmlDoc.querySelector("parsererror")) {
      return xmlDoc;
    }

    return parseXml(markup, "text/html");
  }

  function parseXml(markup, mimeType) {
    return new DOMParser().parseFromString(markup, mimeType);
  }

  function firstTextByLocalName(doc, localName) {
    const node = Array.from(doc.getElementsByTagNameNS("*", localName))[0];
    return window.LeseappReadingModel.normalizeWhitespace(node?.textContent ?? "");
  }

  async function readZipText(zip, path) {
    const entry = zip.file(path);

    if (!entry) {
      throw new Error(`Mangler forventet fil i EPUB: ${path}`);
    }

    return entry.async("text");
  }

  function resolvePath(basePath, relativePath) {
    const baseDir = basePath.includes("/") ? basePath.slice(0, basePath.lastIndexOf("/") + 1) : "";
    return new URL(relativePath, `https://epub.local/${baseDir}`).pathname.slice(1);
  }

  function isReadingMarkup(path, mediaType) {
    if (XHTML_TYPES.has(mediaType)) {
      return true;
    }

    return /\.(xhtml|html|htm|xml)$/i.test(path);
  }

  function assertDependencies() {
    if (!window.JSZip) {
      throw new Error("JSZip er ikke lastet. EPUB-støtte er derfor utilgjengelig.");
    }

    if (!window.LeseappReadingModel) {
      throw new Error("Lesemodellen er ikke lastet.");
    }
  }

  window.LeseappEpub = {
    loadFile,
  };
})();
