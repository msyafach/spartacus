# SPARTACUS

![Spartacus focus timer](screenshots/1-timer.png)

Spartacus is a calm place to focus. Your timer, the right sounds, and your goals, all in one quiet window.

## Why

Most focus tools work against us. Timers are cluttered. Music apps are built to keep you browsing. Video sites sit one click away. And the goals that actually matter keep getting pushed aside by whatever feels urgent today.

Spartacus exists because staying focused should not be a fight. You get one place where your timer, your music, and your goals live together, with nothing else competing for your attention.

### The name

The app is named after Spartacus, the gladiator who refused to stay enslaved and fought for his freedom. The enemy here is smaller but just as real: laziness, distraction, and goals that slowly slip away. Every focused session is a small act of rebellion. You sit down, you fight for your time, and you take back a piece of your life.

## How

Spartacus keeps the things that help you focus close, and the things that distract you far away.

- One calm window. The timer, your sounds, and your goals sit side by side. No feeds, no ads, no noise.
- Sounds that support you. Ambient soundscapes and lofi music play without video, ads, or endless browsing. Paste a YouTube link and only the audio comes in.
- Every session connects to something bigger. Link your five-year vision to three-year targets, then to this year's, this quarter's, and this month's goals. Review past periods whenever you need perspective.
- It gets out of your way. Shrink the app into a tiny widget that floats above your other windows and shows the time left, so your screen stays yours.

## What

### Focus timer with a gentle alarm

Work in 25 minute sessions with short breaks in between. The ring empties as time passes. When a session ends you get a soft bell melody, a notification, and the taskbar flashes. No harsh buzzer. A running session is kept safe: close and reopen the app and it resumes with its accurate time left; if it ended while you were away, Spartacus calmly moves you to the next session.

### Goals from five years down to this month

Keep your five-year vision at the top, then turn it into three-year targets, yearly, quarterly, and monthly goals. Optionally link each level to its parent, so a monthly action stays connected to the bigger reason behind it. Tick things off as you go, browse past months, quarters, and years whenever you need a review, and undo an accidental goal deletion for six seconds.

![Goals view](screenshots/2-goals.png)

### Ambient soundscapes

Rain, ocean, forest, fireplace, a bustling café, an airplane cabin, brown noise, and binaural beats. Real field recordings and generated sounds work offline, can be layered together, and each have their own volume. [Ambience recording credits](docs/AMBIENCE_SOURCES.md).

### Built-in lofi with its own backdrop

Fifteen lofi tracks come with the app, no internet needed. Search by song or artist, see what is playing, and jump to another moment with the playback timeline. The background artwork fades to match the mood of each track. [New track credits and licenses](docs/MUSIC_SOURCES.md).

### Your YouTube music, audio only

Paste any YouTube link. Spartacus extracts just the audio, keeps it on your computer, and plays it from a queue you control. No video, no comments, no autoplay.

### A tiny window that stays with you

Click the minimize button and Spartacus becomes a small widget floating above your windows, showing the time left in your session and a motivational quote.

![Mini mode](screenshots/4-mini.png)

### Daily motivation

A fresh quote appears in the app and in the mini window, refreshed every 30 minutes (or click it for a new one). Quotes are picked from a curated library about focus, discipline, and persistence, with relevant ones from live sources mixed in.

### Settings that stay out of your way

Adjust session lengths, alarm, notifications, and updates from one place.

![Settings](screenshots/3-settings.png)

## Install

1. Download the installer from the [latest release](https://github.com/msyafach/spartacus/releases/latest).
2. Open it and pick a folder. No admin rights needed.
3. Start Spartacus from your Start Menu or desktop.

Installing over an older version works fine. Your goals, timer state, queue, and settings are kept locally. Uninstalling keeps them too, in case you come back.

Updates arrive automatically. When a new version is ready you get a notification, and it installs when you restart. You can also check manually in Settings.

## Notes

- Your YouTube tracks are kept in a small cache folder, so replaying them is instant. It is capped at about 400 MB and old tracks are cleared automatically.
- Goal history is read-only, keeping past plans available for review without accidentally changing them.
- Keyboard shortcuts: `Space` start or pause the timer, `R` reset, `S` skip, `Esc` leave mini mode. While a session runs, pause or skip it before choosing another timer mode so every control stays with the visible session.
- Built-in music: HoliznaCC0 (CC0), MISE (Blurred Memories, public domain), plus Lukrembo, Kalaido, Kerusu, and Matt Quentin (royalty free, credited here).
- Background artwork was generated for Spartacus.
- App icon and installer artwork use an original Spartacus helmet mark.

## Building from source

Requires Node.js 22 or newer.

```bash
npm install
npm start
```

To build an installer, run `npm run dist`. The workflow in `.github/workflows/release.yml` builds and publishes a release automatically whenever you push a version tag.
