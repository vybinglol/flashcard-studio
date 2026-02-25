# Publishing Flashcard Studio to GitHub — Step by Step

## 1. Create the GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Name it `flashcard-studio` (or whatever you prefer)
3. Set it to **Public**
4. **Don't** check "Add a README" or ".gitignore" (we already have both)
5. Click **Create repository**

## 2. Push your code

Open Terminal, `cd` into the project, and run:

```bash
cd ~/flashcard-app

git init
git add .
git commit -m "Initial commit — Flashcard Studio v1.0.0"

# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/flashcard-studio.git
git branch -M main
git push -u origin main
```

If you use SSH instead of HTTPS:
```bash
git remote add origin git@github.com:YOUR_USERNAME/flashcard-studio.git
```

## 3. Add screenshots & demo GIF

1. Run the app: `npm run dev`
2. Take screenshots of each tab (⌘ + Shift + 4 → Space → click the window)
3. Save them in the `docs/` folder as:
   - `screenshot-generate.png`
   - `screenshot-edit.png`
   - `screenshot-study.png`
4. Record a demo GIF (see `docs/README.md` for how)
5. Save as `docs/demo.gif`
6. Push:
   ```bash
   git add docs/
   git commit -m "Add screenshots and demo GIF"
   git push
   ```

## 4. Build the DMG

```bash
cd ~/flashcard-app
npm run build
```

Your DMG will be at:
```
src-tauri/target/release/bundle/dmg/Flashcard Studio_1.0.0_aarch64.dmg
```

## 5. Create a GitHub Release (this is where the DMG goes)

### Option A: GitHub Web UI (easiest)

1. Go to your repo on GitHub
2. Click **Releases** (right sidebar) → **Create a new release**
3. Click **Choose a tag** → type `v1.0.0` → **Create new tag**
4. Title: `Flashcard Studio v1.0.0`
5. Description (paste this):
   ```
   ## Flashcard Studio v1.0.0

   First public release!

   ### Features
   - Generate flashcards from any text via local LLM (Ollama)
   - Inline editing with drag-and-drop reorder
   - Study mode with flip cards and shuffle
   - Save/open decks as JSON files

   ### Download
   - **macOS (Apple Silicon):** `Flashcard-Studio_1.0.0_aarch64.dmg`

   ### Requirements
   - [Ollama](https://ollama.com) with at least one model installed (`ollama pull mistral`)
   ```
6. Drag your `.dmg` file into the "Attach binaries" area
7. Click **Publish release**

### Option B: GitHub CLI (if you have `gh` installed)

```bash
# Install if needed: brew install gh

gh release create v1.0.0 \
  --title "Flashcard Studio v1.0.0" \
  --notes "First public release. See README for setup instructions." \
  "./src-tauri/target/release/bundle/dmg/Flashcard Studio_1.0.0_aarch64.dmg"
```

## 6. Verify

- Visit `https://github.com/YOUR_USERNAME/flashcard-studio`
- The README should render with your screenshots
- The **Releases** section should show v1.0.0 with the DMG download
- The download link in the README (`../../releases/latest`) should work

## Done!

Share the repo link and people can either download the DMG or build from source.
