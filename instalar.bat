@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

:: ── BeatMarker AE — Instalador ───────────────────────────────────────────────
:: Detecta idioma do sistema
for /f "tokens=3" %%a in ('reg query "HKCU\Control Panel\International" /v LocaleName 2^>nul') do set LOCALE=%%a
echo %LOCALE% | findstr /i "^pt" >nul && set PT=1 || set PT=0

if %PT%==1 (
  echo.
  echo  ╔══════════════════════════════════════╗
  echo  ║      BeatMarker AE — Instalador      ║
  echo  ╚══════════════════════════════════════╝
  echo.
  echo  Este instalador vai:
  echo   1. Copiar o plugin para o After Effects 2026
  echo   2. Habilitar suporte a extensoes no AE
  echo.
  echo  IMPORTANTE: Execute como Administrador.
  echo.
) else (
  echo.
  echo  ╔══════════════════════════════════════╗
  echo  ║      BeatMarker AE — Installer       ║
  echo  ╚══════════════════════════════════════╝
  echo.
  echo  This installer will:
  echo   1. Copy the plugin to After Effects 2026
  echo   2. Enable extension support in AE
  echo.
  echo  IMPORTANT: Run as Administrator.
  echo.
)

:: Verificar se rodando como admin
net session >nul 2>&1
if %errorLevel% neq 0 (
  if %PT%==1 (
    echo  ERRO: Execute este arquivo como Administrador.
    echo  Clique com botao direito ^> Executar como administrador.
  ) else (
    echo  ERROR: Please run this file as Administrator.
    echo  Right-click ^> Run as administrator.
  )
  echo.
  pause
  exit /b 1
)

:: Verificar se o AE 2026 existe
set AE_PATH=C:\Program Files\Adobe\Adobe After Effects 2026\Support Files
if not exist "%AE_PATH%" (
  if %PT%==1 (
    echo  ERRO: After Effects 2026 nao encontrado em:
    echo  %AE_PATH%
    echo.
    echo  Verifique se o AE 2026 esta instalado.
  ) else (
    echo  ERROR: After Effects 2026 not found at:
    echo  %AE_PATH%
    echo.
    echo  Please verify that AE 2026 is installed.
  )
  echo.
  pause
  exit /b 1
)

:: Copiar arquivos do plugin
set DEST=%AE_PATH%\BeatMarkerAE
if %PT%==1 (echo  Copiando arquivos...) else (echo  Copying files...)

if exist "%DEST%" rmdir /S /Q "%DEST%"
mkdir "%DEST%"

xcopy /E /I /Y "%~dp0CSXS"              "%DEST%\CSXS\"              >nul
xcopy /E /I /Y "%~dp0jsx"               "%DEST%\jsx\"               >nul
xcopy /E /I /Y "%~dp0lib"               "%DEST%\lib\"               >nul
copy  /Y        "%~dp0index.html"        "%DEST%\index.html"         >nul
copy  /Y        "%~dp0main.js"           "%DEST%\main.js"            >nul
copy  /Y        "%~dp0analysis-bundle.js" "%DEST%\analysis-bundle.js" >nul

if %errorLevel% neq 0 (
  if %PT%==1 (echo  ERRO ao copiar arquivos.) else (echo  ERROR copying files.)
  pause
  exit /b 1
)

:: Habilitar extensoes nao assinadas
if %PT%==1 (echo  Configurando registro...) else (echo  Configuring registry...)

reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul

:: Sucesso
echo.
if %PT%==1 (
  echo  ✓ BeatMarker AE instalado com sucesso!
  echo.
  echo  Reinicie o After Effects e acesse:
  echo  Window ^> Extensions ^> BeatMarker AE
) else (
  echo  ✓ BeatMarker AE installed successfully!
  echo.
  echo  Restart After Effects and go to:
  echo  Window ^> Extensions ^> BeatMarker AE
)
echo.
pause
