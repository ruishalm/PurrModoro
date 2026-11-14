@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
if not exist "node_modules\electron\dist\electron.exe" (
  echo Instalando dependencias do PurrModoro pela primeira vez...
  call npm install
)
if exist "node_modules\electron\dist\electron.exe" (
  wscript.exe //B "%~dp0launch_silent.vbs"
) else (
  echo Electron indisponivel; iniciando modo navegador local...
  start "" http://127.0.0.1:4173/
  python -m http.server 4173 --directory public
)
