# SPARTACUS

A minimalist **black & white** Windows desktop app to help you focus. Built with Electron.

## Features

- **Pomodoro timer** — focus / short break / long break, session dots, chime on completion, custom durations and rounds per cycle.
- **Focus-complete alarm** — gentle bell arpeggio (C5-E5-G5-C6) + warm pad, repeated 3×; plus a
  native Windows notification and taskbar flash. Both can be toggled in Settings.
  Breaks end with a soft two-note chime. Starting the next session stops the alarm.
- **Ambient soundscapes** — generated live with the Web Audio API (no audio files, no internet needed):
  - Rain, Ocean, Bustling Café, Airplane Cabin, Brown Noise
  - Binaural Beta (20 Hz) and Binaural Gamma (40 Hz) — best with headphones
  - Each sound has its own volume, plus a master ambience volume. Layers can be combined freely.
- **Built-in lofi playlist** — 9 royalty-free tracks bundled (no internet needed):
  MISE — *Blurred Memories* (CC0 / public domain), plus Lukrembo, Kalaido, Kerusu and
  Matt Quentin (royalty-free, used with credit). Each track has its own themed background
  (Unsplash, free license) that crossfades in when the track plays. Separate volume slider
  so lofi can sit at background level (default 45%).
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

### Where extracted YouTube music is stored

Audio is extracted once and cached on disk — replaying a track costs nothing:

- Location: `%APPDATA%\Spartacus\audio-cache`
- Files are named `<videoId>.<ext>` (webm/opus or m4a) — **audio only, never video**
- Capped at ~400 MB; the oldest files are removed automatically when the cap is reached
- Removing a track from the queue also deletes its cached file
- Settings, queue and volumes live in the same `%APPDATA%\Spartacus` folder (localStorage)

### Running the installer when the app is already installed

The wizard handles it cleanly:

- It detects the existing installation, silently removes the old version first, then installs —
  the registry entry and shortcuts are **updated in place** (never duplicated)
- If Spartacus is running, the installer asks you to close it first
- Your data (`%APPDATA%\Spartacus`) is **never touched** — settings, queue and cache survive
  reinstalls and uninstalls
- Uninstalling (from Settings → Apps, or `Uninstall Spartacus.exe`) removes the app but keeps
  your data on purpose, so reinstalling picks up right where you left off

### Updates

The app uses `electron-updater` with GitHub Releases:

- On launch it quietly checks for updates and downloads them in the background
- When an update is ready you get a notification; restart to install (or use
  Settings → Check for updates → Restart & install)

**Publishing a release** (two ways):

1. **Automated (recommended)** — push a version tag; GitHub Actions builds the
   installer and creates the release (`.github/workflows/release.yml`):
   ```bash
   git tag v1.1.0 && git push origin v1.1.0
   ```
2. **Manual** — build locally and upload `dist/Spartacus-Setup-<version>.exe`
   as a release asset:
   ```bash
   GH_TOKEN=<github-token> npx electron-builder --win --publish always
   ```

Bump `version` in `package.json` before tagging — users on older versions
receive the update automatically.

- YouTube playback requires an internet connection; ambient sounds do not.
- On first play a track is downloaded (a few seconds) — afterwards it plays instantly from cache.
  The cache lives in `%APPDATA%\Spartacus\audio-cache` and is capped at ~400 MB (oldest files removed first).
- Live streams are not supported (regular videos only).
- Background photos: [Unsplash](https://unsplash.com) (free license, no attribution required) — displayed in pure grayscale.
- Built-in music: MISE — Blurred Memories (CC0), Lukrembo, Kalaido, Kerusu, Matt Quentin (royalty-free, credited in-app).
- App icon: "timer" glyph from [Lucide](https://lucide.dev) (ISC license, free for any use) — rendered monochrome.
- Smoke test helper: `SMOKE_TEST=1 npx electron .` auto-quits and prints diagnostics;
  add `SMOKE_TEST_YT=<youtube-url>` to also exercise the full extraction pipeline.
- Regenerate icons & installer artwork: `node tools/make-icons.js`.
- Update the bundled extractor: replace `bin/yt-dlp.exe` from
  https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
