# Spec — BeatMarker AE

Technical specification and design decisions.

---

## Architecture

BeatMarker AE is a **CEP (Common Extensibility Platform)** panel for Adobe After Effects.

```
Browser context (Chromium/CEF)          Host context (After Effects)
─────────────────────────────           ──────────────────────────────
index.html                              jsx/hostscript.jsx
main.js          ─── evalScript() ───►  bmGetAudioLayerInfo()
analysis-bundle.js                      bmCreateMarkers()
                 ◄── JSON string ───    bmAdjustPhase()
                                        bmClearMarkers()
```

- **`main.js`** — UI logic, i18n, beat analysis orchestration, state management
- **`analysis-bundle.js`** — pre-compiled WAV/MP3 decoder + beat detection (BPM analysis)
- **`jsx/hostscript.jsx`** — ExtendScript API bridge to After Effects
- **`lib/CSInterface.js`** — Adobe's CEP bridge library

---

## Marker System

### Storage format

Markers use `MarkerValue.setParameters({ b: '<beatPos>' })` to store the beat position (1–4) invisibly. No text fields (`comment`, `frameTarget`, `chapter`, `url`) are used, so the timeline marker shield shows color only.

### Label colors

| Beat | Position | AE Label Index | Color |
|------|----------|---------------|-------|
| 1    | Downbeat | 1             | Red   |
| 2    | —        | 8             | Blue  |
| 3    | Backbeat | 2             | Yellow|
| 4    | —        | 3             | Aqua  |

Each beat has a unique label index — required for the phase shift algorithm to work correctly.

### Marker targets

- **Layer markers** (`layer.property('Marker')`) — appear on the audio layer track
- **Composition markers** (`comp.markerProperty`) — appear on the composition bar, do not interfere with layer dragging

Both targets apply `layer.startTime` as a time offset so markers always align to the layer's position in the composition.

---

## Phase Shift Algorithm

Phase shift uses a **differential update** to minimize After Effects timeline redraws:

1. Compute which beats change from active→inactive (remove) and inactive→active (add)
2. Beats that remain active are updated in-place via `setValueAtKey()` (label change only, no timeline redraw)
3. Only the changed beats are removed/added

For a shift of ±1 step with N total beats and M active beats, this reduces operations from `2N` (full clear+recreate) to approximately `N/2` — eliminating most waveform flicker.

---

## Beat Detection

Audio is read via `cep.fs.readFile` in Base64, decoded in the browser, and passed to `analyzeAudio()` from `analysis-bundle.js`.

Confidence scoring uses the **Coefficient of Variation (CV)** of beat intervals:

```
CV = stddev(intervals) / mean(intervals)
confidence = clamp(0, 100, round((1 - CV × 4) × 100))
```

| Confidence | Level  | Threshold |
|------------|--------|-----------|
| > 85%      | High   | Green     |
| 60–85%     | Medium | Yellow    |
| < 60%      | Low    | Red       |

---

## i18n

Language is detected via `navigator.language.startsWith('pt')` at load time. All UI strings are defined in the `S` object in `main.js`. Confidence phrases include `subtitlePT` and `subtitleEN` fields. The HTML shell contains no hardcoded text.

---

## CEP Installation Path (AE 2026)

After Effects 2026 loads CEP extensions from:

```
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\<folder-name>\
```

Standard CEP paths (`%APPDATA%\Adobe\CEP\extensions\`) are **not** used by AE 2026. This was discovered by comparing with the bundled `com.adobe.LABOR.LearningPanel` extension.

Unsigned extensions require `PlayerDebugMode = 1` in `HKCU\SOFTWARE\Adobe\CSXS.12` and `CSXS.13`.
