@echo off
set LINK=C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\BeatMarkerAE
set TARGET=D:\Claude Code\BeatMarker for AE\install\BeatMarkerAE

rmdir "%LINK%"
mklink /D "%LINK%" "%TARGET%"

echo.
echo Symlink atualizado:
echo %LINK% -^> %TARGET%
echo.
pause
