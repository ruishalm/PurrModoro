const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const COMPACT_SIZE = { width: 396, height: 172 };
const COMPACT_COLLAPSED_SIZE = { width: 242, height: 158 };
const EXPANDED_SIZE = { width: 1120, height: 740 };

let mainWindow = null;
let tray = null;
let currentMode = 'compact';
let compactCollapsed = false;
let alwaysOnTop = true;
let openAtLogin = true;
let trayBalloonShown = false;
let isQuitting = false;

function getSaveFilePath() {
  return path.join(app.getPath('userData'), 'purrmodoro-save.json');
}

function getPrefsFilePath() {
  return path.join(app.getPath('userData'), 'purrmodoro-prefs.json');
}

function getStartupShortcutPath() {
  return path.join(
    app.getPath('appData'),
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Startup',
    'PurrModoro.lnk'
  );
}

function applyAutoLaunch(enabled) {
  openAtLogin = Boolean(enabled);
  if (process.platform === 'win32') {
    const startupLnk = getStartupShortcutPath();
    try {
      if (app.isPackaged) {
        app.setLoginItemSettings({ openAtLogin, path: process.execPath });
        if (!openAtLogin && fs.existsSync(startupLnk)) {
          fs.unlinkSync(startupLnk);
        }
      } else {
        app.setLoginItemSettings({ openAtLogin: false });
        if (openAtLogin) {
          const wscriptExe = path.join(
            process.env.SystemRoot || 'C:\\Windows',
            'System32',
            'wscript.exe'
          );
          const vbsPath = path.join(__dirname, 'launch_silent.vbs');
          shell.writeShortcutLink(startupLnk, 'create', {
            target: wscriptExe,
            args: `//B "${vbsPath}"`,
            cwd: __dirname,
            description: 'PurrModoro — Gatinho de Foco & Timer Pomodoro',
            icon: getIconPath(),
            iconIndex: 0,
          });
        } else if (fs.existsSync(startupLnk)) {
          fs.unlinkSync(startupLnk);
        }
      }
    } catch (err) {
      console.warn('Aviso ao configurar inicialização com o Windows:', err.message);
    }
  }
  try {
    const prefsPath = getPrefsFilePath();
    fs.mkdirSync(path.dirname(prefsPath), { recursive: true });
    fs.writeFileSync(prefsPath, JSON.stringify({ openAtLogin }, null, 2), 'utf-8');
  } catch {
    // ignora falha de gravação de preferência
  }
  if (tray) tray.setContextMenu(buildTrayMenu());
}

function initAutoLaunchOnStartup() {
  const prefsPath = getPrefsFilePath();
  let desired = true; // Padrão em toda instalação nova: iniciar com o Windows
  try {
    if (fs.existsSync(prefsPath)) {
      const parsed = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
      if (typeof parsed?.openAtLogin === 'boolean') {
        desired = parsed.openAtLogin;
      }
    }
  } catch {
    desired = true;
  }
  applyAutoLaunch(desired);
}

function hideWindowToTray() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.hide();
  if (tray && !trayBalloonShown) {
    trayBalloonShown = true;
    try {
      tray.displayBalloon({
        iconType: 'info',
        title: 'PurrModoro recolhido na bandeja! 🐾',
        content: 'O timer continua rodando. Clique no ícone perto do relógio para abrir.',
      });
    } catch {
      // displayBalloon não suportado em alguns ambientes
    }
  }
  if (tray) tray.setContextMenu(buildTrayMenu());
}

function getWorkAreaAnchoredBounds(mode) {
  const display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  const target =
    mode === 'expanded'
      ? EXPANDED_SIZE
      : compactCollapsed
        ? COMPACT_COLLAPSED_SIZE
        : COMPACT_SIZE;
  const minW = Math.min(target.width, 220);
  const minH = Math.min(target.height, 140);
  const width = Math.min(target.width, Math.max(minW, wa.width - 20));
  const height = Math.min(target.height, Math.max(minH, wa.height - 20));

  const marginRight = mode === 'expanded' ? 16 : 8;
  const marginBottom = mode === 'expanded' ? 16 : 2;

  return {
    x: Math.round(wa.x + wa.width - width - marginRight),
    y: Math.round(wa.y + wa.height - height - marginBottom),
    width,
    height,
  };
}

function applyMode(mode) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  currentMode = mode === 'expanded' ? 'expanded' : 'compact';
  const bounds = getWorkAreaAnchoredBounds(currentMode);

  mainWindow.setResizable(true);
  mainWindow.setBounds(bounds, false);
  mainWindow.setResizable(false);
  mainWindow.setAlwaysOnTop(alwaysOnTop, 'screen-saver');

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  if (currentMode === 'expanded') {
    mainWindow.focus();
  }
  mainWindow.webContents.send('mode-changed', currentMode);
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: '🐾 Modo Relógio (Compacto)',
      click: () => applyMode('compact'),
    },
    {
      label: '🏠 Abrir Quartinho & Lojinha',
      click: () => applyMode('expanded'),
    },
    { type: 'separator' },
    {
      label: '⏯️ Iniciar / Pausar Timer',
      click: () => mainWindow?.webContents.send('tray-action', 'toggle-timer'),
    },
    {
      label: '📍 Voltar p/ Perto do Relógio',
      click: () => {
        const bounds = getWorkAreaAnchoredBounds(currentMode);
        mainWindow?.setBounds(bounds, false);
        mainWindow?.show();
      },
    },
    {
      label: '📥 Recolher para a Bandeja',
      click: () => hideWindowToTray(),
    },
    { type: 'separator' },
    {
      label: '📌 Sempre no Topo',
      type: 'checkbox',
      checked: alwaysOnTop,
      click: (item) => {
        alwaysOnTop = item.checked;
        mainWindow?.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
        mainWindow?.webContents.send('tray-action', { type: 'always-on-top', value: alwaysOnTop });
      },
    },
    {
      label: '🚀 Iniciar com o Windows',
      type: 'checkbox',
      checked: openAtLogin,
      click: (item) => applyAutoLaunch(item.checked),
    },
    { type: 'separator' },
    {
      label: '🚪 Sair do PurrModoro',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function getIconPath() {
  const filename = process.platform === 'win32' ? 'tray_icon.ico' : 'tray_icon.png';
  return path.join(__dirname, 'public', 'assets', 'ui', filename);
}

function createTray() {
  try {
    const icon = nativeImage.createFromPath(getIconPath());
    tray = new Tray(icon);
    tray.setToolTip('PurrModoro — Seu Gatinho de Foco');
    tray.setContextMenu(buildTrayMenu());
    tray.on('click', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (!mainWindow.isVisible()) {
        applyMode(currentMode);
        return;
      }
      applyMode(currentMode === 'compact' ? 'expanded' : 'compact');
    });
  } catch (err) {
    console.warn('Tray indisponível neste ambiente:', err.message);
  }
}

function createWindow() {
  const bounds = getWorkAreaAnchoredBounds('compact');
  mainWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: false,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideWindowToTray();
    }
  });
}

function registerIpc() {
  ipcMain.handle('set-mode', (_event, mode) => {
    applyMode(mode);
    return currentMode;
  });

  ipcMain.handle('set-compact-collapsed', (_event, collapsed) => {
    compactCollapsed = Boolean(collapsed);
    if (!mainWindow || mainWindow.isDestroyed() || currentMode !== 'compact') {
      return compactCollapsed;
    }
    const oldBounds = mainWindow.getBounds();
    const target = compactCollapsed ? COMPACT_COLLAPSED_SIZE : COMPACT_SIZE;
    const display = screen.getDisplayMatching(oldBounds);
    const wa = display.workArea;

    const width = Math.min(target.width, Math.max(220, wa.width - 20));
    const height = Math.min(target.height, Math.max(140, wa.height - 20));

    // Mantém borda direita/inferior alinhada perto de onde estava (relógio ou drag atual)
    const right = oldBounds.x + oldBounds.width;
    const bottom = oldBounds.y + oldBounds.height;
    const x = Math.max(wa.x, Math.min(wa.x + wa.width - width, right - width));
    const y = Math.max(wa.y, Math.min(wa.y + wa.height - height, bottom - height));

    mainWindow.setResizable(true);
    mainWindow.setBounds({ x: Math.round(x), y: Math.round(y), width, height }, false);
    mainWindow.setResizable(false);
    return compactCollapsed;
  });

  ipcMain.handle('snap-to-clock', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    const bounds = getWorkAreaAnchoredBounds(currentMode);
    mainWindow.setBounds(bounds, false);
    return true;
  });

  ipcMain.handle('set-always-on-top', (_event, flag) => {
    alwaysOnTop = Boolean(flag);
    mainWindow?.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
    if (tray) tray.setContextMenu(buildTrayMenu());
    return alwaysOnTop;
  });

  ipcMain.handle('get-always-on-top', () => alwaysOnTop);

  ipcMain.handle('load-state', () => {
    const savePath = getSaveFilePath();
    try {
      if (fs.existsSync(savePath)) {
        const raw = fs.readFileSync(savePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Erro ao ler save:', err);
    }
    return null;
  });

  ipcMain.handle('save-state', (_event, state) => {
    const savePath = getSaveFilePath();
    try {
      fs.mkdirSync(path.dirname(savePath), { recursive: true });
      const tmpPath = `${savePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
      fs.renameSync(tmpPath, savePath);
      return true;
    } catch (err) {
      console.error('Erro ao salvar estado:', err);
      return false;
    }
  });

  ipcMain.handle('hide-to-tray', () => {
    hideWindowToTray();
    return true;
  });

  ipcMain.handle('quit-app', () => {
    isQuitting = true;
    app.quit();
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    initAutoLaunchOnStartup();
    registerIpc();
    createWindow();
    createTray();
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

