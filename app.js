const STORAGE_PREFIX = "leseapp-progress-v1";
const SETTINGS_STORAGE_KEY = "leseapp-settings-v1";
const DEFAULT_WPM = 320;
const STARTUP_PREVIEW_MS = 1000;
const HOLD_THRESHOLD_MS = 180;
const EXPANDED_CONTEXT_CHUNK_SIZE = 24;
const DEFAULT_LONG_WORD_BONUS_PERCENT = 28;
const DEFAULT_VERY_LONG_WORD_BONUS_PERCENT = 38;
const SENTENCE_END_BONUS_MULTIPLIER = 0.72;
const PARAGRAPH_END_BONUS_MULTIPLIER = 1.35;

const state = {
  contextExpanded: false,
  contextRangeEnd: 0,
  contextRangeStart: 0,
  contextScrollToCurrent: false,
  currentIndex: 0,
  errorMessage: "",
  fileKey: "",
  ignoreNextButtonClick: false,
  isLoading: false,
  isPlaying: false,
  isPreviewing: false,
  longWordBonusPercent: DEFAULT_LONG_WORD_BONUS_PERCENT,
  paragraphs: [],
  pointerHoldActive: false,
  pointerHoldTimer: null,
  pointerId: null,
  progressOriginLabel: "",
  reachedEnd: false,
  sections: [],
  speedControlsExpanded: false,
  spaceDown: false,
  spaceHoldActive: false,
  spaceHoldTimer: null,
  timerId: null,
  words: [],
  wpm: DEFAULT_WPM,
  veryLongWordBonusPercent: DEFAULT_VERY_LONG_WORD_BONUS_PERCENT,
};

const elements = {
  appTitle: document.querySelector("#appTitle"),
  chooseFileButton: document.querySelector("#chooseFileButton"),
  closeImportDialog: document.querySelector("#closeImportDialog"),
  contextBody: document.querySelector("#contextBody"),
  contextHint: document.querySelector("#contextHint"),
  contextPanel: document.querySelector("#contextPanel"),
  contextToggle: document.querySelector("#contextToggle"),
  darkModeToggle: document.querySelector("#darkModeToggle"),
  fileInput: document.querySelector("#fileInput"),
  importDialog: document.querySelector("#importDialog"),
  importToggle: document.querySelector("#importToggle"),
  loadPastedTextButton: document.querySelector("#loadPastedTextButton"),
  longWordBonusSlider: document.querySelector("#longWordBonusSlider"),
  longWordBonusValue: document.querySelector("#longWordBonusValue"),
  nextWordDisplay: document.querySelector("#nextWordDisplay"),
  nextSectionButton: document.querySelector("#nextSectionButton"),
  pastedTextInput: document.querySelector("#pastedTextInput"),
  playButton: document.querySelector("#playButton"),
  prevSectionButton: document.querySelector("#prevSectionButton"),
  prevWordDisplay: document.querySelector("#prevWordDisplay"),
  progressText: document.querySelector("#progressText"),
  sectionLabel: document.querySelector("#sectionLabel"),
  speedControls: document.querySelector("#speedControls"),
  speedSlider: document.querySelector("#speedSlider"),
  speedSliderValue: document.querySelector("#speedSliderValue"),
  speedToggle: document.querySelector("#speedToggle"),
  speedValue: document.querySelector("#speedValue"),
  veryLongWordBonusSlider: document.querySelector("#veryLongWordBonusSlider"),
  veryLongWordBonusValue: document.querySelector("#veryLongWordBonusValue"),
  statusText: document.querySelector("#statusText"),
  wordDisplay: document.querySelector("#wordDisplay"),
};

function initDarkMode() {
  const isDark = localStorage.getItem("leseapp-dark-mode") === "true";
  if (isDark) {
    document.body.classList.add("dark");
  }
  updateDarkModeButton(isDark);
  elements.darkModeToggle.addEventListener("click", toggleDarkMode);
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("leseapp-dark-mode", String(isDark));
  updateDarkModeButton(isDark);
}

function updateDarkModeButton(isDark) {
  elements.darkModeToggle.textContent = isDark ? "Lyst modus" : "Mørk modus";
}

function init() {
  loadGlobalSettings();
  syncSettingsControls();

  elements.chooseFileButton.addEventListener("click", handleChooseFileClick);
  elements.closeImportDialog.addEventListener("click", closeImportDialog);
  elements.contextBody.addEventListener("click", handleContextBodyClick);
  elements.contextToggle.addEventListener("click", handleContextToggleClick);
  elements.fileInput.addEventListener("change", handleFileSelection);
  elements.importDialog.addEventListener("click", handleImportDialogBackdropClick);
  elements.importToggle.addEventListener("click", openImportDialog);
  elements.loadPastedTextButton.addEventListener("click", handlePastedTextLoad);
  elements.longWordBonusSlider.addEventListener("input", handleLongWordBonusChange);
  elements.nextSectionButton.addEventListener("click", () => jumpToAdjacentSection(1));
  elements.playButton.addEventListener("click", handlePlayButtonClick);
  elements.playButton.addEventListener("pointercancel", handlePlayButtonPointerUp);
  elements.playButton.addEventListener("pointerdown", handlePlayButtonPointerDown);
  elements.playButton.addEventListener("pointerleave", handlePlayButtonPointerLeave);
  elements.playButton.addEventListener("pointerup", handlePlayButtonPointerUp);
  elements.prevSectionButton.addEventListener("click", () => jumpToAdjacentSection(-1));
  elements.speedSlider.addEventListener("input", handleSpeedChange);
  elements.speedToggle.addEventListener("click", handleSpeedToggleClick);
  elements.speedControls.addEventListener("click", handleSliderStepperClick);
  elements.veryLongWordBonusSlider.addEventListener("input", handleVeryLongWordBonusChange);

  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleSpaceKeyDown);
  document.addEventListener("keyup", handleSpaceKeyUp);

  initDarkMode();
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
  render();

  try {
    closeImportDialog();
    const result = await loadDocumentFile(file);
    applyLoadedDocument(result);
  } catch (error) {
    resetDocument();
    state.errorMessage = formatErrorMessage(error);
  } finally {
    state.isLoading = false;
    render();
  }
}

function openImportDialog() {
  if (typeof elements.importDialog.showModal === "function") {
    elements.importDialog.showModal();
    elements.pastedTextInput.focus();
    return;
  }

  elements.importDialog.setAttribute("open", "");
  elements.pastedTextInput.focus();
}

function closeImportDialog() {
  if (!elements.importDialog.open) {
    return;
  }

  elements.importDialog.close();
}

function handleImportDialogBackdropClick(event) {
  if (event.target === elements.importDialog) {
    closeImportDialog();
  }
}

function handleChooseFileClick() {
  elements.fileInput.click();
}

async function handlePastedTextLoad() {
  const text = elements.pastedTextInput.value.trim();

  if (!text) {
    state.errorMessage = "Lim inn tekst før du starter.";
    render();
    return;
  }

  pausePlayback({ showContext: false });
  resetDocument();
  state.isLoading = true;
  render();

  try {
    const result = await loadPastedText(text);
    closeImportDialog();
    applyLoadedDocument(result);
  } catch (error) {
    resetDocument();
    state.errorMessage = formatErrorMessage(error);
  } finally {
    state.isLoading = false;
    render();
  }
}

async function loadDocumentFile(file) {
  const fileKey = await createStableFileKey(file);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (extension === "epub") {
    const result = await window.LeseappEpub.loadFile(file);
    return {
      fileKey,
      ...result,
      originLabel: result.metadata.title || file.name,
    };
  }

  const text = await file.text();
  return {
    fileKey,
    format: "txt",
    metadata: {},
    model: window.LeseappReadingModel.createModelFromText(text),
    originLabel: file.name,
  };
}

async function loadPastedText(text) {
  const fileKey = await createStableTextKey(text);
  const model = window.LeseappReadingModel.createModelFromText(text);

  return {
    fileKey,
    format: "pasted-text",
    metadata: {},
    model,
    originLabel: buildPastedTextLabel(text),
  };
}

function applyLoadedDocument(result) {
  const saved = loadProgress(result.fileKey);
  const { model } = result;

  state.contextExpanded = false;
  state.contextRangeStart = 0;
  state.contextRangeEnd = 0;
  state.contextScrollToCurrent = true;
  state.currentIndex = clampIndex(saved?.currentIndex ?? 0, model.words.length);
  state.errorMessage = "";
  state.fileKey = result.fileKey;
  state.paragraphs = model.paragraphs;
  state.progressOriginLabel = result.originLabel;
  state.reachedEnd = false;
  state.sections = model.sections ?? [];
  state.words = model.words;
  state.wpm = clampWpm(saved?.wpm ?? DEFAULT_WPM);

  elements.contextToggle.disabled = !state.words.length;
  elements.playButton.disabled = !state.words.length;
  elements.speedSlider.value = String(state.wpm);
  renderSettingsValues();

  if (!state.words.length) {
    state.errorMessage = "Fant ingen ord å vise fra filen.";
    render();
    return;
  }

  saveProgress();
  render();
}

function handleSpeedChange(event) {
  state.wpm = clampWpm(Number(event.target.value));
  renderSettingsValues();
  saveProgress();
  renderStatus();
}

function handleLongWordBonusChange(event) {
  state.longWordBonusPercent = clampPercent(Number(event.target.value), 0, 100);
  renderSettingsValues();
  saveGlobalSettings();
}

function handleVeryLongWordBonusChange(event) {
  state.veryLongWordBonusPercent = clampPercent(Number(event.target.value), 0, 120);
  renderSettingsValues();
  saveGlobalSettings();
}

function handleSliderStepperClick(event) {
  const button = event.target.closest("[data-step-target]");

  if (!button) {
    return;
  }

  const slider = document.querySelector(`#${button.dataset.stepTarget}`);
  const step = Number(button.dataset.step);

  if (!slider || !Number.isFinite(step)) {
    return;
  }

  const current = Number(slider.value);
  const min = Number(slider.min);
  const max = Number(slider.max);
  slider.value = String(Math.max(min, Math.min(max, current + step)));
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}

function handleSpeedToggleClick() {
  state.speedControlsExpanded = !state.speedControlsExpanded;
  renderSpeedControls();
}

function handleDocumentClick(event) {
  if (!state.speedControlsExpanded) {
    return;
  }

  if (
    elements.speedControls.contains(event.target) ||
    elements.speedToggle.contains(event.target)
  ) {
    return;
  }

  state.speedControlsExpanded = false;
  renderSpeedControls();
}

function handleContextToggleClick() {
  if (!hasLoadedText()) {
    return;
  }

  state.contextExpanded = !state.contextExpanded;

  if (state.contextExpanded) {
    initializeExpandedContextRange(getCurrentParagraphIndex());
    state.contextScrollToCurrent = true;
  } else {
    state.contextScrollToCurrent = false;
  }

  renderContext();
}

function handleContextBodyClick(event) {
  const loadButton = event.target.closest("[data-load-direction]");

  if (loadButton && state.contextExpanded) {
    handleExpandedContextPaging(loadButton.dataset.loadDirection);
    return;
  }

  const wordButton = event.target.closest("[data-word-index]");

  if (!wordButton || !hasLoadedText()) {
    return;
  }

  jumpToWordIndex(Number(wordButton.dataset.wordIndex), { keepExpandedContext: state.contextExpanded });
}

function handleExpandedContextPaging(direction) {
  const previousStart = state.contextRangeStart;
  const previousEnd = state.contextRangeEnd;

  if (direction === "prev") {
    state.contextRangeStart = Math.max(0, state.contextRangeStart - EXPANDED_CONTEXT_CHUNK_SIZE);
  }

  if (direction === "next") {
    state.contextRangeEnd = Math.min(
      state.paragraphs.length,
      state.contextRangeEnd + EXPANDED_CONTEXT_CHUNK_SIZE,
    );
  }

  if (state.contextRangeStart === previousStart && state.contextRangeEnd === previousEnd) {
    return;
  }

  renderContext();
  scrollParagraphIntoView(direction === "prev" ? previousStart : previousEnd - 1, direction === "prev" ? "start" : "end");
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

  if (elements.importDialog.open) {
    return;
  }

  if (isEditableTarget(event.target)) {
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

  if (elements.importDialog.open) {
    return;
  }

  if (isEditableTarget(event.target)) {
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

function jumpToAdjacentSection(direction) {
  if (!state.sections.length) {
    return;
  }

  const currentSectionIndex = getCurrentSectionIndex();
  const targetIndex = currentSectionIndex + direction;

  if (targetIndex < 0 || targetIndex >= state.sections.length) {
    return;
  }

  jumpToWordIndex(state.sections[targetIndex].wordIndex, { keepExpandedContext: false });
}

function jumpToWordIndex(nextIndex, { keepExpandedContext } = {}) {
  if (!Number.isFinite(nextIndex) || !hasLoadedText()) {
    return;
  }

  if (state.isPlaying) {
    pausePlayback({ showContext: false });
  }

  state.currentIndex = clampIndex(nextIndex, state.words.length);
  state.reachedEnd = false;

  if (keepExpandedContext) {
    ensureCurrentParagraphInExpandedRange();
    state.contextScrollToCurrent = false;
  } else {
    state.contextExpanded = false;
    state.contextRangeStart = 0;
    state.contextRangeEnd = 0;
    state.contextScrollToCurrent = true;
  }

  saveProgress();
  render();
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
    state.contextScrollToCurrent = false;
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

  if (word.raw.length >= 9) {
    extraDelay += scaledPause(baseDelay, state.longWordBonusPercent / 100, 24, 120);
  }

  if (word.raw.length >= 13) {
    extraDelay += scaledPause(baseDelay, state.veryLongWordBonusPercent / 100, 34, 170);
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
  state.contextExpanded = false;
  state.contextRangeEnd = 0;
  state.contextRangeStart = 0;
  state.contextScrollToCurrent = false;
  state.currentIndex = 0;
  state.errorMessage = "";
  state.fileKey = "";
  state.isPlaying = false;
  state.isPreviewing = false;
  state.paragraphs = [];
  state.progressOriginLabel = "";
  state.reachedEnd = false;
  state.sections = [];
  state.speedControlsExpanded = false;
  state.words = [];

  elements.contextToggle.disabled = true;
  elements.nextSectionButton.disabled = true;
  elements.playButton.disabled = true;
  elements.prevSectionButton.disabled = true;
  updateAppTitle();
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
        updatedAt: Date.now(),
        wpm: state.wpm,
      }),
    );
  } catch {
    // Ignore storage errors in the prototype.
  }
}

function loadGlobalSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const settings = raw ? JSON.parse(raw) : null;

    state.longWordBonusPercent = clampPercent(
      settings?.longWordBonusPercent ?? DEFAULT_LONG_WORD_BONUS_PERCENT,
      0,
      100,
    );
    state.veryLongWordBonusPercent = clampPercent(
      settings?.veryLongWordBonusPercent ?? DEFAULT_VERY_LONG_WORD_BONUS_PERCENT,
      0,
      120,
    );
  } catch {
    state.longWordBonusPercent = DEFAULT_LONG_WORD_BONUS_PERCENT;
    state.veryLongWordBonusPercent = DEFAULT_VERY_LONG_WORD_BONUS_PERCENT;
  }
}

function saveGlobalSettings() {
  try {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        longWordBonusPercent: state.longWordBonusPercent,
        veryLongWordBonusPercent: state.veryLongWordBonusPercent,
        updatedAt: Date.now(),
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

function clampPercent(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
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
  renderPlayButton();
  renderSpeedControls();
  renderSectionNav();
  updateAppTitle();

  if (!state.isPlaying) {
    renderContext();
  }

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
  setStatus("", "hidden");
}

function setStatus(message, tone) {
  elements.statusText.textContent = message;
  elements.statusText.classList.toggle("is-hidden", tone === "hidden");
  elements.statusText.classList.toggle("is-error", tone === "error");
  elements.statusText.classList.toggle("is-loading", tone === "loading");
}

function renderWord() {
  if (!hasLoadedText()) {
    elements.prevWordDisplay.textContent = "";
    elements.wordDisplay.textContent = "Klar";
    elements.nextWordDisplay.textContent = "";
    return;
  }

  elements.prevWordDisplay.textContent = state.words[state.currentIndex - 1]?.raw ?? "";
  elements.wordDisplay.textContent = state.words[state.currentIndex].raw;
  elements.nextWordDisplay.textContent = state.words[state.currentIndex + 1]?.raw ?? "";
}

function renderProgress() {
  if (!hasLoadedText()) {
    elements.progressText.textContent = "0 / 0 ord";
    return;
  }

  const currentBook = state.currentIndex + 1;
  const totalBook = state.words.length;
  const bookPercent = Math.max(0, Math.min(100, Math.round((currentBook / totalBook) * 100)));
  const sectionRange = getCurrentSectionRange();

  if (!sectionRange.isChapter) {
    elements.progressText.textContent = `${currentBook} / ${totalBook} · ${bookPercent}%`;
    return;
  }

  const currentChapter = state.currentIndex - sectionRange.startWordIndex + 1;
  const totalChapter = sectionRange.endWordIndex - sectionRange.startWordIndex + 1;
  const chapterPercent = Math.max(
    0,
    Math.min(100, Math.round((currentChapter / totalChapter) * 100)),
  );
  elements.progressText.textContent =
    `${currentBook} / ${totalBook} · ${bookPercent}% · Kap ${chapterPercent}%`;
}

function renderPlayButton() {
  elements.playButton.classList.remove("is-playing", "is-ready", "is-restart");

  if (!hasLoadedText()) {
    elements.playButton.textContent = "Start";
    elements.playButton.classList.add("is-ready");
    return;
  }

  if (state.isPlaying) {
    elements.playButton.textContent = "Pause";
    elements.playButton.classList.add("is-playing");
    return;
  }

  if (state.reachedEnd) {
    elements.playButton.textContent = "Start på nytt";
    elements.playButton.classList.add("is-restart");
    return;
  }

  elements.playButton.textContent = "Start";
  elements.playButton.classList.add("is-ready");
}

function renderSectionNav() {
  if (!state.sections.length) {
    elements.prevSectionButton.disabled = true;
    elements.nextSectionButton.disabled = true;
    elements.sectionLabel.textContent = "Ingen kapitler funnet.";
    return;
  }

  const currentSectionIndex = getCurrentSectionIndex();
  const currentSection = state.sections[currentSectionIndex];

  elements.prevSectionButton.disabled = currentSectionIndex <= 0;
  elements.nextSectionButton.disabled = currentSectionIndex >= state.sections.length - 1;
  elements.sectionLabel.textContent =
    `${currentSection.label} · ${currentSectionIndex + 1} / ${state.sections.length}`;
}

function renderSpeedControls() {
  elements.speedControls.classList.toggle("is-collapsed", !state.speedControlsExpanded);
}

function syncSettingsControls() {
  elements.speedSlider.value = String(state.wpm);
  elements.longWordBonusSlider.value = String(state.longWordBonusPercent);
  elements.veryLongWordBonusSlider.value = String(state.veryLongWordBonusPercent);
  renderSettingsValues();
}

function renderSettingsValues() {
  elements.speedValue.textContent = `${state.wpm} WPM`;
  elements.speedSliderValue.textContent = `${state.wpm} WPM`;
  elements.longWordBonusValue.textContent = `${state.longWordBonusPercent}%`;
  elements.veryLongWordBonusValue.textContent = `${state.veryLongWordBonusPercent}%`;
}

function updateAppTitle() {
  const title = state.progressOriginLabel
    ? `Leseapp - ${state.progressOriginLabel}`
    : "Leseapp";
  elements.appTitle.textContent = title;
  document.title = title;
}

function renderContext() {
  elements.contextBody.textContent = "";

  if (!hasLoadedText()) {
    elements.contextPanel.classList.add("is-empty");
    elements.contextPanel.classList.remove("is-expanded");
    elements.contextHint.textContent =
      "Panelet fylles når du åpner en tekst eller EPUB og pauser lesingen.";
    elements.contextToggle.textContent = "Utvid tekstvindu";
    return;
  }

  if (state.contextExpanded) {
    ensureCurrentParagraphInExpandedRange();
  }

  const currentParagraphIndex = getCurrentParagraphIndex();
  elements.contextPanel.classList.remove("is-empty");
  elements.contextPanel.classList.toggle("is-expanded", state.contextExpanded);
  elements.contextHint.textContent = state.contextExpanded
    ? buildExpandedContextHint()
    : `${state.progressOriginLabel} · ord ${state.currentIndex + 1}`;
  elements.contextToggle.textContent = state.contextExpanded
    ? "Vis mindre tekst"
    : "Utvid tekstvindu";

  const fragment = document.createDocumentFragment();
  const paragraphsToRender = state.contextExpanded
    ? state.paragraphs.slice(state.contextRangeStart, state.contextRangeEnd)
    : [state.paragraphs[currentParagraphIndex]];

  if (state.contextExpanded && state.contextRangeStart > 0) {
    fragment.append(
      createContextPager("prev", `Vis tidligere avsnitt (${state.contextRangeStart} over)`),
    );
  }

  paragraphsToRender.forEach((paragraph) => {
    const paragraphElement = document.createElement("p");
    paragraphElement.className = "context-paragraph";
    paragraphElement.dataset.paragraphIndex = String(paragraph.index);

    if (paragraph.index === currentParagraphIndex) {
      paragraphElement.classList.add("is-current-paragraph");
    }

    paragraph.tokens.forEach((token, tokenIndex) => {
      const tokenElement = document.createElement("button");
      tokenElement.className = "context-word";
      tokenElement.dataset.wordIndex = String(paragraph.startIndex + tokenIndex);
      tokenElement.textContent = token;
      tokenElement.type = "button";

      if (paragraph.startIndex + tokenIndex === state.currentIndex) {
        tokenElement.classList.add("is-current");
      }

      paragraphElement.append(tokenElement);

      if (tokenIndex < paragraph.tokens.length - 1) {
        paragraphElement.append(document.createTextNode(" "));
      }
    });

    fragment.append(paragraphElement);
  });

  if (state.contextExpanded && state.contextRangeEnd < state.paragraphs.length) {
    fragment.append(
      createContextPager(
        "next",
        `Vis flere avsnitt (${state.paragraphs.length - state.contextRangeEnd} igjen)`,
      ),
    );
  }

  elements.contextBody.append(fragment);
  scrollCurrentWordIntoView();
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

function buildPastedTextLabel(text) {
  const normalized = window.LeseappReadingModel.normalizeWhitespace(text);
  const preview = normalized.slice(0, 36);
  return preview ? `Innlimt tekst: ${preview}${normalized.length > 36 ? "..." : ""}` : "Innlimt tekst";
}

function isEditableTarget(target) {
  return Boolean(
    target?.closest?.("input, textarea, select, [contenteditable='true']"),
  );
}

function initializeExpandedContextRange(centerParagraphIndex) {
  const start = Math.max(0, centerParagraphIndex - Math.floor(EXPANDED_CONTEXT_CHUNK_SIZE / 2));
  const end = Math.min(state.paragraphs.length, start + EXPANDED_CONTEXT_CHUNK_SIZE);
  state.contextRangeStart = Math.max(0, end - EXPANDED_CONTEXT_CHUNK_SIZE);
  state.contextRangeEnd = end;
}

function ensureCurrentParagraphInExpandedRange() {
  const currentParagraphIndex = getCurrentParagraphIndex();

  if (
    currentParagraphIndex >= state.contextRangeStart &&
    currentParagraphIndex < state.contextRangeEnd
  ) {
    return;
  }

  initializeExpandedContextRange(currentParagraphIndex);
}

function getCurrentParagraphIndex() {
  return hasLoadedText() ? state.words[state.currentIndex].paragraphIndex : 0;
}

function getCurrentSectionIndex() {
  if (!state.sections.length) {
    return -1;
  }

  let currentSectionIndex = 0;

  for (let index = 0; index < state.sections.length; index += 1) {
    if (state.sections[index].wordIndex <= state.currentIndex) {
      currentSectionIndex = index;
    } else {
      break;
    }
  }

  return currentSectionIndex;
}

function getCurrentSectionRange() {
  if (!state.sections.length) {
    return {
      endWordIndex: state.words.length - 1,
      isChapter: false,
      label: "",
      startWordIndex: 0,
    };
  }

  const currentSectionIndex = getCurrentSectionIndex();
  const currentSection = state.sections[currentSectionIndex];
  const nextSection = state.sections[currentSectionIndex + 1];

  return {
    endWordIndex: nextSection ? nextSection.wordIndex - 1 : state.words.length - 1,
    isChapter: true,
    label: currentSection.label,
    startWordIndex: currentSection.wordIndex,
  };
}

function buildExpandedContextHint() {
  return (
    `${state.progressOriginLabel} · avsnitt ${state.contextRangeStart + 1}` +
    `-${state.contextRangeEnd} av ${state.paragraphs.length}`
  );
}

function createContextPager(direction, label) {
  const button = document.createElement("button");
  button.className = "context-pager";
  button.dataset.loadDirection = direction;
  button.textContent = label;
  button.type = "button";
  return button;
}

function scrollCurrentWordIntoView() {
  if (!state.contextScrollToCurrent) {
    return;
  }

  const currentWord = elements.contextBody.querySelector(".context-word.is-current");

  if (!currentWord) {
    return;
  }

  state.contextScrollToCurrent = false;

  requestAnimationFrame(() => {
    currentWord.scrollIntoView({
      block: state.contextExpanded ? "center" : "nearest",
      inline: "nearest",
    });
  });
}

function scrollParagraphIntoView(paragraphIndex, block) {
  requestAnimationFrame(() => {
    const paragraph = elements.contextBody.querySelector(
      `[data-paragraph-index="${paragraphIndex}"]`,
    );

    if (paragraph) {
      paragraph.scrollIntoView({ block, inline: "nearest" });
    }
  });
}

async function createStableFileKey(file) {
  const prefix = `${STORAGE_PREFIX}:${file.name}:${file.size}`;

  try {
    const slice = await file.slice(0, 65536).arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", slice);
    const hash = Array.from(new Uint8Array(digest))
      .slice(0, 12)
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    return `${prefix}:${hash}`;
  } catch {
    return prefix;
  }
}

async function createStableTextKey(text) {
  const prefix = `${STORAGE_PREFIX}:pasted-text:${text.length}`;

  try {
    const encoded = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    const hash = Array.from(new Uint8Array(digest))
      .slice(0, 12)
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    return `${prefix}:${hash}`;
  } catch {
    return `${prefix}:${text.slice(0, 48)}`;
  }
}

init();
