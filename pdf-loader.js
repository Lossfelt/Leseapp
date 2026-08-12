(function () {
  const WORKER_SRC = "./vendor/pdf.worker.min.js";
  // Vertikalt sprang større enn linjehøyden ganger denne faktoren tolkes som nytt avsnitt.
  const PARAGRAPH_GAP_FACTOR = 1.6;

  async function loadFile(file) {
    assertDependencies();
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;

    const data = new Uint8Array(await file.arrayBuffer());
    // Deaktiverer eval for å forhindre JavaScript-kjøring fra ondsinnet PDF (GHSA-wgrm-67xf-hhpq).
    const loadingTask = window.pdfjsLib.getDocument({ data, isEvalSupported: false });
    const pdf = await loadingTask.promise;

    const pageTexts = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = buildPageText(textContent.items);

      if (pageText) {
        pageTexts.push(pageText);
      }

      page.cleanup();
    }

    const title = await extractTitle(pdf);
    const combinedText = pageTexts.join("\n\n");
    const model = window.LeseappReadingModel.createModelFromText(combinedText);

    if (!model.words.length) {
      throw new Error(
        "Fant ingen lesbar tekst i PDF-filen. Skannede PDF-er uten tekstlag støttes ikke.",
      );
    }

    return {
      format: "pdf",
      metadata: { title },
      model,
    };
  }

  function buildPageText(items) {
    let text = "";
    let lastY = null;
    let lastHeight = 10;

    items.forEach((item) => {
      const value = item.str ?? "";
      const y = item.transform?.[5] ?? 0;
      const height = item.height || Math.abs(item.transform?.[3] ?? 0) || lastHeight;

      if (lastY !== null) {
        const verticalGap = lastY - y;

        if (verticalGap > height * PARAGRAPH_GAP_FACTOR) {
          text += "\n\n";
        } else if (text && !text.endsWith(" ") && !value.startsWith(" ")) {
          text += " ";
        }
      }

      text += value;
      lastY = y;

      if (height) {
        lastHeight = height;
      }
    });

    return text.trim();
  }

  async function extractTitle(pdf) {
    try {
      const { info } = await pdf.getMetadata();
      return window.LeseappReadingModel.normalizeWhitespace(info?.Title ?? "");
    } catch {
      return "";
    }
  }

  function assertDependencies() {
    if (!window.pdfjsLib) {
      throw new Error("pdf.js er ikke lastet. PDF-støtte er derfor utilgjengelig.");
    }

    if (!window.LeseappReadingModel) {
      throw new Error("Lesemodellen er ikke lastet.");
    }
  }

  window.LeseappPdf = {
    loadFile,
  };
})();
