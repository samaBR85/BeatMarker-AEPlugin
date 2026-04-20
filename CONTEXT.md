# Context — BeatMarker AE

Development context, lessons learned, and decisions that are not obvious from the code.

---

## Why CEP and not UXP?

UXP is Adobe's modern extension platform, but After Effects 2026 UXP support for panels requires a JavaScript interpreter layer that makes audio processing impractical. CEP runs a full Chromium/Node.js environment, allowing direct use of Web Audio APIs and existing JS audio analysis libraries.

---

## CEP Install Path Discovery (AE 2026)

AE 2026 does **not** read from the standard CEP extension paths:
- `%APPDATA%\Adobe\CEP\extensions\` ✗
- `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\` ✗

It reads from:
- `C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\<folder>\` ✓

This was found by locating `com.adobe.LABOR.LearningPanel`, a working extension bundled with AE 2026, and reverse-engineering its manifest format.

---

## Manifest Format (AE 2026)

Critical differences from generic CEP examples:

```xml
ExtensionManifest Version="7.0"          <!-- not 6.0 or 12.0 -->
Host Version="[22,99.9]"                 <!-- no decimal on minimum -->
RequiredRuntime Name="CSXS" Version="11.0"  <!-- not 12.0 -->
```

CEFCommandLine flags required:
```
--allow-file-access
--allow-file-access-from-files
--enable-nodejs
--mixed-context
```

---

## Marker Text Suppression

After Effects `MarkerValue` fields and their timeline visibility:

| Field         | Visible on shield |
|---------------|-------------------|
| `comment`     | Yes               |
| `chapter`     | Yes               |
| `url`         | Yes               |
| `frameTarget` | Yes               |
| `setParameters()` | **No** ✓     |

The solution is to store beat tracking data in `setParameters({ b: '<beatPos>' })` and leave all text fields empty. This was the only confirmed method to produce color-only markers with no visible text.

---

## Phase Shift and Waveform Flicker

Early implementation used full clear+recreate on every phase shift, causing AE to redraw the audio waveform for each `removeKey`/`setValueAtTime` call — visible as flicker with 300+ markers.

Solution: differential update. Only markers that change state (active↔inactive) are removed/added. Markers that remain active are updated in-place with `setValueAtKey()`, which does not trigger a waveform redraw.

A secondary requirement: beats 2 and 4 must use **different** AE label indices (not both label 8/Blue), otherwise the phase shift algorithm cannot distinguish them during recolor. Beat 4 uses label 3 (Aqua) instead.

---

## Audio File Reading

`cep.fs.readFile` returns Base64. The string must have whitespace stripped before `atob()`:

```js
const bin = atob(result.data.replace(/\s+/g, ''));
```

Without this, `atob()` throws `InvalidCharacterError` on the newlines embedded in the Base64 string.

---

## evalScript Double-Stringify

ExtendScript functions are called via `cs.evalScript(callString, callback)`. Arguments must be passed as a JSON string literal inside the call string:

```js
`${fn}(${JSON.stringify(JSON.stringify(arg))})`
```

The outer `JSON.stringify` produces a quoted string that ExtendScript receives as a string literal. The inner `JSON.stringify` is the actual payload that `JSON.parse()` unpacks inside ExtendScript.

---

## ExtendScript JSON Polyfill

ExtendScript (ES3) may have a `JSON` object without `JSON.parse`. The polyfill must check for the method specifically:

```jsx
if (typeof JSON.parse === 'undefined') {
  JSON.parse = function(s) { return eval('(' + s + ')'); };
}
```

Checking only `typeof JSON === 'undefined'` is insufficient.
