@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

:: BeatMarker AE - Instalador
for /f "tokens=3" %%a in ('reg query "HKCU\Control Panel\International" /v LocaleName 2^>nul') do set LOCALE=%%a
echo %LOCALE% | findstr /i "^pt" >nul && set PT=1 || set PT=0

if %PT%==1 (
  echo.
  echo  =========================================
  echo       BeatMarker AE - Instalador
  echo  =========================================
  echo.
  echo  Este instalador vai:
  echo   1. Copiar o plugin para o After Effects 2026
  echo   2. Habilitar suporte a extensoes no AE
  echo.
  echo  IMPORTANTE: Execute como Administrador.
  echo.
) else (
  echo.
  echo  =========================================
  echo       BeatMarker AE - Installer
  echo  =========================================
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

:: Detectar caminho do AE 2026 via registro
set AE_PATH=
for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Adobe\After Effects\26.0" /v "InstallPath" 2^>nul') do set AE_PATH=%%b
if not defined AE_PATH (
  for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\WOW6432Node\Adobe\After Effects\26.0" /v "InstallPath" 2^>nul') do set AE_PATH=%%b
)

:: Fallback: caminho padrao
if not defined AE_PATH (
  set AE_PATH=C:\Program Files\Adobe\Adobe After Effects 2026
)

:: Remover barra final se houver
if "%AE_PATH:~-1%"=="\" set AE_PATH=%AE_PATH:~0,-1%

set AE_PATH=%AE_PATH%\Support Files

:: Verificar se o caminho existe
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

if %PT%==1 (echo  AE encontrado em: %AE_PATH%) else (echo  AE found at: %AE_PATH%)

:: Copiar arquivos do plugin
set DEST=%AE_PATH%\BeatMarkerAE
if %PT%==1 (echo  Copiando arquivos...) else (echo  Copying files...)

if exist "%DEST%" rd /Q "%DEST%"
mkdir "%DEST%"

set SRC=%~dp0install\BeatMarkerAE
xcopy /E /I /Y "%SRC%\CSXS"               "%DEST%\CSXS\"               >nul
xcopy /E /I /Y "%SRC%\jsx"                "%DEST%\jsx\"                >nul
xcopy /E /I /Y "%SRC%\lib"                "%DEST%\lib\"                >nul
copy  /Y        "%SRC%\index.html"         "%DEST%\index.html"          >nul
copy  /Y        "%SRC%\main.js"            "%DEST%\main.js"             >nul
copy  /Y        "%SRC%\analysis-bundle.js" "%DEST%\analysis-bundle.js"  >nul

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
  echo  BeatMarker AE instalado com sucesso!
  echo.
  echo  Reinicie o After Effects e acesse:
  echo  Window ^> Extensions ^> BeatMarker AE
) else (
  echo  BeatMarker AE installed successfully!
  echo.
  echo  Restart After Effects and go to:
  echo  Window ^> Extensions ^> BeatMarker AE
)
echo.
pause
