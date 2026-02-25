import { invoke } from "@tauri-apps/api/core";
import { save, open, ask } from "@tauri-apps/plugin-dialog";

// ── State ────────────────────────────────────────────────────────
const State = {
  deck: { name: "Untitled Deck", cards: [] },
  filePath: null,
  dirty: false,
  studyIndex: 0,
  studyOrder: [],
  shuffled: false,
  ollamaConnected: false,
};

// ── Helpers ──────────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ── View Switching ───────────────────────────────────────────────
function switchView(view) {
  $$(".view").forEach((v) => v.classList.remove("active"));
  $$(".tab").forEach((t) => t.classList.remove("active"));
  $(`#view-${view}`).classList.add("active");
  $(`.tab[data-view="${view}"]`).classList.add("active");
  if (view === "study") initStudy();
  if (view === "edit") renderCards();
}

// ── Render ───────────────────────────────────────────────────────
function render() {
  $("#deck-name").textContent = State.deck.name;
  $("#card-count").textContent = State.deck.cards.length;
  $("#edit-deck-name").value = State.deck.name;
  renderCards();
  updateUnsaved();
}

function updateUnsaved() {
  $("#unsaved-dot").classList.toggle("hidden", !State.dirty);
}

function markDirty() {
  State.dirty = true;
  updateUnsaved();
  $("#card-count").textContent = State.deck.cards.length;
}

function renderCards() {
  const list = $("#card-list");
  if (State.deck.cards.length === 0) {
    list.innerHTML = '<div class="empty-state">No flashcards yet. Generate some or add manually.</div>';
    return;
  }

  list.innerHTML = State.deck.cards
    .map((card, i) => `
      <div class="card-item" data-id="${card.id}" draggable="true">
        <div class="card-num">${i + 1}</div>
        <div class="card-fields">
          <div class="card-field">
            <label>Question</label>
            <textarea rows="2" data-card-id="${card.id}" data-field="question">${escapeHtml(card.question)}</textarea>
          </div>
          <div class="card-field">
            <label>Answer</label>
            <textarea rows="2" data-card-id="${card.id}" data-field="answer">${escapeHtml(card.answer)}</textarea>
          </div>
        </div>
        <div class="card-actions">
          <button class="drag-handle" title="Drag to reorder">⠿</button>
          <button data-action="move-up" data-card-id="${card.id}" title="Move up">↑</button>
          <button data-action="move-down" data-card-id="${card.id}" title="Move down">↓</button>
          <button class="delete" data-action="delete" data-card-id="${card.id}" title="Delete">✕</button>
        </div>
      </div>
    `).join("");

  initDragDrop();
}

// ── Card Operations ──────────────────────────────────────────────
function editCard(id, field, value) {
  const card = State.deck.cards.find((c) => c.id === id);
  if (card) { card[field] = value; markDirty(); }
}

function deleteCard(id) {
  State.deck.cards = State.deck.cards.filter((c) => c.id !== id);
  markDirty();
  renderCards();
}

function addCard() {
  State.deck.cards.push({ id: crypto.randomUUID(), question: "", answer: "" });
  markDirty();
  renderCards();
  const list = $("#card-list");
  list.scrollTop = list.scrollHeight;
  const ta = list.querySelectorAll(".card-item:last-child textarea");
  if (ta[0]) ta[0].focus();
}

function moveCard(id, direction) {
  const idx = State.deck.cards.findIndex((c) => c.id === id);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= State.deck.cards.length) return;
  const [card] = State.deck.cards.splice(idx, 1);
  State.deck.cards.splice(newIdx, 0, card);
  markDirty();
  renderCards();
}

function updateDeckName(name) {
  State.deck.name = name;
  $("#deck-name").textContent = name;
  markDirty();
}

// ── Drag & Drop ──────────────────────────────────────────────────
function initDragDrop() {
  let draggedId = null;
  $$(".card-item").forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      draggedId = item.dataset.id;
      item.style.opacity = "0.4";
      e.dataTransfer.effectAllowed = "move";
    });
    item.addEventListener("dragend", () => {
      item.style.opacity = "1";
      draggedId = null;
      $$(".card-item").forEach((c) => (c.style.borderTop = ""));
    });
    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      item.style.borderTop = "2px solid var(--primary)";
    });
    item.addEventListener("dragleave", () => { item.style.borderTop = ""; });
    item.addEventListener("drop", (e) => {
      e.preventDefault();
      item.style.borderTop = "";
      if (!draggedId || draggedId === item.dataset.id) return;
      const fromIdx = State.deck.cards.findIndex((c) => c.id === draggedId);
      const toIdx = State.deck.cards.findIndex((c) => c.id === item.dataset.id);
      const [card] = State.deck.cards.splice(fromIdx, 1);
      State.deck.cards.splice(toIdx, 0, card);
      markDirty();
      renderCards();
    });
  });
}

// ── LLM ──────────────────────────────────────────────────────────
function showStatus(msg, type) {
  const el = $("#generate-status");
  el.className = `status-msg ${type}`;
  el.innerHTML = msg;
  el.classList.remove("hidden");
  if (type === "success") setTimeout(() => el.classList.add("hidden"), 4000);
}

async function generateFlashcards() {
  const text = $("#source-text").value.trim();
  if (!text) { showStatus("Please enter some text first.", "error"); return; }
  if (!State.ollamaConnected) {
    showStatus("Ollama is not connected. Please start Ollama first.", "error");
    return;
  }

  const model = $("#model-picker").value;
  const btn = $("#btn-generate");
  btn.disabled = true;
  btn.textContent = "Generating…";
  showStatus('<span class="spinner"></span> Analyzing text and generating flashcards… This may take a moment.', "loading");

  try {
    const cards = await invoke("generate_flashcards", { text, model });
    if (!cards || cards.length === 0) {
      showStatus("No flashcards were generated. Try different text or regenerate.", "error");
      return;
    }

    if (State.deck.cards.length > 0) {
      const shouldReplace = await ask(
        `You already have ${State.deck.cards.length} cards. Replace them or add ${cards.length} new cards?`,
        { title: "Existing Cards", kind: "warning", okLabel: "Replace All", cancelLabel: "Add to Existing" }
      );
      if (shouldReplace) { State.deck.cards = cards; } else { State.deck.cards.push(...cards); }
    } else {
      State.deck.cards = cards;
    }

    markDirty();
    showStatus(`Generated ${cards.length} flashcards successfully.`, "success");
    render();
    setTimeout(() => switchView("edit"), 600);
  } catch (err) {
    showStatus(err.toString(), "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate Flashcards";
  }
}

async function refreshModels() {
  try {
    const models = await invoke("check_ollama");
    State.ollamaConnected = true;
    $("#ollama-dot").className = "status-dot connected";
    $("#ollama-text").textContent = `Ollama connected (${models.length} model${models.length !== 1 ? "s" : ""})`;
    const picker = $("#model-picker");
    picker.innerHTML = "";
    if (models.length === 0) {
      picker.innerHTML = '<option value="mistral">mistral (not installed)</option>';
    } else {
      models.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        picker.appendChild(opt);
      });
    }
  } catch {
    State.ollamaConnected = false;
    $("#ollama-dot").className = "status-dot error";
    $("#ollama-text").textContent = "Ollama not running";
  }
}

// ── File Management ──────────────────────────────────────────────
async function newDeck() {
  if (State.dirty) {
    const shouldSave = await ask("Save current deck before creating a new one?", {
      title: "Unsaved Changes", kind: "warning", okLabel: "Save First", cancelLabel: "Discard",
    });
    if (shouldSave) await saveDeck();
  }
  State.deck = { name: "Untitled Deck", cards: [] };
  State.filePath = null;
  State.dirty = false;
  $("#source-text").value = "";
  render();
  switchView("generate");
}

async function openDeck() {
  if (State.dirty) {
    const shouldSave = await ask("Save current deck before opening another?", {
      title: "Unsaved Changes", kind: "warning", okLabel: "Save First", cancelLabel: "Discard",
    });
    if (shouldSave) await saveDeck();
  }
  try {
    const path = await open({ filters: [{ name: "Flashcard Deck", extensions: ["json"] }], multiple: false });
    if (!path) return;
    const deck = await invoke("load_deck", { path });
    State.deck = deck;
    State.filePath = path;
    State.dirty = false;
    render();
    switchView("edit");
  } catch (err) { console.error("Open failed:", err); }
}

async function saveDeck() {
  if (!State.filePath) return saveDeckAs();
  try {
    await invoke("save_deck", { path: State.filePath, deck: State.deck });
    State.dirty = false;
    updateUnsaved();
  } catch (err) { console.error("Save failed:", err); }
}

async function saveDeckAs() {
  try {
    const defaultDir = await invoke("get_default_deck_dir");
    const path = await save({
      defaultPath: `${defaultDir}/${State.deck.name.replace(/[^a-zA-Z0-9 ]/g, "")}.json`,
      filters: [{ name: "Flashcard Deck", extensions: ["json"] }],
    });
    if (!path) return;
    State.filePath = path;
    await saveDeck();
  } catch (err) { console.error("Save As failed:", err); }
}

// ── Study Mode ───────────────────────────────────────────────────
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function initStudy() {
  if (State.deck.cards.length === 0) {
    $("#study-empty").classList.remove("hidden");
    $("#study-area").classList.add("hidden");
    return;
  }
  $("#study-empty").classList.add("hidden");
  $("#study-area").classList.remove("hidden");
  State.studyOrder = [...Array(State.deck.cards.length).keys()];
  if (State.shuffled) shuffleArray(State.studyOrder);
  State.studyIndex = 0;
  renderStudyCard();
}

function renderStudyCard() {
  const idx = State.studyOrder[State.studyIndex];
  const card = State.deck.cards[idx];
  if (!card) return;
  $("#study-card-inner").classList.remove("flipped");
  $("#study-question").textContent = card.question;
  $("#study-answer").textContent = card.answer;
  $("#study-counter").textContent = `${State.studyIndex + 1} / ${State.deck.cards.length}`;
}

function flipCard() {
  $("#study-card-inner").classList.toggle("flipped");
}

function studyNext() {
  if (State.studyIndex < State.studyOrder.length - 1) { State.studyIndex++; renderStudyCard(); }
}

function studyPrev() {
  if (State.studyIndex > 0) { State.studyIndex--; renderStudyCard(); }
}

// ── Event Binding ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Top bar
  $("#btn-new").addEventListener("click", newDeck);
  $("#btn-open").addEventListener("click", openDeck);
  $("#btn-save").addEventListener("click", saveDeck);
  $("#btn-saveas").addEventListener("click", saveDeckAs);

  // Tabs
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  // Generate
  $("#btn-generate").addEventListener("click", generateFlashcards);
  $("#btn-refresh-models").addEventListener("click", refreshModels);

  // Edit
  $("#btn-add-card").addEventListener("click", addCard);
  $("#edit-deck-name").addEventListener("input", (e) => updateDeckName(e.target.value));

  // Delegate card list events (edit, delete, move)
  $("#card-list").addEventListener("input", (e) => {
    const ta = e.target;
    if (ta.tagName === "TEXTAREA" && ta.dataset.cardId) {
      editCard(ta.dataset.cardId, ta.dataset.field, ta.value);
    }
  });
  $("#card-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.cardId;
    if (btn.dataset.action === "delete") deleteCard(id);
    if (btn.dataset.action === "move-up") moveCard(id, -1);
    if (btn.dataset.action === "move-down") moveCard(id, 1);
  });

  // Study
  $("#study-card").addEventListener("click", flipCard);
  $("#btn-study-flip").addEventListener("click", flipCard);
  $("#btn-study-prev").addEventListener("click", studyPrev);
  $("#btn-study-next").addEventListener("click", studyNext);
  $("#btn-study-restart").addEventListener("click", initStudy);
  $("#shuffle-mode").addEventListener("change", () => {
    State.shuffled = $("#shuffle-mode").checked;
    initStudy();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "s") { e.preventDefault(); saveDeck(); }
    if (mod && e.key === "o") { e.preventDefault(); openDeck(); }
    if (mod && e.key === "n") { e.preventDefault(); newDeck(); }
    if ($("#view-study").classList.contains("active")) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); flipCard(); }
      if (e.key === "ArrowRight") studyNext();
      if (e.key === "ArrowLeft") studyPrev();
    }
  });

  // Init
  refreshModels();
  render();

  console.log("Flashcard Studio loaded");
});
