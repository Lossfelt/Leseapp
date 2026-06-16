(function () {
  const DOCUMENT_PATH = "word/document.xml";
  const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const HEADING_STYLE_PATTERN = /^(heading|tittel|title|overskrift)/i;

  async function loadFile(file) {
    assertDependencies();

    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const documentMarkup = await readDocumentMarkup(zip);
    const doc = parseXml(documentMarkup);

    if (doc.querySelector("parsererror")) {
      throw new Error("Klarte ikke å lese innholdet i DOCX-filen.");
    }

    const paragraphEntries = extractParagraphEntries(doc);

    const model = window.LeseappReadingModel.createModelFromParagraphs(paragraphEntries, {
      detectSections: true,
    });

    if (!model.words.length) {
      throw new Error("Fant ingen lesbar tekst i DOCX-filen.");
    }

    return {
      format: "docx",
      metadata: {},
      model,
    };
  }

  async function readDocumentMarkup(zip) {
    const entry = zip.file(DOCUMENT_PATH);

    if (!entry) {
      throw new Error("Fant ikke hoveddokumentet i DOCX-filen.");
    }

    return entry.async("text");
  }

  function extractParagraphEntries(doc) {
    const entries = [];
    const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, "p"));

    paragraphs.forEach((paragraph) => {
      const text = extractParagraphText(paragraph);

      if (!text) {
        return;
      }

      const entry = { text };

      if (isHeadingParagraph(paragraph)) {
        entry.sectionLabel = text;
      }

      entries.push(entry);
    });

    return entries;
  }

  function extractParagraphText(paragraph) {
    let text = "";

    walkRunContent(paragraph, (node) => {
      const localName = node.localName?.toLowerCase() ?? "";

      if (localName === "t") {
        text += node.textContent ?? "";
        return;
      }

      if (localName === "tab" || localName === "br" || localName === "cr") {
        text += " ";
      }
    });

    return window.LeseappReadingModel.normalizeWhitespace(text);
  }

  function walkRunContent(node, visit) {
    for (const child of node.childNodes) {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      visit(child);
      walkRunContent(child, visit);
    }
  }

  function isHeadingParagraph(paragraph) {
    const styles = paragraph.getElementsByTagNameNS(W_NS, "pStyle");

    for (const style of styles) {
      const value = style.getAttributeNS(W_NS, "val") ?? style.getAttribute("w:val") ?? "";

      if (HEADING_STYLE_PATTERN.test(value)) {
        return true;
      }
    }

    return false;
  }

  function parseXml(markup) {
    return new DOMParser().parseFromString(markup, "application/xml");
  }

  function assertDependencies() {
    if (!window.JSZip) {
      throw new Error("JSZip er ikke lastet. DOCX-støtte er derfor utilgjengelig.");
    }

    if (!window.LeseappReadingModel) {
      throw new Error("Lesemodellen er ikke lastet.");
    }
  }

  window.LeseappDocx = {
    loadFile,
  };
})();
