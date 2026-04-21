# Changelog — BeatMarker AE

All notable changes to this project will be documented here.

---

## [1.0.1] — 2026-04-20

### Fix

- Installer now detects After Effects 2026 install path from Windows registry
- Falls back to `C:\Program Files\Adobe\Adobe After Effects 2026` if registry key is not found
- Fixes installation on machines where AE is installed on a different drive

### Documentation & site

- Added screenshots to README (plugin panel and timeline markers)
- Added og-image for social link previews (WhatsApp, Discord, Twitter)
- Added keyboard shortcuts section (J / K) to README and GitHub Pages site

---

## [1.0.0] — 2026-04-20

### Initial release

- Automatic BPM and beat detection from WAV and MP3 audio layers
- 4-color marker system (Red / Blue / Yellow / Teal) for 4/4 beat positions
- Beat toggles to enable/disable individual beats (1–4)
- Phase shift with minimal redraw (differential update algorithm)
- Two marker targets: Create on Clip and Create on Timeline
- Layer-position aware: markers offset by the layer's start time in the composition
- Clean markers using `setParameters()` — no text visible on marker shield
- Confidence indicator with 30 Whiplash-themed analysis phrases
- Bilingual UI: Portuguese (pt-BR) and English, auto-detected from system locale
- One-click installer (`instalar.bat`) for Windows / After Effects 2026
