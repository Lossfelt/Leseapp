(function () {
  const SECTION_PATTERNS = [
    /^(kapittel|chapter)\s+([0-9]+|[ivxlcdm]+)\b.*$/i,
    /^(del|part)\s+([0-9]+|[ivxlcdm]+)\b.*$/i,
    /^(prolog|prologue|epilog|epilogue)\b.*$/i,
  ];

  function createModelFromText(text) {
    const paragraphEntries = text
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n+/)
      .map((paragraph) => ({ text: normalizeWhitespace(paragraph) }))
      .filter((entry) => entry.text);

    return createModelFromParagraphs(paragraphEntries, { detectSections: true });
  }

  function createModelFromParagraphs(paragraphEntries, options = {}) {
    const entries = normalizeEntries(paragraphEntries);
    const paragraphs = [];
    const words = [];

    entries.forEach((entry, paragraphIndex) => {
      const tokens = entry.text.split(/\s+/).filter(Boolean);
      const startIndex = words.length;

      tokens.forEach((token, tokenIndex) => {
        words.push({
          raw: token,
          paragraphIndex,
          indexInParagraph: tokenIndex,
          isParagraphEnd: tokenIndex === tokens.length - 1,
        });
      });

      paragraphs.push({
        index: paragraphIndex,
        text: entry.text,
        tokens,
        startIndex,
        endIndex: words.length - 1,
      });
    });

    const sections = buildSections(entries, paragraphs, options);
    return { paragraphs, sections, words };
  }

  function normalizeEntries(entries) {
    return entries
      .map((entry) => {
        if (typeof entry === "string") {
          return { text: normalizeWhitespace(entry) };
        }

        return {
          ...entry,
          sectionLabel: normalizeWhitespace(entry.sectionLabel ?? ""),
          text: normalizeWhitespace(entry.text ?? ""),
        };
      })
      .filter((entry) => entry.text);
  }

  function buildSections(entries, paragraphs, options) {
    const sectionMap = new Map();

    entries.forEach((entry, paragraphIndex) => {
      if (!entry.sectionLabel) {
        return;
      }

      addSection(sectionMap, paragraphs, paragraphIndex, entry.sectionLabel);
    });

    if (options.detectSections !== false) {
      entries.forEach((entry, paragraphIndex) => {
        if (isLikelySectionHeading(entry.text)) {
          addSection(sectionMap, paragraphs, paragraphIndex, entry.text);
        }
      });
    }

    if (!sectionMap.size && paragraphs[0]?.tokens.length) {
      addSection(sectionMap, paragraphs, 0, "Start");
    }

    return Array.from(sectionMap.values()).sort((a, b) => a.wordIndex - b.wordIndex);
  }

  function addSection(sectionMap, paragraphs, paragraphIndex, label) {
    const paragraph = paragraphs[paragraphIndex];

    if (!paragraph || !paragraph.tokens.length) {
      return;
    }

    if (!sectionMap.has(paragraphIndex)) {
      sectionMap.set(paragraphIndex, {
        label,
        paragraphIndex,
        wordIndex: paragraph.startIndex,
      });
    }
  }

  function isLikelySectionHeading(text) {
    return SECTION_PATTERNS.some((pattern) => pattern.test(text));
  }

  function normalizeWhitespace(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  window.LeseappReadingModel = {
    createModelFromParagraphs,
    createModelFromText,
    normalizeWhitespace,
  };
})();
