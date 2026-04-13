const STORAGE_PREFIX = "leseapp-progress-v1";
const DEFAULT_WPM = 320;
const STARTUP_PREVIEW_MS = 1000;
const HOLD_THRESHOLD_MS = 180;
const DEFAULT_LONG_WORD_BONUS_ENABLED = true;
const LONG_WORD_BONUS_MULTIPLIER = 0.18;
const VERY_LONG_WORD_BONUS_MULTIPLIER = 0.24;
const SENTENCE_END_BONUS_MULTIPLIER = 0.72;
const PARAGRAPH_END_BONUS_MULTIPLIER = 1.35;

const state = {
  currentIndex: 0,
  errorMessage: "",
  fileKey: "",
  fileLabel: "",
  ignoreNextButtonClick: false,
  isLoading: false,
  isPlaying: false,
  isPreviewing: false,
  longWordBonusEnabled: DEFAULT_LONG_WORD_BONUS_ENABLED,
  paragraphs: [],
  pointerHoldActive: false,
  pointerHoldTimer: null,
  pointerId: null,
  progressOriginLabel: "",
  reachedEnd: false,
  spaceDown: false,
  spaceHoldActive: false,
  spaceHoldTimer: null,
  timerId: null,
  words: [],
  wpm: DEFAULT_WPM,
};

const elements = {
  contextBody: document.querySelector("#contextBody"),
  contextHint: document.querySelector("#contextHint"),
  contextPanel: document.querySelector("#contextPanel"),
  fileInput: document.querySelector("#fileInput"),
  fileMeta: document.querySelector("#fileMeta"),
  longWordToggle: document.querySelector("#longWordToggle"),
  playButton: document.querySelector("#playButton"),
  progressText: document.querySelector("#progressText"),
  speedSlider: document.querySelector("#speedSlider"),
  speedValue: document.querySelector("#speedValue"),
  statusText: document.querySelector("#statusText"),
  wordDisplay: document.querySelector("#wordDisplay"),
};

function init() {
  elements.speedSlider.value = String(DEFAULT_WPM);
  elements.speedValue.textContent = `${DEFAULT_WPM} WPM`;
  elements.longWordToggle.checked = DEFAULT_LONG_WORD_BONUS_ENABLED;

  elements.fileInput.addEventListener("change", handleFileSelection);
  elements.longWordToggle.addEventListener("change", handleLongWordToggleChange);
  elements.playButton.addEventListener("click", handlePlayButtonClick);
  elements.playButton.addEventListener("pointercancel", handlePlayButtonPointerUp);
  elements.playButton.addEventListener("pointerdown", handlePlayButtonPointerDown);
  elements.playButton.addEventListener("pointerleave", handlePlayButtonPointerLeave);
  elements.playButton.addEventListener("pointerup", handlePlayButtonPointerUp);
  elements.speedSlider.addEventListener("input", handleSpeedChange);

  document.addEventListener("keydown", handleSpaceKeyDown);
  document.addEventListener("keyup", handleSpaceKeyUp);

  render();
}

async function handleFileSelection(event) {
  const [file] = event.target.files ?? [];

  if (!file) {
    return;
  }

  pausePlayback({ showContext: false });
  resetDocument();
  state.isLoading = true;
  setStatus("Laster fil...", "loading");
  render();

  try {
    const result = await loadDocumentFile(file);
    applyLoadedDocument(file, result);
  } catch (error) {
    resetDocument();
    state.errorMessage = formatErrorMessage(error);
    elements.fileMeta.textContent = `${file.name} kunne ikke åpnes.`;
  } finally {
    state.isLoading = false;
    render();
  }
}

async function loadDocumentFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (extension === "epub") {
    const result = await window.LeseappEpub.loadFile(file);
    return {
      ...result,
      originLabel: result.metadata.title || file.name,
    };
  }

  const text = await file.text();
  return {
    format: "txt",
    metadata: {},
    model: window.LeseappReadingModel.createModelFromText(text),
    originLabel: file.name,
  };
}

function applyLoadedDocument(file, result) {
  const { model } = result;
  const saved = loadProgress(makeFileKey(file));

  state.currentIndex = clampIndex(saved?.currentIndex ?? 0, model.words.length);
  state.errorMessage = "";
  state.fileKey = makeFileKey(file);
  state.fileLabel = file.name;
  state.longWordBonusEnabled =
    saved?.longWordBonusEnabled ?? DEFAULT_LONG_WORD_BONUS_ENABLED;
  state.paragraphs = model.paragraphs;
  state.progressOriginLabel = result.originLabel;
  state.reachedEnd = false;
  state.words = model.words;
  state.wpm = clampWpm(saved?.wpm ?? DEFAULT_WPM);

  elements.longWordToggle.checked = state.longWordBonusEnabled;
  elements.playButton.disabled = !state.words.length;
  elements.speedSlider.value = String(state.wpm);
  elements.speedValue.textContent = `${state.wpm} WPM`;

  if (!state.words.length) {
    elements.fileMeta.textContent = `${file.name} inneholder ingen lesbar tekst.`;
    state.errorMessage = "Fant ingen ord å vise fra filen.";
    render();
    return;
  }

  const fileKind = result.format.toUpperCase();
  const savedNote = saved ? "Fortsetter fra sist lagrede posisjon." : "Starter fra begynnelsen.";
  elements.fileMeta.textContent =
    `${state.progressOriginLabel} · ${fileKind} · ${state.words.length} ord · ` +
    `${state.paragraphs.length} avsnitt · ${savedNote}`;

  saveProgress();
  render();
}

function handleSpeedChange(event) {
  state.wpm = clampWpm(Number(event.target.value));
  elements.speedValue.textContent = `${state.wpm} WPM`;
  saveProgress();
  renderStatus();
}

function handleLongWordToggleChange(event) {
  state.longWordBonusEnabled = event.target.checked;
  saveProgress();
}

function handlePlayButtonClick() {
  if (state.ignoreNextButtonClick) {
    state.ignoreNextButtonClick = false;
    return;
  }

  if (state.pointerHoldActive) {
    return;
  }

  togglePlayback();
}

function handlePlayButtonPointerDown(event) {
  if (event.button !== 0 || !hasLoadedText()) {
    return;
  }

  state.pointerId = event.pointerId;
  state.pointerHoldActive = false;
  elements.playButton.setPointerCapture(event.pointerId);

  clearTimeout(state.pointerHoldTimer);
  state.pointerHoldTimer = window.setTimeout(() => {
    if (state.pointerId === event.pointerId && !state.isPlaying) {
      state.pointerHoldActive = true;
      startPlayback();
      updateHeldVisualState();
    }
  }, HOLD_THRESHOLD_MS);
}

function handlePlayButtonPointerUp(event) {
  if (state.pointerId !== event.pointerId) {
    return;
  }

  clearPointerHoldTimer();

  if (elements.playButton.hasPointerCapture(event.pointerId)) {
    elements.playButton.releasePointerCapture(event.pointerId);
  }

  state.pointerId = null;

  if (state.pointerHoldActive) {
    state.ignoreNextButtonClick = true;
    state.pointerHoldActive = false;
    pausePlayback({ showContext: true });
  }

  updateHeldVisualState();
}

function handlePlayButtonPointerLeave(event) {
  if (state.pointerId === event.pointerId && state.pointerHoldActive) {
    handlePlayButtonPointerUp(event);
  }
}

function handleSpaceKeyDown(event) {
  if (event.code !== "Space") {
    return;
  }

  event.preventDefault();

  if (state.spaceDown) {
    return;
  }

  state.spaceDown = true;
  state.spaceHoldActive = false;

  clearTimeout(state.spaceHoldTimer);
  state.spaceHoldTimer = window.setTimeout(() => {
    if (state.spaceDown && !state.isPlaying && hasLoadedText()) {
      state.spaceHoldActive = true;
      startPlayback();
      updateHeldVisualState();
    }
  }, HOLD_THRESHOLD_MS);
}

function handleSpaceKeyUp(event) {
  if (event.code !== "Space") {
    return;
  }

  event.preventDefault();
  state.spaceDown = false;

  const usedHoldMode = state.spaceHoldActive;
  clearSpaceHoldTimer();
  state.spaceHoldActive = false;

  if (usedHoldMode) {
    pausePlayback({ showContext: true });
    updateHeldVisualState();
    return;
  }

  togglePlayback();
}

function togglePlayback() {
  if (!hasLoadedText()) {
    return;
  }

  if (state.isPlaying) {
    pausePlayback({ showContext: true });
    return;
  }

  startPlayback();
}

function startPlayback() {
  if (!hasLoadedText()) {
    return;
  }

  if (state.reachedEnd) {
    state.currentIndex = 0;
    state.reachedEnd = false;
  }

  clearPlaybackTimer();
  state.errorMessage = "";
  state.isPlaying = true;
  state.isPreviewing = true;
  render();

  state.timerId = window.setTimeout(() => {
    if (!state.isPlaying) {
      return;
    }

    state.isPreviewing = false;
    advanceWord();
  }, STARTUP_PREVIEW_MS);
}

function pausePlayback({ showContext = true } = {}) {
  clearPlaybackTimer();
  state.isPlaying = false;
  state.isPreviewing = false;

  if (showContext) {
    renderContext();
  }

  renderStatus();
  saveProgress();
}

function advanceWord() {
  if (!state.isPlaying) {
    return;
  }

  if (state.currentIndex >= state.words.length - 1) {
    state.reachedEnd = true;
    pausePlayback({ showContext: true });
    setStatus("Slutt på teksten. Start på nytt for å lese fra begynnelsen.", "normal");
    return;
  }

  state.currentIndex += 1;
  saveProgress();
  render();

  state.timerId = window.setTimeout(advanceWord, getWordDelay(state.words[state.currentIndex]));
}

function getWordDelay(word) {
  const baseDelay = 60000 / state.wpm;
  let extraDelay = 0;

  if (state.longWordBonusEnabled) {
    if (word.raw.length >= 9) {
      extraDelay += scaledPause(baseDelay, LONG_WORD_BONUS_MULTIPLIER, 18, 85);
    }

    if (word.raw.length >= 13) {
      extraDelay += scaledPause(baseDelay, VERY_LONG_WORD_BONUS_MULTIPLIER, 24, 120);
    }
  }

  if (/[.!?][)"'\]]*$/.test(word.raw)) {
    extraDelay += scaledPause(baseDelay, SENTENCE_END_BONUS_MULTIPLIER, 36, 220);
  }

  if (word.isParagraphEnd) {
    extraDelay += scaledPause(baseDelay, PARAGRAPH_END_BONUS_MULTIPLIER, 70, 340);
  }

  return Math.round(baseDelay + extraDelay);
}

function scaledPause(baseDelay, multiplier, min, max) {
  return Math.max(min, Math.min(max, baseDelay * multiplier));
}

function resetDocument() {
  clearPlaybackTimer();
  state.currentIndex = 0;
  state.errorMessage = "";
  state.fileKey = "";
  state.fileLabel = "";
  state.isPlaying = false;
  state.isPreviewing = false;
  state.paragraphs = [];
  state.progressOriginLabel = "";
  state.reachedEnd = false;
  state.words = [];
  elements.playButton.disabled = true;
}

function makeFileKey(file) {
  return `${STORAGE_PREFIX}:${file.name}:${file.size}:${file.lastModified}`;
}

function loadProgress(fileKey) {
  try {
    const raw = localStorage.getItem(fileKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProgress() {
  if (!state.fileKey || !hasLoadedText()) {
    return;
  }

  try {
    localStorage.setItem(
      state.fileKey,
      JSON.stringify({
        currentIndex: state.currentIndex,
        longWordBonusEnabled: state.longWordBonusEnabled,
        updatedAt: Date.now(),
        wpm: state.wpm,
      }),
    );
  } catch {
    // Ignore storage errors in the prototype.
  }
}

function clampIndex(index, wordCount) {
  if (!Number.isFinite(index) || wordCount === 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, wordCount - 1));
}

function clampWpm(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_WPM;
  }

  return Math.max(120, Math.min(900, Math.round(value)));
}

function hasLoadedText() {
  return state.words.length > 0;
}

function clearPlaybackTimer() {
  clearTimeout(state.timerId);
  state.timerId = null;
}

function clearPointerHoldTimer() {
  clearTimeout(state.pointerHoldTimer);
  state.pointerHoldTimer = null;
}

function clearSpaceHoldTimer() {
  clearTimeout(state.spaceHoldTimer);
  state.spaceHoldTimer = null;
}

function render() {
  renderStatus();
  renderWord();
  renderProgress();
  renderContext();
  updateHeldVisualState();
}

function renderStatus() {
  if (state.errorMessage) {
    setStatus(state.errorMessage, "error");
    return;
  }

  if (state.isLoading) {
    setStatus("Laster fil...", "loading");
    return;
  }

  if (!hasLoadedText()) {
    setStatus("Last inn en tekst eller EPUB for å starte.", "normal");
    return;
  }

  if (state.isPlaying) {
    setStatus(
      state.isPreviewing
        ? "Fester blikket i 1 sekund før lesing starter."
        : "Leser. Slipp for å pause og se kontekst.",
      "normal",
    );
    return;
  }

  if (state.reachedEnd) {
    setStatus("Teksten er ferdig lest.", "normal");
    return;
  }

  setStatus("Pauset. Kontekst vises under.", "normal");
}

function setStatus(message, tone) {
  elements.statusText.textContent = message;
  elements.statusText.classList.toggle("is-error", tone === "error");
  elements.statusText.classList.toggle("is-loading", tone === "loading");
}

function renderWord() {
  elements.wordDisplay.textContent = hasLoadedText() ? state.words[state.currentIndex].raw : "Klar";
}

function renderProgress() {
  if (!hasLoadedText()) {
    elements.progressText.textContent = "0 / 0 ord";
    return;
  }

  const current = state.currentIndex + 1;
  const total = state.words.length;
  elements.progressText.textContent =
    `${current} / ${total} ord · ${Math.round((current / total) * 100)}%`;
}

function renderContext() {
  elements.contextBody.textContent = "";

  if (!hasLoadedText()) {
    elements.contextPanel.classList.add("is-empty");
    elements.contextHint.textContent =
      "Panelet fylles når du åpner en tekst eller EPUB og pauser lesingen.";
    return;
  }

  const word = state.words[state.currentIndex];
  const paragraph = state.paragraphs[word.paragraphIndex];
  elements.contextPanel.classList.remove("is-empty");
  elements.contextHint.textContent = `${state.progressOriginLabel} · ord ${state.currentIndex + 1}`;

  paragraph.tokens.forEach((token, tokenIndex) => {
    const span = document.createElement("span");
    span.className = "context-word";
    span.textContent = token;

    if (paragraph.startIndex + tokenIndex === state.currentIndex) {
      span.classList.add("is-current");
    }

    elements.contextBody.append(span);

    if (tokenIndex < paragraph.tokens.length - 1) {
      elements.contextBody.append(document.createTextNode(" "));
    }
  });
}

function updateHeldVisualState() {
  elements.playButton.classList.toggle(
    "is-held",
    state.pointerHoldActive || state.spaceHoldActive,
  );
}

function formatErrorMessage(error) {
  return error instanceof Error ? error.message : "Ukjent feil ved åpning av filen.";
}

init();
