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
  fileName: "",
  fileKey: "",
  words: [],
  paragraphs: [],
  currentIndex: 0,
  wpm: DEFAULT_WPM,
  longWordBonusEnabled: DEFAULT_LONG_WORD_BONUS_ENABLED,
  isPlaying: false,
  isPreviewing: false,
  reachedEnd: false,
  timerId: null,
  holdSource: null,
  pointerHoldTimer: null,
  pointerHoldActive: false,
  ignoreNextButtonClick: false,
  pointerId: null,
  spaceHoldTimer: null,
  spaceHoldActive: false,
  spaceDown: false,
};

const elements = {
  fileInput: document.querySelector("#fileInput"),
  fileMeta: document.querySelector("#fileMeta"),
  speedSlider: document.querySelector("#speedSlider"),
  speedValue: document.querySelector("#speedValue"),
  longWordToggle: document.querySelector("#longWordToggle"),
  statusText: document.querySelector("#statusText"),
  progressText: document.querySelector("#progressText"),
  wordDisplay: document.querySelector("#wordDisplay"),
  playButton: document.querySelector("#playButton"),
  contextPanel: document.querySelector("#contextPanel"),
  contextHint: document.querySelector("#contextHint"),
  contextBody: document.querySelector("#contextBody"),
};

function init() {
  elements.speedSlider.value = String(DEFAULT_WPM);
  elements.speedValue.textContent = `${DEFAULT_WPM} WPM`;
  elements.longWordToggle.checked = DEFAULT_LONG_WORD_BONUS_ENABLED;

  elements.fileInput.addEventListener("change", handleFileSelection);
  elements.speedSlider.addEventListener("input", handleSpeedChange);
  elements.longWordToggle.addEventListener("change", handleLongWordToggleChange);
  elements.playButton.addEventListener("click", handlePlayButtonClick);
  elements.playButton.addEventListener("pointerdown", handlePlayButtonPointerDown);
  elements.playButton.addEventListener("pointerup", handlePlayButtonPointerUp);
  elements.playButton.addEventListener("pointercancel", handlePlayButtonPointerUp);
  elements.playButton.addEventListener("pointerleave", handlePlayButtonPointerLeave);

  document.addEventListener("keydown", handleSpaceKeyDown);
  document.addEventListener("keyup", handleSpaceKeyUp);

  render();
}

async function handleFileSelection(event) {
  const [file] = event.target.files ?? [];

  if (!file) {
    return;
  }

  pausePlayback({ showContext: false, preserveHoldStyles: false });

  const text = await file.text();
  const model = parseTextFile(text);

  state.fileName = file.name;
  state.fileKey = makeFileKey(file);
  state.words = model.words;
  state.paragraphs = model.paragraphs;
  state.reachedEnd = false;
  state.isPreviewing = false;

  const saved = loadProgress(state.fileKey);
  state.currentIndex = clampIndex(saved?.currentIndex ?? 0);
  state.wpm = clampWpm(saved?.wpm ?? DEFAULT_WPM);
  state.longWordBonusEnabled =
    saved?.longWordBonusEnabled ?? DEFAULT_LONG_WORD_BONUS_ENABLED;

  elements.speedSlider.value = String(state.wpm);
  elements.speedValue.textContent = `${state.wpm} WPM`;
  elements.longWordToggle.checked = state.longWordBonusEnabled;
  elements.playButton.disabled = state.words.length === 0;

  if (state.words.length === 0) {
    elements.fileMeta.textContent = `${file.name} inneholder ingen ord som kan leses.`;
    elements.statusText.textContent = "Teksten ser ut til å være tom.";
    elements.wordDisplay.textContent = "Tom tekst";
    renderContext();
    return;
  }

  const savedNote = saved ? "Fortsetter fra sist lagrede posisjon." : "Starter fra begynnelsen.";
  elements.fileMeta.textContent = `${file.name} · ${state.words.length} ord · ${state.paragraphs.length} avsnitt · ${savedNote}`;
  elements.statusText.textContent = "Klar til lesing.";
  elements.wordDisplay.textContent = state.words[state.currentIndex].raw;

  saveProgress();
  render();
}

function handleSpeedChange(event) {
  state.wpm = clampWpm(Number(event.target.value));
  elements.speedValue.textContent = `${state.wpm} WPM`;

  if (state.fileKey) {
    saveProgress();
  }

  renderStatus();
}

function handleLongWordToggleChange(event) {
  state.longWordBonusEnabled = event.target.checked;

  if (state.fileKey) {
    saveProgress();
  }
}

function handlePlayButtonClick() {
  if (state.ignoreNextButtonClick) {
    state.ignoreNextButtonClick = false;
    return;
  }

  togglePlayback("button");
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
      state.ignoreNextButtonClick = true;
      startPlayback("pointer-hold");
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
      startPlayback("space-hold");
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

  togglePlayback("space");
}

function togglePlayback(source) {
  if (!hasLoadedText()) {
    return;
  }

  if (state.isPlaying) {
    pausePlayback({ showContext: true });
    return;
  }

  startPlayback(source);
}

function startPlayback(source) {
  if (!hasLoadedText()) {
    return;
  }

  if (state.reachedEnd) {
    state.currentIndex = 0;
    state.reachedEnd = false;
  }

  clearPlaybackTimer();
  state.isPlaying = true;
  state.isPreviewing = true;
  state.holdSource = source === "pointer-hold" || source === "space-hold" ? source : null;

  render();

  state.timerId = window.setTimeout(() => {
    if (!state.isPlaying) {
      return;
    }

    state.isPreviewing = false;
    advanceWord();
  }, STARTUP_PREVIEW_MS);
}

function pausePlayback({ showContext = true, preserveHoldStyles = false } = {}) {
  clearPlaybackTimer();
  state.isPlaying = false;
  state.isPreviewing = false;
  state.holdSource = null;

  if (!preserveHoldStyles) {
    state.pointerHoldActive = false;
    state.spaceHoldActive = false;
    updateHeldVisualState();
  }

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
    renderStatus("Slutt på teksten. Start på nytt for å lese fra begynnelsen.");
    return;
  }

  state.currentIndex += 1;
  saveProgress();
  render();

  const delay = getWordDelay(state.words[state.currentIndex]);
  state.timerId = window.setTimeout(() => {
    advanceWord();
  }, delay);
}

function getWordDelay(word) {
  const baseDelay = 60000 / state.wpm;
  let extraDelay = 0;
  const token = word.raw;

  if (state.longWordBonusEnabled) {
    if (token.length >= 9) {
      extraDelay += scaledPause(baseDelay, LONG_WORD_BONUS_MULTIPLIER, 18, 85);
    }

    if (token.length >= 13) {
      extraDelay += scaledPause(baseDelay, VERY_LONG_WORD_BONUS_MULTIPLIER, 24, 120);
    }
  }

  if (/[.!?][)"'\]]*$/.test(token)) {
    extraDelay += scaledPause(baseDelay, SENTENCE_END_BONUS_MULTIPLIER, 36, 220);
  }

  if (word.isParagraphEnd) {
    extraDelay += scaledPause(baseDelay, PARAGRAPH_END_BONUS_MULTIPLIER, 70, 340);
  }

  return Math.round(baseDelay + extraDelay);
}

function scaledPause(baseDelay, multiplier, min, max) {
  const scaled = baseDelay * multiplier;
  return Math.max(min, Math.min(max, scaled));
}

function parseTextFile(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphTexts = normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const paragraphs = [];
  const words = [];

  paragraphTexts.forEach((paragraphText, paragraphIndex) => {
    const tokens = paragraphText.split(/\s+/).filter(Boolean);
    const startIndex = words.length;

    tokens.forEach((token, tokenIndex) => {
      const isParagraphEnd = tokenIndex === tokens.length - 1;

      words.push({
        raw: token,
        paragraphIndex,
        indexInParagraph: tokenIndex,
        isParagraphEnd,
      });
    });

    paragraphs.push({
      index: paragraphIndex,
      tokens,
      startIndex,
      endIndex: words.length - 1,
    });
  });

  return { paragraphs, words };
}

function makeFileKey(file) {
  return `${STORAGE_PREFIX}:${file.name}:${file.size}:${file.lastModified}`;
}

function loadProgress(fileKey) {
  try {
    const raw = localStorage.getItem(fileKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveProgress() {
  if (!state.fileKey || !hasLoadedText()) {
    return;
  }

  const payload = {
    currentIndex: state.currentIndex,
    wpm: state.wpm,
    longWordBonusEnabled: state.longWordBonusEnabled,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(state.fileKey, JSON.stringify(payload));
  } catch (error) {
    // Ignore quota/storage errors in the prototype.
  }
}

function clampIndex(index) {
  if (!Number.isFinite(index) || state.words.length === 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, state.words.length - 1));
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

function renderStatus(overrideText) {
  if (overrideText) {
    elements.statusText.textContent = overrideText;
    return;
  }

  if (!hasLoadedText()) {
    elements.statusText.textContent = "Last inn en tekst for å starte.";
    return;
  }

  if (state.isPlaying) {
    elements.statusText.textContent = state.isPreviewing
      ? "Fester blikket i 1 sekund før lesing starter."
      : "Leser. Slipp for å pause og se kontekst.";
    return;
  }

  if (state.reachedEnd) {
    elements.statusText.textContent = "Teksten er ferdig lest.";
    return;
  }

  elements.statusText.textContent = "Pauset. Kontekst vises under.";
}

function renderWord() {
  if (!hasLoadedText()) {
    elements.wordDisplay.textContent = "Klar";
    return;
  }

  elements.wordDisplay.textContent = state.words[state.currentIndex].raw;
}

function renderProgress() {
  if (!hasLoadedText()) {
    elements.progressText.textContent = "0 / 0 ord";
    return;
  }

  const current = state.currentIndex + 1;
  const total = state.words.length;
  const percent = Math.round((current / total) * 100);
  elements.progressText.textContent = `${current} / ${total} ord · ${percent}%`;
}

function renderContext() {
  elements.contextBody.textContent = "";

  if (!hasLoadedText()) {
    elements.contextPanel.classList.add("is-empty");
    elements.contextHint.textContent =
      "Panelet fylles når du åpner en tekst og pauser lesingen.";
    return;
  }

  const word = state.words[state.currentIndex];
  const paragraph = state.paragraphs[word.paragraphIndex];

  elements.contextPanel.classList.remove("is-empty");
  elements.contextHint.textContent = `${state.fileName} · ord ${state.currentIndex + 1}`;

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

  const currentWord = elements.contextBody.querySelector(".is-current");
  if (currentWord) {
    requestAnimationFrame(() => {
      currentWord.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }
}

function updateHeldVisualState() {
  const shouldLookHeld = state.pointerHoldActive || state.spaceHoldActive;
  elements.playButton.classList.toggle("is-held", shouldLookHeld);
}

init();
