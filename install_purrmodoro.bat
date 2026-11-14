@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=

echo.
echo ===================================================
echo   PurrModoro - Instalador Simples para Windows
echo ===================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado neste PC.
  echo Baixe e instale em: https://nodejs.org/
  if /I not "%~1"=="--no-launch" pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo [1/2] Instalando dependencias do PurrModoro ^(Electron^)...
  call npm install
  if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias via npm install.
    if /I not "%~1"=="--no-launch" pause
    exit /b 1
  )
) else (
  echo [1/2] Electron ja instalado. Pulando download!
)

echo [2/2] Criando atalhos na Area de Trabalho, Menu Iniciar e Inicializar com o Windows...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install_shortcuts.ps1" -ProjectRoot "%~dp0."
if errorlevel 1 (
  echo [ERRO] Falha ao criar atalhos do Windows.
  if /I not "%~1"=="--no-launch" pause
  exit /b 1
)

echo.
echo [OK] PurrModoro instalado com sucesso!
echo      Voce ja pode abrir pelo icone "PurrModoro" na Area de Trabalho ou Menu Iniciar.
echo.

if /I "%~1"=="--no-launch" exit /b 0

echo Abrindo o PurrModoro perto do relogio do Windows...
wscript.exe //B "%~dp0launch_silent.vbs"
timeout /t 2 >nul
