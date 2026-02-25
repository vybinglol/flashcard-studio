# Flashcard Studio

A minimal, lightweight desktop flashcard app built with [Tauri](https://tauri.app). Generate flashcards from any text using a local LLM ([Ollama](https://ollama.com)), edit them inline, and study with a clean flip-card interface.

> **Fully offline. No cloud. No accounts. Just flashcards.**

![Flashcard Studio Demo](docs/demo.gif)

---

## Download

**[📥 Download the latest release](../../releases/latest)** — grab the `.dmg` for macOS.

> First launch: right-click the app → **Open** (to bypass Gatekeeper since the app isn't code-signed).

Or build from source — see [Setup](#setup) below.

---

## Screenshots

| Generate | Edit | Study |
|----------|------|-------|
| ![Generate](docs/screenshot-generate.png) | ![Edit](docs/screenshot-edit.png) | ![Study](docs/screenshot-study.png) |

---

## Features

- **LLM-Powered Generation** — Paste any text (notes, textbooks, articles), generate study-ready flashcards via Ollama
- **Inline Editing** — Edit questions & answers directly, add/delete/reorder cards with drag-and-drop
- **Study Mode** — Flip cards with click or spacebar, arrow key navigation, shuffle mode
- **File Management** — Save/open decks as JSON files, keyboard shortcuts (⌘S, ⌘O, ⌘N)
- **Lightweight** — ~5-8MB app bundle, instant startup, zero telemetry

---

## Prerequisites

| Dependency | Install |
|------------|---------|
| **Rust** | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Node.js 18+** | [nodejs.org](https://nodejs.org) or `brew install node` |
| **Ollama** | [ollama.com/download](https://ollama.com/download) |
| **A model** | `ollama pull mistral` (recommended) |

Other good models: `llama3.2` (quality), `gemma2:2b` (speed), `phi3` (compact).

---

## Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/flashcard-studio.git
cd flashcard-studio

# Install dependencies
npm install

# Start Ollama (or open the Ollama app)
ollama serve

# Run in dev mode (first build takes ~1-2 min for Rust compilation)
npm run dev
```

### Build for Production

```bash
npm run build
```

The DMG will be at `src-tauri/target/release/bundle/dmg/`.

---

## Usage

### Generate
1. Make sure Ollama is running (check the green dot in the status bar)
2. Paste your study material into the text area
3. Select a model from the dropdown
4. Click **Generate Flashcards**

### Edit
- Click any field to edit inline
- Drag cards or use ↑↓ to reorder
- Click ✕ to delete, **+ Add Card** for blank cards

### Study
- Click the card or press **Space/Enter** to flip
- **← →** arrow keys to navigate
- Toggle **Shuffle** for random order

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| ⌘N | New deck |
| ⌘O | Open deck |
| ⌘S | Save deck |
| Space / Enter | Flip card (study mode) |
| ← → | Previous / Next (study mode) |

---

## Deck File Format

Decks are plain JSON — easy to share, version control, or convert:

```json
{
  "name": "Biology Chapter 5",
  "cards": [
    {
      "id": "a1b2c3d4-...",
      "question": "What is mitosis?",
      "answer": "Cell division producing two identical daughter cells."
    }
  ]
}
```

---

## Project Structure

```
flashcard-studio/
├── ui/                       # Frontend source
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs            # Tauri commands (LLM, file I/O)
│   ├── tauri.conf.json
│   └── capabilities/
├── docs/                     # Screenshots & demo GIF
└── package.json
```

---

## Troubleshooting

**"Ollama not running"** — Run `ollama serve` or open the Ollama app. Verify with `curl http://localhost:11434/api/tags`.

**"LLM returned invalid JSON"** — Some models occasionally produce malformed output. Click Generate again. Mistral and Llama 3.2 are the most reliable.

**Slow generation** — First request loads the model into memory (~10-15s). Subsequent requests are faster. For speed, try `gemma2:2b`.

**macOS won't open the app** — Right-click → Open (Gatekeeper blocks unsigned apps on first launch).

---

## Contributing

Contributions welcome! Some ideas:

- [ ] Dark mode
- [ ] Spaced repetition (SM-2 algorithm)
- [ ] Anki export (.apkg)
- [ ] Multiple card types (multiple choice, image-based)
- [ ] OpenAI / Anthropic API support as alternative backends

---

## License

MIT
