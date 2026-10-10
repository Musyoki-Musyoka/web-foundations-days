const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearButton = document.querySelector("#clear-btn");
const themeButton = document.querySelector("#theme-toggle");
const storageMessage = document.querySelector("#storage-message");

const DRAFT_KEY = "day4-note-draft";
const THEME_KEY = "day4-theme";

function updateCounts() {
  const text = noteText.value;
  const characters = text.length;
  const trimmedText = text.trim();
  const words = trimmedText === "" ? 0 : trimmedText.split(/\s+/).length;

  charCount.textContent = `${characters} / 200 characters`;
  wordCount.textContent = `${words} words`;

  // Above 200, both classes are present; .over wins in the stylesheet.
  charCount.classList.toggle("warning", characters > 180);
  charCount.classList.toggle("over", characters > 200);
}

function showStorageWarning(error) {
  storageMessage.textContent =
    "Browser storage is unavailable. Your draft and theme may not survive a refresh.";
  console.warn("Could not access browser storage:", error);
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, noteText.value);
  } catch (error) {
    showStorageWarning(error);
  }
}

function clearDraft() {
  noteText.value = "";
  updateCounts();

  try {
    // Remove only the draft, not the theme or another app's notes.
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    showStorageWarning(error);
  }

  noteText.focus();
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  themeButton.textContent = isDark ? "Light mode" : "Dark mode";
  themeButton.setAttribute("aria-pressed", String(isDark));
}

function restoreSavedState() {
  try {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft !== null) {
      noteText.value = savedDraft;
    }

    applyTheme(localStorage.getItem(THEME_KEY));
  } catch (error) {
    showStorageWarning(error);
  }
}

noteText.addEventListener("input", () => {
  updateCounts();
  saveDraft();
});

clearButton.addEventListener("click", clearDraft);

noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    clearDraft();
  }
});

themeButton.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(nextTheme);

  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch (error) {
    showStorageWarning(error);
  }
});

restoreSavedState();
updateCounts();
