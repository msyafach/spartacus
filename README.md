# SPARTACUS

A minimalist **black & white** Windows desktop app to help you focus. Built with Electron.

## Features

- **Pomodoro timer** — focus / short break / long break, session dots, chime on completion, custom durations and rounds per cycle.
- **Ambient soundscapes** — generated live with the Web Audio API (no audio files, no internet needed):
  - Rain, Ocean, Bustling Café, Airplane Cabin, Brown Noise
  - Binaural Beta (20 Hz) and Binaural Gamma (40 Hz) — best with headphones
  - Each sound has its own volume, plus a master ambience volume. Layers can be combined freely.
- **YouTube music (audio only)** — paste any YouTube link and only the audio stream is extracted.
  Extraction is done by the bundled [yt-dlp](https://github.com/yt-dlp/yt-dlp) binary with `-f 251/140/bestaudio/best`
  (webm/opus or m4a — video is never downloaded). Tracks are cached to disk, so replaying is instant,
  and the queue is remembered between sessions.
- **Frameless window**, custom titlebar, keyboard shortcuts:
  - `Space` start/pause timer · `R` reset · `S` skip
- Everything is persisted (settings, queue, volumes).

## Run

```bash
npm install
npm start
```

## Build a Windows installer

```bash
npm i -D electron-builder
npm run dist
```

Output: `dist/Spartacus Setup <version>.exe` (NSIS installer).

## Notes

- YouTube playback requires an internet connection; ambient sounds do not.
- On first play a track is downloaded (a few seconds) — afterwards it plays instantly from cache.
  The cache lives in `%APPDATA%\Spartacus\audio-cache` and is capped at ~400 MB (oldest files removed first).
- Live streams are not supported (regular videos only).
- Background photo: [Unsplash](https://unsplash.com/photos/mountain-under-cloudy-sky-nKO_1QyFh9o) — displayed in pure grayscale.
- App icon: "timer" glyph from [Lucide](https://lucide.dev) (ISC license, free for any use) — rendered monochrome.
- Smoke test helper: `SMOKE_TEST=1 npx electron .` auto-quits and prints diagnostics;
  add `SMOKE_TEST_YT=<youtube-url>` to also exercise the full extraction pipeline.
- Regenerate icons & installer artwork: `node tools/make-icons.js`.
- Update the bundled extractor: replace `bin/yt-dlp.exe` from
  https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
