# Installation Guide — BeatMarker AE

## Requirements

- Adobe After Effects 2026 (v26.x) on Windows
- Administrator rights (required to copy files to Program Files)

---

## Automatic Installation (Recommended)

1. Download and extract `BeatMarkerAE.zip`
2. Right-click `install.bat`
3. Select **Run as Administrator**
4. Follow the on-screen instructions
5. **Restart After Effects**
6. Open the panel via **Window → Extensions → BeatMarker AE**

The installer will:
- Copy the plugin files to the correct After Effects folder
- Configure the Windows registry to allow unsigned CEP extensions

---

## Manual Installation

If you prefer to install manually:

### 1. Copy the plugin folder

Copy the entire plugin folder to:

```
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\BeatMarkerAE\
```

The folder must contain:
```
BeatMarkerAE/
  CSXS/
    manifest.xml
  jsx/
    hostscript.jsx
  lib/
    CSInterface.js
  index.html
  main.js
  analysis-bundle.js
```

### 2. Enable unsigned extensions

Open **Command Prompt as Administrator** and run:

```cmd
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f
```

### 3. Restart After Effects

Open the panel via **Window → Extensions → BeatMarker AE**.

---

## Uninstalling

Delete the folder:
```
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\BeatMarkerAE\
```

To remove the registry keys:
```cmd
reg delete "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.12" /v PlayerDebugMode /f
reg delete "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.13" /v PlayerDebugMode /f
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Adobe\CSXS.12" /v PlayerDebugMode /f
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Adobe\CSXS.13" /v PlayerDebugMode /f
```

---

## Troubleshooting

**Panel doesn't appear in Window → Extensions**
- Make sure you ran `install.bat` as Administrator
- Make sure After Effects was fully closed and reopened after installation
- Verify the folder exists at `Support Files\BeatMarkerAE\`

**"Error reading file" when analyzing**
- Make sure the audio layer has a linked file (not a pre-comp or solid)
- Supported formats: WAV, MP3

**Phase buttons do nothing after reopening AE**
- This is expected — the beat data is in memory only during the session. Re-analyze the layer, then use the phase buttons.
