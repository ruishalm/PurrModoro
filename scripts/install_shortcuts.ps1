param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRoot,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $ProjectRoot).Path.TrimEnd('\')
$vbsPath = Join-Path $root 'launch_silent.vbs'
$icoPath = Join-Path $root 'public\assets\ui\tray_icon.ico'

$desktopDir = [Environment]::GetFolderPath('Desktop')
$programsDir = [Environment]::GetFolderPath('Programs')

$targets = @(
  (Join-Path $desktopDir 'PurrModoro.lnk'),
  (Join-Path $programsDir 'PurrModoro.lnk')
)

if ($Uninstall) {
  foreach ($lnk in $targets) {
    if (Test-Path $lnk) {
      Remove-Item $lnk -Force
      Write-Host "Atalho removido: $lnk"
    }
  }
  exit 0
}

$wsh = New-Object -ComObject WScript.Shell
$wscriptExe = Join-Path $env:SystemRoot 'System32\wscript.exe'

foreach ($lnk in $targets) {
  $parentDir = Split-Path $lnk -Parent
  if (-not (Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
  }
  $shortcut = $wsh.CreateShortcut($lnk)
  $shortcut.TargetPath = $wscriptExe
  $shortcut.Arguments = "//B `"$vbsPath`""
  $shortcut.WorkingDirectory = $root
  $shortcut.Description = 'PurrModoro — Gatinho de Foco & Timer Pomodoro'
  if (Test-Path $icoPath) {
    $shortcut.IconLocation = "$icoPath,0"
  }
  $shortcut.Save()
  Write-Host "Atalho criado: $lnk"
}
