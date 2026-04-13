(function () {
  function createModelFromText(text) {
    const paragraphTexts = text
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n+/)
      .map(normalizeWhitespace)
      .filter(Boolean);

    return createModelFromParagraphs(paragraphTexts);
  }

  function createModelFromParagraphs(paragraphTexts) {
    const paragraphs = [];
    const words = [];

    paragraphTexts.forEach((paragraphText, paragraphIndex) => {
      const tokens = paragraphText.split(/\s+/).filter(Boolean);
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
        text: paragraphText,
        tokens,
        startIndex,
        endIndex: words.length - 1,
      });
    });

    return { paragraphs, words };
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
