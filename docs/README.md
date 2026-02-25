# Docs

Place your screenshots and demo GIF here:

- `screenshot-generate.png` — The Generate tab with text pasted in
- `screenshot-edit.png` — The Edit tab showing a list of flashcards
- `screenshot-study.png` — The Study tab showing a flipped card
- `demo.gif` — A short screen recording showing the full flow

## How to capture

### Screenshots
Use ⌘ + Shift + 4, then Space, then click the app window. This captures the window cleanly with the macOS drop shadow.

### Demo GIF
Record with QuickTime (File → New Screen Recording), then convert:
```bash
# Install gifski for high quality GIFs
brew install gifski

# Convert .mov to gif (resize to 800px wide, 20fps)
ffmpeg -i demo.mov -vf "fps=20,scale=800:-1" -c:v pam -f rawvideo - | gifski -o demo.gif --fps 20 --width 800 -
```

Or use a free app like [Kap](https://getkap.co) which exports directly to GIF.
