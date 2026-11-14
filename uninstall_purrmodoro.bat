@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Removendo atalhos do PurrModoro...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install_shortcuts.ps1" -ProjectRoot "%~dp0." -Uninstall
echo Atalhos removidos! (Seu save em AppData\Roaming\purrmodoro foi preservado.)
if /I not "%~1"=="--quiet" pause
