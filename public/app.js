/* ============================================================================
   PurrModoro — Idle Game & Timer Pomodoro Regulável
   ============================================================================ */

const SAVE_KEY = 'purrmodoro_save_v1';

const SPEECH_PHRASES = {
  focus: [
    'Foco total! 🐾',
    'Prrr... trabalhando juntos!',
    'Você consegue! ✨',
    'Sem distrações, miau!',
    'Mais um pouquinho! 🍅',
  ],
  break: [
    'Hora de esticar as patinhas!',
    'Bebe uma aguinha 💧',
    'Descanso merecido, prrr~',
    'Que tal um cafezinho? ☕',
  ],
  cheer: [
    'MIAU!! Conseguiu!! 🎉',
    'Moedinhas novas! 🪙✨',
    'Orgulho de você! 🐾',
  ],
  cry: [
    'Miau... não desiste! 😿',
    'Poxa... vamos tentar de novo?',
  ],
  pet: [
    'Prrrrr... ❤️',
    'Miau~ que carinho bom!',
    'Ronronando feliz! 🐾',
    'Te amo humano! 💖',
  ],
};

const DEFAULT_STATE = {
  coins: 100,
  unlockedCats: ['cat_mochi'],
  activeCat: 'cat_mochi',
  unlockedPets: [],
  activePets: [],
  ownedItems: {
    plant_mini: 1,
    bowl_water_blue: 1,
  },
  placedItems: [
    { uid: 'starter-plant', itemId: 'plant_mini', x: 68, y: 60, flip: false, z: 60 },
    { uid: 'starter-bowl', itemId: 'bowl_water_blue', x: 34, y: 68, flip: false, z: 68 },
  ],
  roomTheme: 'cozy',
  compactCollapsed: false,
  isometricMigratedV2: true,
  timerConfig: {
    focusMin: 25,
    shortMin: 5,
    longMin: 15,
    cyclesBeforeLong: 4,
  },
  activeBuff: null,
  stats: {
    cyclesCompleted: 0,
    totalFocusMinutes: 0,
  },
  muted: false,
};

// Lado nativo da arte isométrica para itens de parede
const WALL_NATIVE_SIDE = {
  window_cream: 'right',
  window_cocoa: 'right',
  window_grey: 'right',
  window_oak: 'right',
  art_plant: 'right',
  art_cat_portrait: 'right',
  art_heart_grey: 'right',
  art_stripes: 'left',
  art_abstract: 'left',
  art_dog_golden: 'flat',
};

let catalog = { items: [], cats: [], pets: [] };
let state = structuredClone(DEFAULT_STATE);
let appMode = 'compact'; // 'compact' | 'expanded'
let shopCategory = 'furniture';
let shopSubFilter = 'all';
let selectedPlacedUid = null;
let dragState = null;

// Estado do Timer
const timer = {
  phase: 'focus', // 'focus' | 'shortBreak' | 'longBreak'
  totalSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  running: false,
  intervalId: null,
  cyclesInRound: 0,
};

// Estado de Humor / Animação do Gato
let petMood = 'normal'; // 'normal' | 'cheer' | 'cry' | 'eat'
let petMoodTimeout = null;

// Cache de imagens & atores animados
const imageCache = new Map();
const roomActors = []; // { id, kind, x, y, targetX, targetY, dir, state, timer, el, canvas, speechEl, config }
const compactPet = {
  x: 55,
  targetX: 85,
  dir: 1,
  behavior: 'idle', // 'idle' | 'walk' | 'sleep'
  behaviorTimer: 4.0,
};

/* ============================================================================
   UTILITÁRIOS & PERSISTÊNCIA
   ============================================================================ */

function getCatalogItem(id) {
  return (
    catalog.items.find((i) => i.id === id) ||
    catalog.cats.find((c) => c.id === id) ||
    catalog.pets.find((p) => p.id === id) ||
    null
  );
}

function getCatDef(id) {
  return catalog.cats.find((c) => c.id === id) || catalog.cats[0];
}

function getPetDef(id) {
  return catalog.pets.find((p) => p.id === id);
}

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return img;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

async function loadState() {
  let saved = null;
  if (window.purrAPI?.loadState) {
    try {
      saved = await window.purrAPI.loadState();
    } catch {
      saved = null;
    }
  }
  if (!saved) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      saved = null;
    }
  }
  if (saved && typeof saved === 'object') {
    state = {
      ...structuredClone(DEFAULT_STATE),
      ...saved,
      compactCollapsed: Boolean(saved.compactCollapsed),
      isometricMigratedV2: Boolean(saved.isometricMigratedV2),
      timerConfig: { ...DEFAULT_STATE.timerConfig, ...(saved.timerConfig || {}) },
      stats: { ...DEFAULT_STATE.stats, ...(saved.stats || {}) },
      ownedItems: saved.ownedItems || { ...DEFAULT_STATE.ownedItems },
      placedItems: Array.isArray(saved.placedItems) ? saved.placedItems : [...DEFAULT_STATE.placedItems],
    };
  }
}

let saveDebounce = null;
function saveState(immediate = false) {
  const persist = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota
    }
    if (window.purrAPI?.saveState) {
      window.purrAPI.saveState(state).catch(() => {});
    }
  };

  if (immediate) {
    clearTimeout(saveDebounce);
    persist();
    return;
  }
  clearTimeout(saveDebounce);
  saveDebounce = setTimeout(persist, 250);
}

/* ============================================================================
   RENDERIZADOR DE SPRITE EM CANVAS (PIXEL-PERFECT)
   ============================================================================ */

function drawSpriteSheetFrame(canvas, src, fw, fh, frameIndex, flip = false) {
  const img = loadImage(src);
  if (!img.complete || img.naturalWidth === 0) return;

  const ctx = canvas.getContext('2d');
  const totalCols = Math.max(1, Math.floor(img.naturalWidth / fw));
  const col = ((frameIndex % totalCols) + totalCols) % totalCols;
  const sx = col * fw;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const scale = Math.min(canvas.width / fw, canvas.height / fh);
  const intScale = scale >= 1 ? Math.floor(scale) : scale;
  const dw = Math.round(fw * intScale);
  const dh = Math.round(fh * intScale);
  const dx = Math.round((canvas.width - dw) / 2);
  const dy = canvas.height - dh;

  ctx.save();
  if (flip) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, sx, 0, fw, fh, dx, dy, dw, dh);
  ctx.restore();
}

function getCatAnimationForState(catDef, moodOrBehavior) {
  const anims = catDef.animations || {};
  if (moodOrBehavior === 'cheer' && anims.cheer) return anims.cheer;
  if (moodOrBehavior === 'cry' && anims.cry) return anims.cry;
  if (moodOrBehavior === 'sleep' && anims.sleep) return anims.sleep;
  return anims.idle || Object.values(anims)[0];
}

/* ============================================================================
   MODO DUPLO (COMPACTO PERTO DO RELÓGIO VS EXPANDIDO)
   ============================================================================ */

async function setAppMode(mode) {
  appMode = mode === 'expanded' ? 'expanded' : 'compact';
  document.body.classList.toggle('mode-compact', appMode === 'compact');
  document.body.classList.toggle('mode-expanded', appMode === 'expanded');

  const compactEl = document.getElementById('compactView');
  const expandedEl = document.getElementById('expandedView');

  if (appMode === 'expanded') {
    compactEl.classList.add('hidden');
    expandedEl.classList.remove('hidden');
    renderRoom();
    syncRoomActors();
    renderShop();
    renderInventory();
  } else {
    expandedEl.classList.add('hidden');
    compactEl.classList.remove('hidden');
    selectPlacedItem(null);
  }

  if (window.purrAPI?.setMode) {
    await window.purrAPI.setMode(appMode);
  }
}

async function setCompactCollapsed(collapsed, syncElectron = true) {
  state.compactCollapsed = Boolean(collapsed);
  const compactView = document.getElementById('compactView');
  const miniPill = document.getElementById('compactMiniPill');
  compactView.classList.toggle('collapsed', state.compactCollapsed);
  miniPill.classList.toggle('hidden', !state.compactCollapsed);
  saveState();

  if (syncElectron && window.purrAPI?.setCompactCollapsed) {
    await window.purrAPI.setCompactCollapsed(state.compactCollapsed);
  }
}

/* ============================================================================
   MOTOR DO TIMER POMODORO REGULÁVEL
   ============================================================================ */

function getDurationMinutesForPhase(phase) {
  const cfg = state.timerConfig;
  if (phase === 'shortBreak') return clamp(Number(cfg.shortMin) || 5, 1, 60);
  if (phase === 'longBreak') return clamp(Number(cfg.longMin) || 15, 1, 90);
  return clamp(Number(cfg.focusMin) || 25, 1, 180);
}

function getTimerTaskMinutes() {
  return Math.max(1, Math.round(timer.totalSeconds / 60));
}

function computeRewardPreview() {
  const mins = getTimerTaskMinutes();
  if (timer.phase === 'focus') {
    const deepBonus =
      mins >= 45 ? Math.round(mins * 0.4) : mins >= 25 ? Math.round(mins * 0.2) : 0;
    const base = mins * 2 + deepBonus;
    const mult = state.activeBuff?.multiplier || 1;
    return Math.round(base * mult);
  }
  if (timer.phase === 'longBreak') {
    return Math.max(2, Math.round(mins * 1.2));
  }
  return Math.max(1, mins);
}

function formatMMSS(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function setPhase(phase, autoReset = true) {
  if (timer.running) {
    pauseTimer();
  }
  timer.phase = phase;

  if (autoReset) {
    const mins = getDurationMinutesForPhase(phase);
    timer.totalSeconds = mins * 60;
    timer.remainingSeconds = timer.totalSeconds;
  }
  updateTimerUI();
}

function adjustCurrentMinutes(deltaMin) {
  window.purrSound.playClick();
  const deltaSec = deltaMin * 60;
  const newRemaining = clamp(timer.remainingSeconds + deltaSec, 60, 180 * 60);
  const diff = newRemaining - timer.remainingSeconds;
  timer.remainingSeconds = newRemaining;
  timer.totalSeconds = Math.max(timer.remainingSeconds, timer.totalSeconds + diff);

  // Se ainda não começou o ciclo, atualiza também a duração padrão dessa fase para conveniência
  if (!timer.running && Math.abs(timer.totalSeconds - timer.remainingSeconds) < 2) {
    const mins = Math.round(timer.remainingSeconds / 60);
    if (timer.phase === 'focus') state.timerConfig.focusMin = clamp(mins, 1, 180);
    if (timer.phase === 'shortBreak') state.timerConfig.shortMin = clamp(mins, 1, 60);
    if (timer.phase === 'longBreak') state.timerConfig.longMin = clamp(mins, 1, 90);
    timer.totalSeconds = mins * 60;
    timer.remainingSeconds = timer.totalSeconds;
    syncSettingsInputs();
    saveState();
  }
  updateTimerUI();
}

function startTimer() {
  if (timer.running) return;
  window.purrSound.playClick();
  timer.running = true;
  clearInterval(timer.intervalId);
  timer.intervalId = setInterval(tickTimer, 1000);
  updateTimerUI();
}

function pauseTimer() {
  timer.running = false;
  clearInterval(timer.intervalId);
  timer.intervalId = null;
  updateTimerUI();
}

function toggleTimer() {
  if (timer.running) {
    window.purrSound.playClick();
    pauseTimer();
  } else {
    startTimer();
  }
}

function resetTimer() {
  window.purrSound.playClick();
  pauseTimer();
  const mins = getDurationMinutesForPhase(timer.phase);
  timer.totalSeconds = mins * 60;
  timer.remainingSeconds = timer.totalSeconds;
  updateTimerUI();
}

function giveUpFocus() {
  pauseTimer();
  window.purrSound.playSad();
  setPetMood('cry', 4500);
  showCompactSpeech(randomFrom(SPEECH_PHRASES.cry));
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], randomFrom(SPEECH_PHRASES.cry));

  const mins = getDurationMinutesForPhase('focus');
  timer.totalSeconds = mins * 60;
  timer.remainingSeconds = timer.totalSeconds;
  updateTimerUI();
}

function tickTimer() {
  if (!timer.running) return;
  timer.remainingSeconds -= 1;
  if (timer.remainingSeconds <= 0) {
    timer.remainingSeconds = 0;
    completeCycle();
    return;
  }
  updateTimerUI();
}

function completeCycle() {
  pauseTimer();
  const reward = computeRewardPreview();
  const finishedPhase = timer.phase;
  const focusedMinutes = getTimerTaskMinutes();

  state.coins += reward;

  let buffNote = '';
  if (finishedPhase === 'focus') {
    state.stats.cyclesCompleted += 1;
    state.stats.totalFocusMinutes += focusedMinutes;
    if (state.activeBuff) {
      buffNote = ` (incluiu ${state.activeBuff.label} do ${state.activeBuff.name}!)`;
      state.activeBuff = null;
    }
    timer.cyclesInRound += 1;
    if (timer.cyclesInRound >= state.timerConfig.cyclesBeforeLong) {
      timer.cyclesInRound = 0;
      setPhase('longBreak', true);
    } else {
      setPhase('shortBreak', true);
    }
  } else {
    setPhase('focus', true);
  }

  saveState(true);
  window.purrSound.playTimerComplete();
  setPetMood('cheer', 7000);

  const label = finishedPhase === 'focus' ? 'Ciclo de Foco concluído!' : 'Pausa concluída!';
  document.getElementById('celSubtitle').textContent =
    `${label} Você ganhou +${reward} moedinhas!${buffNote}`;
  document.getElementById('celebrationBanner').classList.remove('hidden');

  if (appMode === 'compact') {
    setAppMode('expanded');
  }

  spawnCoinRain();
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], randomFrom(SPEECH_PHRASES.cheer));
  showCompactSpeech(`🎉 +${reward} moedas!`);

  updateCoinsUI();
  updateTimerUI();
  renderShop();
}

function setPetMood(mood, durationMs = 4000) {
  petMood = mood;
  clearTimeout(petMoodTimeout);
  if (mood !== 'normal' && durationMs > 0) {
    petMoodTimeout = setTimeout(() => {
      petMood = 'normal';
    }, durationMs);
  }
}

function updateTimerUI() {
  const formatted = formatMMSS(timer.remainingSeconds);
  document.getElementById('compactTimerDisplay').textContent = formatted;
  document.getElementById('compactMiniTime').textContent = formatted;
  document.getElementById('expandedTimerDisplay').textContent = formatted;

  // Phase badges
  const phaseMap = {
    focus: { short: '🍅 FOCO', long: 'Hora de Focar!', btnStart: '▶ Iniciar Foco' },
    shortBreak: { short: '☕ PAUSA', long: 'Pausa Curta — Relaxe!', btnStart: '▶ Iniciar Pausa' },
    longBreak: { short: '🌙 LONGA', long: 'Pausa Longa — Descanse!', btnStart: '▶ Iniciar Pausa' },
  };
  const info = phaseMap[timer.phase];
  document.getElementById('compactPhaseLabel').textContent = info.short;
  document.getElementById('expandedPhaseTag').textContent = info.long;

  // Progress bar
  const pct = timer.totalSeconds > 0 ? (timer.remainingSeconds / timer.totalSeconds) * 100 : 0;
  document.getElementById('timerProgressBar').style.width = `${clamp(pct, 0, 100)}%`;

  // Play / Pause buttons
  const playIconSrc = timer.running ? 'assets/ui/btn_pause.png' : 'assets/ui/btn_play.png';
  document.getElementById('compactPlayIcon').src = playIconSrc;
  document.getElementById('compactMiniPlayIcon').src = playIconSrc;

  const mainBtn = document.getElementById('mainPlayPauseBtn');
  mainBtn.textContent = timer.running ? '⏸ Pausar' : info.btnStart;

  // Give up button (apenas quando um Foco está em andamento ou pausado parcialmente)
  const giveUpBtn = document.getElementById('giveUpBtn');
  const inProgressFocus =
    timer.phase === 'focus' && (timer.running || timer.remainingSeconds < timer.totalSeconds);
  giveUpBtn.classList.toggle('hidden', !inProgressFocus);

  // Phase active buttons
  document.querySelectorAll('.phase-btn[data-phase]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.phase === timer.phase);
  });

  // Reward preview proporcional ao tempo da task
  const mins = getTimerTaskMinutes();
  const reward = computeRewardPreview();
  const bonusText =
    timer.phase === 'focus' && mins >= 45
      ? ' <span style="color:#6b8e53">(+40% foco profundo!)</span>'
      : timer.phase === 'focus' && mins >= 25
        ? ' <span style="color:#6b8e53">(+20% bônus foco!)</span>'
        : '';
  const buffText =
    timer.phase === 'focus' && state.activeBuff
      ? ` <span style="color:#b57b05">(${state.activeBuff.label} café!)</span>`
      : '';
  document.getElementById('rewardPreviewText').innerHTML =
    `⏱️ Task de <strong>${mins} min</strong> → 🪙 <strong>+${reward} moedas</strong>${bonusText}${buffText}`;

  // Cycle dots
  const dotsWrap = document.getElementById('cycleDots');
  dotsWrap.innerHTML = '';
  const totalDots = clamp(state.timerConfig.cyclesBeforeLong, 2, 8);
  for (let i = 0; i < totalDots; i++) {
    const dot = document.createElement('span');
    dot.className = 'cycle-dot' + (i < timer.cyclesInRound ? ' done' : '');
    dotsWrap.appendChild(dot);
  }

  // Buff pills
  const hasBuff = Boolean(state.activeBuff);
  document.getElementById('compactBuffBadge').classList.toggle('hidden', !hasBuff);
  document.getElementById('headerBuffPill').classList.toggle('hidden', !hasBuff);
  if (hasBuff) {
    const multPct = Math.round((state.activeBuff.multiplier - 1) * 100);
    document.getElementById('compactBuffBadge').textContent = `☕+${multPct}%`;
    document.getElementById('headerBuffText').textContent = `+${multPct}% moedas`;
  }

  // Footer stats
  const catDef = getCatDef(state.activeCat);
  document.getElementById('roomActiveCatText').innerHTML =
    `🐱 Companheiro: <strong>${catDef?.name || 'Mochi'}</strong>`;
  document.getElementById('roomStatsText').textContent =
    `🪑 ${state.placedItems.length} itens no quarto • 🔥 ${state.stats.cyclesCompleted} ciclos concluídos`;
}

function updateCoinsUI() {
  document.getElementById('compactCoins').textContent = state.coins;
  document.getElementById('headerCoins').textContent = state.coins;
}

function syncSettingsInputs() {
  document.getElementById('cfgFocus').value = state.timerConfig.focusMin;
  document.getElementById('cfgShort').value = state.timerConfig.shortMin;
  document.getElementById('cfgLong').value = state.timerConfig.longMin;
  document.getElementById('cfgCycles').value = state.timerConfig.cyclesBeforeLong;
}

function applyConfigValues(focusMin, shortMin, longMin, cyclesBeforeLong) {
  state.timerConfig.focusMin = clamp(Math.round(focusMin) || 25, 1, 180);
  state.timerConfig.shortMin = clamp(Math.round(shortMin) || 5, 1, 60);
  state.timerConfig.longMin = clamp(Math.round(longMin) || 15, 1, 90);
  if (cyclesBeforeLong !== undefined) {
    state.timerConfig.cyclesBeforeLong = clamp(Math.round(cyclesBeforeLong) || 4, 2, 8);
  }
  syncSettingsInputs();
  if (!timer.running) {
    const mins = getDurationMinutesForPhase(timer.phase);
    timer.totalSeconds = mins * 60;
    timer.remainingSeconds = timer.totalSeconds;
  }
  saveState();
  updateTimerUI();
}

/* ============================================================================
   QUARTINHO ISOMÉTRICO 2:1 & DRAG AND DROP LIVRE
   ============================================================================ */

const ISO_THEME_PALETTES = {
  cozy: {
    backdrop: '#ead8c3',
    backdropAccent: 'rgba(180, 130, 95, 0.10)',
    wallLeft: '#f7eadc',
    wallRight: '#ead6c2',
    wallStripe: 'rgba(180, 128, 92, 0.12)',
    wallCut: '#c8a686',
    wallCap: '#fff7ee',
    baseboardLeft: '#a67450',
    baseboardRight: '#8c5e3e',
    floorBase: '#dfb88f',
    floorLine: 'rgba(120, 76, 44, 0.22)',
    floorEdgeLeft: '#b9885c',
    floorEdgeRight: '#966843',
    rugOuter: '#e07a5f',
    rugInner: '#f5cb9c',
    outline: '#5c3d2e',
  },
  pastel: {
    backdrop: '#f6e2ee',
    backdropAccent: 'rgba(218, 135, 180, 0.14)',
    wallLeft: '#fdf1f7',
    wallRight: '#f4dfeb',
    wallStripe: 'rgba(212, 140, 185, 0.14)',
    wallCut: '#d8b4cb',
    wallCap: '#ffffff',
    baseboardLeft: '#cfa0c3',
    baseboardRight: '#b482a8',
    floorBase: '#f6e7d8',
    floorLine: 'rgba(165, 118, 145, 0.18)',
    floorEdgeLeft: '#dfc3d3',
    floorEdgeRight: '#c3a2b8',
    rugOuter: '#ec7fa9',
    rugInner: '#fde4f0',
    outline: '#7e5a7b',
  },
  bamboo: {
    backdrop: '#dce8cf',
    backdropAccent: 'rgba(105, 145, 80, 0.12)',
    wallLeft: '#ecf4e2',
    wallRight: '#dde8ce',
    wallStripe: 'rgba(105, 145, 80, 0.14)',
    wallCut: '#9ab687',
    wallCap: '#f8fbf2',
    baseboardLeft: '#6f9256',
    baseboardRight: '#5a7844',
    floorBase: '#e8dcba',
    floorLine: 'rgba(115, 108, 68, 0.20)',
    floorEdgeLeft: '#c7b88d',
    floorEdgeRight: '#a6966d',
    rugOuter: '#6b9e4f',
    rugInner: '#dcebd2',
    outline: '#3f5e36',
  },
  halloween: {
    backdrop: '#191129',
    backdropAccent: 'rgba(155, 115, 225, 0.12)',
    wallLeft: '#2d2047',
    wallRight: '#221737',
    wallStripe: 'rgba(162, 122, 232, 0.10)',
    wallCut: '#463368',
    wallCap: '#594280',
    baseboardLeft: '#4c366b',
    baseboardRight: '#392754',
    floorBase: '#40314b',
    floorLine: 'rgba(16, 9, 28, 0.42)',
    floorEdgeLeft: '#2f2238',
    floorEdgeRight: '#211629',
    rugOuter: '#ff7b54',
    rugInner: '#5d3e7a',
    outline: '#120b20',
  },
};

function clampToIsometricFloor(x, y) {
  const cx = 50;
  const cy = 65.4;
  const rx = 36;
  const ry = 17.5;
  const dx = x - cx;
  const dy = y - cy;
  const norm = Math.abs(dx) / rx + Math.abs(dy) / ry;
  if (norm <= 1) {
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  }
  return {
    x: Number((cx + dx / norm).toFixed(2)),
    y: Number((cy + dy / norm).toFixed(2)),
  };
}

function clampToIsometricWall(x, y) {
  let nx = clamp(x, 22, 78);
  if (nx > 43 && nx < 50) nx = 43;
  if (nx >= 50 && nx < 57) nx = 57;
  const baseY = 45.4 + Math.abs(nx - 50) * 0.5;
  const ny = clamp(y, baseY - 8.5, baseY - 3.5);
  return { x: Number(nx.toFixed(2)), y: Number(ny.toFixed(2)) };
}

function getAutoWallFlip(itemId, x) {
  const nativeSide = WALL_NATIVE_SIDE[itemId] || 'right';
  if (nativeSide === 'flat') return false;
  const targetSide = x < 50 ? 'left' : 'right';
  return targetSide !== nativeSide;
}

function normalizePlacedItemsForIsometricRoom() {
  const firstMigration = !state.isometricMigratedV2;
  state.placedItems.forEach((placed) => {
    const def = getCatalogItem(placed.itemId);
    if (!def) return;
    if (def.wallItem) {
      const clamped = clampToIsometricWall(placed.x, placed.y);
      placed.x = clamped.x;
      placed.y = clamped.y;
      if (firstMigration) {
        placed.flip = getAutoWallFlip(placed.itemId, placed.x);
      }
    } else {
      const clamped = clampToIsometricFloor(placed.x, placed.y);
      placed.x = clamped.x;
      placed.y = clamped.y;
    }
    placed.z = Math.round(placed.y);
  });
  state.isometricMigratedV2 = true;
}

function isoLerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function drawPoly(ctx, pts, fillStyle, strokeStyle = null, lineWidth = 1) {
  ctx.beginPath();
  pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawIsometricRoom() {
  const canvas = document.getElementById('roomBgCanvas');
  if (!canvas) return;
  const W = 260;
  const H = 260;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const pal = ISO_THEME_PALETTES[state.roomTheme] || ISO_THEME_PALETTES.cozy;

  // Vértices exatos 2:1 (dx = 104, dy = 52) com parede alta de 94u
  const T_MID = { x: 130, y: 24 };
  const T_LEFT = { x: 26, y: 76 };
  const T_RIGHT = { x: 234, y: 76 };
  const F_BACK = { x: 130, y: 118 };
  const F_LEFT = { x: 26, y: 170 };
  const F_RIGHT = { x: 234, y: 170 };
  const F_FRONT = { x: 130, y: 222 };

  // 1. Fundo suave ao redor do diorama
  ctx.fillStyle = pal.backdrop;
  ctx.fillRect(0, 0, W, H);

  if (state.roomTheme === 'halloween') {
    const stars = [
      [22, 20], [52, 16], [86, 22], [176, 20], [202, 14], [242, 42], [18, 56], [244, 214], [24, 226],
    ];
    stars.forEach(([sx, sy], i) => {
      ctx.fillStyle = i % 2 === 0 ? '#ffe699' : '#d9b8ff';
      ctx.fillRect(sx, sy, 2, 2);
    });
    // Lua crescente redonda
    ctx.fillStyle = '#ffe999';
    ctx.beginPath();
    ctx.arc(220, 28, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.backdrop;
    ctx.beginPath();
    ctx.arc(224, 25, 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = pal.backdropAccent;
    for (let gx = 10; gx < W; gx += 20) {
      for (let gy = 10; gy < H; gy += 20) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }
  }

  // 2. Sombra projetada da maquete
  drawPoly(
    ctx,
    [
      { x: F_LEFT.x - 4, y: F_LEFT.y + 14 },
      { x: F_BACK.x, y: F_BACK.y + 16 },
      { x: F_RIGHT.x + 4, y: F_RIGHT.y + 14 },
      { x: F_FRONT.x, y: F_FRONT.y + 17 },
    ],
    'rgba(0, 0, 0, 0.13)'
  );

  // 3. Espessura 3D das paredes externas (corte lateral 5px e topo)
  const wallThick = 5;
  drawPoly(
    ctx,
    [
      { x: T_LEFT.x - wallThick, y: T_LEFT.y - 2 },
      T_LEFT,
      F_LEFT,
      { x: F_LEFT.x - wallThick, y: F_LEFT.y - 2 },
    ],
    pal.wallCut,
    pal.outline,
    1.5
  );
  drawPoly(
    ctx,
    [
      T_RIGHT,
      { x: T_RIGHT.x + wallThick, y: T_RIGHT.y - 2 },
      { x: F_RIGHT.x + wallThick, y: F_RIGHT.y - 2 },
      F_RIGHT,
    ],
    pal.wallCut,
    pal.outline,
    1.5
  );
  drawPoly(
    ctx,
    [
      { x: T_LEFT.x - wallThick, y: T_LEFT.y - 2 },
      { x: T_MID.x, y: T_MID.y - 5 },
      T_MID,
      T_LEFT,
    ],
    pal.wallCap,
    pal.outline,
    1.5
  );
  drawPoly(
    ctx,
    [
      T_MID,
      { x: T_MID.x, y: T_MID.y - 5 },
      { x: T_RIGHT.x + wallThick, y: T_RIGHT.y - 2 },
      T_RIGHT,
    ],
    pal.wallCap,
    pal.outline,
    1.5
  );

  // 4. Espessura 3D da laje do chão (10px)
  const slabH = 10;
  drawPoly(
    ctx,
    [
      F_LEFT,
      F_FRONT,
      { x: F_FRONT.x, y: F_FRONT.y + slabH },
      { x: F_LEFT.x, y: F_LEFT.y + slabH },
    ],
    pal.floorEdgeLeft,
    pal.outline,
    1.5
  );
  drawPoly(
    ctx,
    [
      F_FRONT,
      F_RIGHT,
      { x: F_RIGHT.x, y: F_RIGHT.y + slabH },
      { x: F_FRONT.x, y: F_FRONT.y + slabH },
    ],
    pal.floorEdgeRight,
    pal.outline,
    1.5
  );

  // 5. Piso em losango 2:1 + ladrilhos isométricos
  drawPoly(ctx, [F_BACK, F_RIGHT, F_FRONT, F_LEFT], pal.floorBase, null);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(F_BACK.x, F_BACK.y);
  ctx.lineTo(F_RIGHT.x, F_RIGHT.y);
  ctx.lineTo(F_FRONT.x, F_FRONT.y);
  ctx.lineTo(F_LEFT.x, F_LEFT.y);
  ctx.closePath();
  ctx.clip();

  ctx.strokeStyle = pal.floorLine;
  ctx.lineWidth = 1;
  const tiles = 8;
  for (let i = 1; i < tiles; i++) {
    const t = i / tiles;
    const p1 = isoLerpPt(F_BACK, F_LEFT, t);
    const p2 = isoLerpPt(F_RIGHT, F_FRONT, t);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    const q1 = isoLerpPt(F_BACK, F_RIGHT, t);
    const q2 = isoLerpPt(F_LEFT, F_FRONT, t);
    ctx.beginPath();
    ctx.moveTo(q1.x, q1.y);
    ctx.lineTo(q2.x, q2.y);
    ctx.stroke();
  }

  // Tapetinho central em losango isométrico
  const rugPt = (u, v) => {
    const topEdge = isoLerpPt(F_BACK, F_RIGHT, u);
    const botEdge = isoLerpPt(F_LEFT, F_FRONT, u);
    return isoLerpPt(topEdge, botEdge, v);
  };
  drawPoly(
    ctx,
    [rugPt(0.27, 0.30), rugPt(0.73, 0.30), rugPt(0.73, 0.72), rugPt(0.27, 0.72)],
    pal.rugOuter,
    pal.outline,
    1
  );
  drawPoly(
    ctx,
    [rugPt(0.32, 0.35), rugPt(0.68, 0.35), rugPt(0.68, 0.67), rugPt(0.32, 0.67)],
    pal.rugInner,
    null
  );
  ctx.restore();

  // Contorno do piso
  drawPoly(ctx, [F_BACK, F_RIGHT, F_FRONT, F_LEFT], null, pal.outline, 1.5);

  // 6. Parede Esquerda (mais iluminada)
  drawPoly(ctx, [T_LEFT, T_MID, F_BACK, F_LEFT], pal.wallLeft, null);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(T_LEFT.x, T_LEFT.y);
  ctx.lineTo(T_MID.x, T_MID.y);
  ctx.lineTo(F_BACK.x, F_BACK.y);
  ctx.lineTo(F_LEFT.x, F_LEFT.y);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = pal.wallStripe;
  for (let x = T_LEFT.x; x < T_MID.x; x += 12) {
    ctx.fillRect(x, 0, 3, H);
  }
  // Rodapé isométrico esquerdo (7px)
  drawPoly(
    ctx,
    [
      { x: F_LEFT.x, y: F_LEFT.y - 7 },
      { x: F_BACK.x, y: F_BACK.y - 7 },
      F_BACK,
      F_LEFT,
    ],
    pal.baseboardLeft,
    pal.outline,
    1
  );
  ctx.restore();

  // 7. Parede Direita (sombreada)
  drawPoly(ctx, [T_MID, T_RIGHT, F_RIGHT, F_BACK], pal.wallRight, null);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(T_MID.x, T_MID.y);
  ctx.lineTo(T_RIGHT.x, T_RIGHT.y);
  ctx.lineTo(F_RIGHT.x, F_RIGHT.y);
  ctx.lineTo(F_BACK.x, F_BACK.y);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = pal.wallStripe;
  for (let x = T_MID.x; x < T_RIGHT.x; x += 12) {
    ctx.fillRect(x, 0, 3, H);
  }
  // Rodapé isométrico direito (7px)
  drawPoly(
    ctx,
    [
      { x: F_BACK.x, y: F_BACK.y - 7 },
      { x: F_RIGHT.x, y: F_RIGHT.y - 7 },
      F_RIGHT,
      F_BACK,
    ],
    pal.baseboardRight,
    pal.outline,
    1
  );
  ctx.restore();

  // 8. Contorno das paredes & quina vertical 3D
  drawPoly(ctx, [T_LEFT, T_MID, F_BACK, F_LEFT], null, pal.outline, 1.5);
  drawPoly(ctx, [T_MID, T_RIGHT, F_RIGHT, F_BACK], null, pal.outline, 1.5);
}

function applyRoomTheme(theme) {
  state.roomTheme = theme;
  document.body.classList.remove('theme-cozy', 'theme-pastel', 'theme-bamboo', 'theme-halloween');
  document.body.classList.add(`theme-${theme}`);
  document.querySelectorAll('.theme-chip').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  drawIsometricRoom();
  saveState();
}

function selectPlacedItem(uid) {
  selectedPlacedUid = uid;
  document.querySelectorAll('.placed-item').forEach((el) => {
    el.classList.toggle('selected', el.dataset.uid === uid);
  });

  const toolbar = document.getElementById('furnitureToolbar');
  if (!uid) {
    toolbar.classList.add('hidden');
    return;
  }
  const placed = state.placedItems.find((p) => p.uid === uid);
  if (!placed) {
    toolbar.classList.add('hidden');
    return;
  }
  const def = getCatalogItem(placed.itemId);
  document.getElementById('selectedItemName').textContent = def?.name || 'Móvel';
  toolbar.classList.remove('hidden');
}

function renderRoom() {
  drawIsometricRoom();
  const layer = document.getElementById('roomFurnitureLayer');
  layer.innerHTML = '';

  state.placedItems.forEach((placed) => {
    const def = getCatalogItem(placed.itemId);
    if (!def) return;

    const wrap = document.createElement('div');
    wrap.className = 'placed-item' + (placed.uid === selectedPlacedUid ? ' selected' : '');
    wrap.dataset.uid = placed.uid;
    wrap.style.left = `${placed.x}%`;
    wrap.style.top = `${placed.y}%`;
    wrap.style.zIndex = String(placed.z || Math.round(placed.y));

    const scale = def.animated ? 0.56 : 1.38;
    const drawW = Math.max(20, Math.round(def.width * scale));
    const drawH = Math.max(20, Math.round(def.height * scale));

    if (def.animated) {
      const canvas = document.createElement('canvas');
      canvas.width = drawW;
      canvas.height = drawH;
      canvas.dataset.animItem = def.id;
      if (placed.flip) canvas.style.transform = 'scaleX(-1)';
      wrap.appendChild(canvas);
    } else {
      const img = document.createElement('img');
      img.src = def.image;
      img.width = drawW;
      img.height = drawH;
      img.alt = def.name;
      if (placed.flip) img.style.transform = 'scaleX(-1)';
      wrap.appendChild(img);
    }

    wrap.addEventListener('pointerdown', (e) => startDraggingItem(e, placed.uid));
    layer.appendChild(wrap);
  });
}

function startDraggingItem(e, uid) {
  e.stopPropagation();
  const placed = state.placedItems.find((p) => p.uid === uid);
  if (!placed) return;

  selectPlacedItem(uid);
  const canvasEl = document.getElementById('roomCanvas');
  const rect = canvasEl.getBoundingClientRect();
  const itemEl = e.currentTarget;

  dragState = {
    uid,
    placed,
    itemEl,
    rect,
    def: getCatalogItem(placed.itemId),
  };
  itemEl.setPointerCapture?.(e.pointerId);
}

function handleRoomPointerMove(e) {
  if (!dragState) return;
  const { placed, itemEl, rect, def } = dragState;
  const px = ((e.clientX - rect.left) / rect.width) * 100;
  const py = ((e.clientY - rect.top) / rect.height) * 100;

  if (def?.wallItem) {
    const prevSide = placed.x < 50 ? 'left' : 'right';
    const clamped = clampToIsometricWall(px, py);
    placed.x = clamped.x;
    placed.y = clamped.y;
    const nextSide = placed.x < 50 ? 'left' : 'right';
    if (prevSide !== nextSide) {
      placed.flip = getAutoWallFlip(placed.itemId, placed.x);
      const mediaEl = itemEl.querySelector('img, canvas');
      if (mediaEl) {
        mediaEl.style.transform = placed.flip ? 'scaleX(-1)' : '';
      }
    }
  } else {
    const clamped = clampToIsometricFloor(px, py);
    placed.x = clamped.x;
    placed.y = clamped.y;
  }

  placed.z = Math.round(placed.y);
  itemEl.style.left = `${placed.x}%`;
  itemEl.style.top = `${placed.y}%`;
  itemEl.style.zIndex = String(placed.z);
}

function stopDraggingItem() {
  if (!dragState) return;
  dragState = null;
  saveState();
}

function placeItemInRoom(itemId) {
  const def = getCatalogItem(itemId);
  if (!def) return null;

  const uid = `${itemId}-${Date.now()}-${Math.floor(Math.random() * 999)}`;
  let x;
  let y;
  let flip = false;

  if (def.wallItem) {
    const nativeSide = WALL_NATIVE_SIDE[itemId] || 'right';
    const rawX = nativeSide === 'left' ? 26 + Math.random() * 14 : 60 + Math.random() * 14;
    const baseY = 45.4 + Math.abs(rawX - 50) * 0.5;
    const clamped = clampToIsometricWall(rawX, baseY - 5.5);
    x = clamped.x;
    y = clamped.y;
    flip = getAutoWallFlip(itemId, x);
  } else {
    const rawX = 32 + Math.random() * 36;
    const rawY = 55 + Math.random() * 18;
    const clamped = clampToIsometricFloor(rawX, rawY);
    x = clamped.x;
    y = clamped.y;
  }

  const entry = { uid, itemId, x, y, flip, z: Math.round(y) };
  state.placedItems.push(entry);
  selectedPlacedUid = uid;

  saveState();
  renderRoom();
  selectPlacedItem(uid);
  updateTimerUI();
  spawnRoomParticle(x, y - 6, '✨');
  return entry;
}

function countPlacedOf(itemId) {
  return state.placedItems.filter((p) => p.itemId === itemId).length;
}

/* ============================================================================
   LOJA & INVENTÁRIO
   ============================================================================ */

function renderShop() {
  const subBar = document.getElementById('shopSubfilters');
  subBar.classList.toggle('hidden', shopCategory !== 'furniture');

  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';

  let list = [];
  if (shopCategory === 'furniture') {
    list = catalog.items.filter((i) => i.category === 'furniture');
    if (shopSubFilter !== 'all') {
      list = list.filter((i) => i.subCategory === shopSubFilter);
    }
  } else if (shopCategory === 'food') {
    list = catalog.items.filter((i) => i.category === 'food');
  } else if (shopCategory === 'cats') {
    list = catalog.cats;
  } else if (shopCategory === 'pets') {
    list = catalog.pets;
  }

  list.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'shop-card';

    const preview = document.createElement('div');
    preview.className = 'shop-preview';

    if (shopCategory === 'cats') {
      const anim = getCatAnimationForState(entry, 'idle');
      const cv = document.createElement('canvas');
      cv.width = 64;
      cv.height = 64;
      cv.dataset.previewCat = entry.id;
      preview.appendChild(cv);
      loadImage(anim.src);
    } else if (shopCategory === 'pets') {
      const cv = document.createElement('canvas');
      cv.width = 64;
      cv.height = 64;
      cv.dataset.previewPet = entry.id;
      preview.appendChild(cv);
      loadImage(entry.src);
    } else if (entry.animated) {
      const cv = document.createElement('canvas');
      cv.width = 56;
      cv.height = 56;
      cv.dataset.animItem = entry.id;
      preview.appendChild(cv);
      loadImage(entry.image);
    } else {
      const img = document.createElement('img');
      img.src = entry.image;
      img.alt = entry.name;
      preview.appendChild(img);
    }

    const title = document.createElement('div');
    title.className = 'shop-title';
    title.textContent = entry.name;

    const desc = document.createElement('div');
    desc.className = 'shop-desc';
    desc.textContent = entry.description;

    const btn = document.createElement('button');
    btn.className = 'shop-action-btn';

    if (shopCategory === 'cats') {
      const owned = state.unlockedCats.includes(entry.id);
      const equipped = state.activeCat === entry.id;
      if (equipped) {
        btn.classList.add('equipped');
        btn.textContent = '✓ Equipado';
        btn.disabled = true;
      } else if (owned) {
        btn.classList.add('owned');
        btn.textContent = 'Equipar Gatinho';
        btn.onclick = () => {
          window.purrSound.playMeow();
          state.activeCat = entry.id;
          saveState();
          syncRoomActors();
          updateTimerUI();
          renderShop();
          renderInventory();
        };
      } else {
        btn.innerHTML = `🪙 ${entry.price} • Adotar`;
        btn.disabled = state.coins < entry.price;
        btn.onclick = () => buyCat(entry);
      }
    } else if (shopCategory === 'pets') {
      const owned = state.unlockedPets.includes(entry.id);
      const active = state.activePets.includes(entry.id);
      if (owned) {
        btn.classList.add(active ? 'equipped' : 'owned');
        btn.textContent = active ? '✓ Passeando no Quarto' : 'Chamar p/ Quarto';
        btn.onclick = () => togglePetInRoom(entry.id);
      } else {
        btn.innerHTML = `🪙 ${entry.price} • Adotar`;
        btn.disabled = state.coins < entry.price;
        btn.onclick = () => buyPet(entry);
      }
    } else if (shopCategory === 'food') {
      btn.innerHTML = `🪙 ${entry.price} • Servir`;
      btn.disabled = state.coins < entry.price;
      btn.onclick = () => buyFoodOrCoffee(entry);
    } else {
      const ownedCount = state.ownedItems[entry.id] || 0;
      btn.innerHTML =
        ownedCount > 0
          ? `🪙 ${entry.price} • Comprar +1 (${ownedCount})`
          : `🪙 ${entry.price} • Comprar`;
      btn.disabled = state.coins < entry.price;
      btn.onclick = () => buyFurniture(entry);
    }

    card.appendChild(preview);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(btn);
    grid.appendChild(card);
  });
}

function buyFurniture(item) {
  if (state.coins < item.price) return;
  state.coins -= item.price;
  state.ownedItems[item.id] = (state.ownedItems[item.id] || 0) + 1;
  window.purrSound.playCoin();
  placeItemInRoom(item.id);
  updateCoinsUI();
  renderShop();
  renderInventory();
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], `Adorei: ${item.name}! 🐾`);
}

function buyCat(catDef) {
  if (state.coins < catDef.price || state.unlockedCats.includes(catDef.id)) return;
  state.coins -= catDef.price;
  state.unlockedCats.push(catDef.id);
  state.activeCat = catDef.id;
  window.purrSound.playMeow();
  saveState();
  syncRoomActors();
  updateCoinsUI();
  updateTimerUI();
  renderShop();
  renderInventory();
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], `Oi! Eu sou ${catDef.name}! 💖`);
}

function buyPet(petDef) {
  if (state.coins < petDef.price || state.unlockedPets.includes(petDef.id)) return;
  state.coins -= petDef.price;
  state.unlockedPets.push(petDef.id);
  if (!state.activePets.includes(petDef.id)) {
    state.activePets.push(petDef.id);
  }
  window.purrSound.playCoin();
  saveState();
  syncRoomActors();
  updateCoinsUI();
  renderShop();
  renderInventory();
}

function togglePetInRoom(petId) {
  window.purrSound.playClick();
  if (state.activePets.includes(petId)) {
    state.activePets = state.activePets.filter((id) => id !== petId);
  } else {
    state.activePets.push(petId);
  }
  saveState();
  syncRoomActors();
  renderShop();
  renderInventory();
}

function buyFoodOrCoffee(item) {
  if (state.coins < item.price) return;
  state.coins -= item.price;
  window.purrSound.playMeow();

  if (item.buff?.type === 'coin_multiplier') {
    state.activeBuff = {
      type: 'coin_multiplier',
      multiplier: item.buff.multiplier,
      label: item.buff.label,
      name: item.name,
    };
    showCompactSpeech(`☕ ${item.buff.label} no próximo foco!`);
    if (roomActors[0]) {
      showRoomPetSpeech(roomActors[0], `☕ Bônus ${item.buff.label} ativo!`);
      spawnRoomParticle(roomActors[0].x, roomActors[0].y - 12, '☕');
    }
  } else {
    if (roomActors[0]) {
      showRoomPetSpeech(roomActors[0], `Nhac nhac! ${item.name} 😋`);
      spawnRoomParticle(roomActors[0].x, roomActors[0].y - 12, '❤️');
      spawnRoomParticle(roomActors[0].x + 5, roomActors[0].y - 15, '🐟');
    }
    showCompactSpeech('😋 Que delícia, miau!');
  }

  saveState();
  updateCoinsUI();
  updateTimerUI();
  renderShop();
}

function renderInventory() {
  // Meus Gatinhos
  const catsList = document.getElementById('invCatsList');
  catsList.innerHTML = '';
  state.unlockedCats.forEach((cid) => {
    const def = getCatDef(cid);
    if (!def) return;
    const btn = document.createElement('button');
    btn.className = 'inv-pill-btn' + (state.activeCat === cid ? ' active' : '');
    btn.textContent = def.name + (state.activeCat === cid ? ' ✓' : '');
    btn.onclick = () => {
      window.purrSound.playMeow();
      state.activeCat = cid;
      saveState();
      syncRoomActors();
      updateTimerUI();
      renderInventory();
      renderShop();
    };
    catsList.appendChild(btn);
  });

  // Amigos Pets
  const petsList = document.getElementById('invPetsList');
  petsList.innerHTML = '';
  if (state.unlockedPets.length === 0) {
    petsList.innerHTML = `<span class="label-sm">Nenhum amigo adotado ainda — confira a aba 🐶 Pets na Lojinha!</span>`;
  } else {
    state.unlockedPets.forEach((pid) => {
      const def = getPetDef(pid);
      if (!def) return;
      const active = state.activePets.includes(pid);
      const btn = document.createElement('button');
      btn.className = 'inv-pill-btn' + (active ? ' active' : '');
      btn.textContent = (active ? '🐾 ' : '💤 ') + def.name;
      btn.onclick = () => togglePetInRoom(pid);
      petsList.appendChild(btn);
    });
  }

  // Móveis Comprados
  const furnGrid = document.getElementById('invFurnitureGrid');
  furnGrid.innerHTML = '';
  const entries = Object.entries(state.ownedItems).filter(([, count]) => count > 0);
  if (entries.length === 0) {
    furnGrid.innerHTML = `<span class="label-sm">Compre móveis na Lojinha para decorar seu quarto!</span>`;
    return;
  }

  entries.forEach(([itemId, ownedCount]) => {
    const def = getCatalogItem(itemId);
    if (!def) return;
    const placedCount = countPlacedOf(itemId);
    const available = Math.max(0, ownedCount - placedCount);

    const card = document.createElement('div');
    card.className = 'inv-item-card';

    const img = document.createElement('img');
    img.src = def.image;
    img.alt = def.name;

    const meta = document.createElement('div');
    meta.className = 'inv-item-meta';
    meta.innerHTML = `
      <div class="inv-item-name" title="${def.name}">${def.name}</div>
      <div class="label-sm">${placedCount}/${ownedCount} no quarto</div>
    `;

    const action = document.createElement('button');
    action.className = 'tiny-btn';
    if (available > 0) {
      action.textContent = '+ Colocar';
      action.onclick = () => {
        window.purrSound.playClick();
        placeItemInRoom(itemId);
        renderInventory();
      };
    } else {
      action.textContent = '✓ No quarto';
      action.onclick = () => {
        const match = state.placedItems.find((p) => p.itemId === itemId);
        if (match) selectPlacedItem(match.uid);
      };
    }

    card.appendChild(img);
    card.appendChild(meta);
    card.appendChild(action);
    furnGrid.appendChild(card);
  });
}

/* ============================================================================
   PARTÍCULAS & BALÕES DE FALA
   ============================================================================ */

let compactSpeechTimer = null;
function showCompactSpeech(text, duration = 2600) {
  const el = document.getElementById('compactSpeech');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(compactSpeechTimer);
  compactSpeechTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, duration);
}

function spawnCompactHeart() {
  const layer = document.getElementById('compactParticles');
  const p = document.createElement('span');
  p.className = 'fx-particle';
  p.textContent = randomFrom(['❤️', '💖', '🐾', '✨']);
  p.style.left = `${compactPet.x + 32 + (Math.random() * 18 - 9)}px`;
  p.style.bottom = '54px';
  layer.appendChild(p);
  setTimeout(() => p.remove(), 1150);
}

function spawnRoomParticle(xPct, yPct, symbol = '❤️') {
  const layer = document.getElementById('roomFxLayer');
  const p = document.createElement('span');
  p.className = 'fx-particle';
  p.textContent = symbol;
  p.style.left = `${xPct}%`;
  p.style.top = `${yPct}%`;
  layer.appendChild(p);
  setTimeout(() => p.remove(), 1150);
}

function spawnCoinRain() {
  const layer = document.getElementById('roomFxLayer');
  for (let i = 0; i < 16; i++) {
    setTimeout(() => {
      const c = document.createElement('span');
      c.className = 'fx-coin-rain';
      c.textContent = i % 3 === 0 ? '✨' : '🪙';
      c.style.left = `${8 + Math.random() * 84}%`;
      layer.appendChild(c);
      setTimeout(() => c.remove(), 1350);
    }, i * 65);
  }
}

function showRoomPetSpeech(actor, text, duration = 2800) {
  if (!actor?.speechEl) return;
  actor.speechEl.textContent = text;
  actor.speechEl.classList.remove('hidden');
  clearTimeout(actor.speechTimer);
  actor.speechTimer = setTimeout(() => {
    actor.speechEl.classList.add('hidden');
  }, duration);
}

/* ============================================================================
   ATORES VIVOS NO QUARTO & LOOP DE ANIMAÇÃO
   ============================================================================ */

function syncRoomActors() {
  const layer = document.getElementById('roomPetsLayer');
  layer.innerHTML = '';
  roomActors.length = 0;

  const catDef = getCatDef(state.activeCat);
  if (catDef) {
    roomActors.push(createRoomActor('main-cat', 'cat', catDef, 50, 64));
  }

  state.activePets.forEach((pid, idx) => {
    const petDef = getPetDef(pid);
    if (petDef) {
      const pos = clampToIsometricFloor(38 + idx * 14, 66);
      roomActors.push(createRoomActor(`pet-${pid}`, 'pet', petDef, pos.x, pos.y));
    }
  });
}

function createRoomActor(id, kind, config, startX, startY) {
  const el = document.createElement('div');
  el.className = 'room-pet';
  el.style.left = `${startX}%`;
  el.style.top = `${startY}%`;
  el.style.zIndex = String(Math.round(startY));

  const speechEl = document.createElement('div');
  speechEl.className = 'room-pet-speech hidden';

  const canvas = document.createElement('canvas');
  canvas.width = 76;
  canvas.height = 76;

  el.appendChild(speechEl);
  el.appendChild(canvas);

  const actor = {
    id,
    kind,
    config,
    x: startX,
    y: startY,
    targetX: startX,
    targetY: startY,
    dir: 1,
    behavior: 'idle',
    behaviorTimer: 2 + Math.random() * 3,
    el,
    canvas,
    speechEl,
    speechTimer: null,
  };

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    window.purrSound.playPurr();
    spawnRoomParticle(actor.x, actor.y - 10, randomFrom(['❤️', '💖', '🐾']));
    showRoomPetSpeech(actor, randomFrom(SPEECH_PHRASES.pet));
  });

  document.getElementById('roomPetsLayer').appendChild(el);
  return actor;
}

let lastLoopTime = performance.now();
let animElapsed = 0;

function animationLoop(now) {
  const dt = Math.min(0.1, (now - lastLoopTime) / 1000);
  lastLoopTime = now;
  animElapsed += dt;

  updateCompactPet(dt);
  updateRoomActors(dt);
  updateAnimatedDecorAndPreviews();

  requestAnimationFrame(animationLoop);
}

function updateCompactPet(dt) {
  const catDef = getCatDef(state.activeCat);
  if (!catDef) return;

  let behaviorToDraw = compactPet.behavior;

  if (petMood === 'cheer') {
    behaviorToDraw = 'cheer';
  } else if (petMood === 'cry') {
    behaviorToDraw = 'cry';
  } else {
    compactPet.behaviorTimer -= dt;
    if (compactPet.behaviorTimer <= 0) {
      const roll = Math.random();
      if (roll < 0.45) {
        compactPet.behavior = 'walk';
        compactPet.targetX = 12 + Math.random() * 88;
        compactPet.behaviorTimer = 2.4 + Math.random() * 2.5;
      } else if (roll < 0.72) {
        compactPet.behavior = 'idle';
        compactPet.behaviorTimer = 3.0 + Math.random() * 3.5;
      } else {
        compactPet.behavior = 'sleep';
        compactPet.behaviorTimer = 4.5 + Math.random() * 4.5;
      }
    }

    if (compactPet.behavior === 'walk') {
      const dx = compactPet.targetX - compactPet.x;
      if (Math.abs(dx) < 1.5) {
        compactPet.behavior = 'idle';
      } else {
        compactPet.dir = dx >= 0 ? 1 : -1;
        compactPet.x += compactPet.dir * 22 * dt;
      }
    }
  }

  const actorWrap = document.getElementById('compactPetActor');
  actorWrap.style.left = `${Math.round(compactPet.x)}px`;

  const anim = getCatAnimationForState(catDef, behaviorToDraw);
  const frameIdx = Math.floor(animElapsed * (anim.fps || 5)) % anim.frames;
  const canvas = document.getElementById('compactPetCanvas');
  drawSpriteSheetFrame(canvas, anim.src, anim.fw, anim.fh, frameIdx, compactPet.dir < 0);
}

function updateRoomActors(dt) {
  if (appMode !== 'expanded') return;

  roomActors.forEach((actor) => {
    let mood = actor.behavior;
    if (actor.kind === 'cat' && (petMood === 'cheer' || petMood === 'cry')) {
      mood = petMood;
    } else {
      actor.behaviorTimer -= dt;
      if (actor.behaviorTimer <= 0) {
        const roll = Math.random();
        if (roll < 0.52) {
          actor.behavior = 'walk';
          const target = clampToIsometricFloor(
            24 + Math.random() * 52,
            51 + Math.random() * 26
          );
          actor.targetX = target.x;
          actor.targetY = target.y;
          actor.behaviorTimer = 3 + Math.random() * 3;
        } else if (actor.kind === 'cat' && roll > 0.78) {
          actor.behavior = 'sleep';
          actor.behaviorTimer = 4 + Math.random() * 4;
        } else {
          actor.behavior = 'idle';
          actor.behaviorTimer = 2.5 + Math.random() * 3;
        }
      }

      if (actor.behavior === 'walk') {
        const dx = actor.targetX - actor.x;
        const dy = actor.targetY - actor.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1.2) {
          actor.behavior = 'idle';
        } else {
          actor.dir = dx >= 0 ? 1 : -1;
          const speed = 11 * dt;
          const next = clampToIsometricFloor(
            actor.x + (dx / dist) * speed,
            actor.y + (dy / dist) * speed * 0.65
          );
          actor.x = next.x;
          actor.y = next.y;
          actor.el.style.left = `${actor.x}%`;
          actor.el.style.top = `${actor.y}%`;
          actor.el.style.zIndex = String(Math.round(actor.y));
        }
      }
    }

    if (actor.kind === 'cat') {
      const anim = getCatAnimationForState(actor.config, mood);
      const frame = Math.floor(animElapsed * (anim.fps || 5)) % anim.frames;
      drawSpriteSheetFrame(actor.canvas, anim.src, anim.fw, anim.fh, frame, actor.dir < 0);
    } else {
      const p = actor.config;
      const frame = Math.floor(animElapsed * (p.fps || 6)) % p.frames;
      drawSpriteSheetFrame(actor.canvas, p.src, p.fw, p.fh, frame, actor.dir < 0);
    }
  });
}

function updateAnimatedDecorAndPreviews() {
  if (appMode !== 'expanded') return;

  // Itens animados no quarto/loja (ex: EyeinJar)
  document.querySelectorAll('canvas[data-anim-item]').forEach((cv) => {
    const def = getCatalogItem(cv.dataset.animItem);
    if (!def) return;
    const frame = Math.floor(animElapsed * (def.fps || 6)) % (def.frames || 1);
    drawSpriteSheetFrame(cv, def.image, def.frameWidth, def.frameHeight, frame, false);
  });

  // Previews animados de gatinhos na loja
  document.querySelectorAll('canvas[data-preview-cat]').forEach((cv) => {
    const catDef = getCatDef(cv.dataset.previewCat);
    if (!catDef) return;
    const anim = getCatAnimationForState(catDef, 'idle');
    const frame = Math.floor(animElapsed * (anim.fps || 5)) % anim.frames;
    drawSpriteSheetFrame(cv, anim.src, anim.fw, anim.fh, frame, false);
  });

  // Previews animados de pets na loja
  document.querySelectorAll('canvas[data-preview-pet]').forEach((cv) => {
    const p = getPetDef(cv.dataset.previewPet);
    if (!p) return;
    const frame = Math.floor(animElapsed * (p.fps || 6)) % p.frames;
    drawSpriteSheetFrame(cv, p.src, p.fw, p.fh, frame, false);
  });
}

/* ============================================================================
   EVENTOS & INICIALIZAÇÃO
   ============================================================================ */

function bindEvents() {
  // Carinho no gatinho compacto
  document.getElementById('compactPetActor').addEventListener('click', () => {
    window.purrSound.playPurr();
    spawnCompactHeart();
    const pool = timer.phase === 'focus' ? SPEECH_PHRASES.focus : SPEECH_PHRASES.break;
    showCompactSpeech(randomFrom(pool));
  });

  // Controles Compactos
  document.getElementById('compactPlayPauseBtn').addEventListener('click', toggleTimer);
  document.getElementById('compactMinusBtn').addEventListener('click', (e) => {
    adjustCurrentMinutes(e.shiftKey ? -5 : -1);
  });
  document.getElementById('compactPlusBtn').addEventListener('click', (e) => {
    adjustCurrentMinutes(e.shiftKey ? 5 : 1);
  });
  document.getElementById('compactExpandBtn').addEventListener('click', () => {
    window.purrSound.playClick();
    setAppMode('expanded');
    switchSideTab('shop');
  });
  document.getElementById('compactRoomBtn').addEventListener('click', () => {
    window.purrSound.playClick();
    setAppMode('expanded');
  });
  document.getElementById('compactCollapseBtn').addEventListener('click', () => {
    window.purrSound.playClick();
    setCompactCollapsed(true);
  });
  document.getElementById('compactMiniExpandBtn').addEventListener('click', () => {
    window.purrSound.playClick();
    setCompactCollapsed(false);
  });
  document.getElementById('compactMiniPlayBtn').addEventListener('click', toggleTimer);
  document.getElementById('compactMiniRoomBtn').addEventListener('click', () => {
    window.purrSound.playClick();
    setAppMode('expanded');
  });

  // Header do Modo Expandido
  document.getElementById('minimizeCompactBtn').addEventListener('click', () => {
    window.purrSound.playClick();
    setAppMode('compact');
  });
  document.getElementById('snapClockBtn').addEventListener('click', () => {
    window.purrSound.playClick();
    window.purrAPI?.snapToClock?.();
  });
  document.getElementById('closeAppBtn').addEventListener('click', () => {
    saveState(true);
    if (window.purrAPI?.quitApp) {
      window.purrAPI.quitApp();
    } else {
      setAppMode('compact');
    }
  });
  document.getElementById('muteBtn').addEventListener('click', () => {
    state.muted = !state.muted;
    window.purrSound.muted = state.muted;
    document.getElementById('muteBtn').textContent = state.muted ? '🔇' : '🔊';
    saveState();
  });

  // Temas do Quarto
  document.querySelectorAll('.theme-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.purrSound.playClick();
      applyRoomTheme(btn.dataset.theme);
    });
  });

  // Drag & Drop no Quarto
  const roomCanvas = document.getElementById('roomCanvas');
  roomCanvas.addEventListener('pointerdown', (e) => {
    if (
      e.target === roomCanvas ||
      e.target.id === 'roomBgCanvas' ||
      e.target.id === 'roomFurnitureLayer'
    ) {
      selectPlacedItem(null);
    }
  });
  window.addEventListener('pointermove', handleRoomPointerMove);
  window.addEventListener('pointerup', stopDraggingItem);
  window.addEventListener('resize', drawIsometricRoom);

  // Barra flutuante de item selecionado
  document.getElementById('tbFlipBtn').addEventListener('click', () => {
    const item = state.placedItems.find((p) => p.uid === selectedPlacedUid);
    if (!item) return;
    window.purrSound.playClick();
    item.flip = !item.flip;
    saveState();
    renderRoom();
  });
  document.getElementById('tbFrontBtn').addEventListener('click', () => {
    const item = state.placedItems.find((p) => p.uid === selectedPlacedUid);
    if (!item) return;
    window.purrSound.playClick();
    const maxZ = state.placedItems.reduce((m, p) => Math.max(m, p.z || 10), 10);
    item.z = maxZ + 1;
    saveState();
    renderRoom();
  });
  document.getElementById('tbBackBtn').addEventListener('click', () => {
    const item = state.placedItems.find((p) => p.uid === selectedPlacedUid);
    if (!item) return;
    window.purrSound.playClick();
    const minZ = state.placedItems.reduce((m, p) => Math.min(m, p.z || 10), 10);
    if (minZ <= 1) {
      state.placedItems.forEach((p) => {
        p.z = (p.z || 10) + 2;
      });
      item.z = 1;
    } else {
      item.z = minZ - 1;
    }
    saveState();
    renderRoom();
  });
  document.getElementById('tbStoreBtn').addEventListener('click', () => {
    if (!selectedPlacedUid) return;
    window.purrSound.playClick();
    state.placedItems = state.placedItems.filter((p) => p.uid !== selectedPlacedUid);
    selectPlacedItem(null);
    saveState();
    renderRoom();
    renderInventory();
    updateTimerUI();
  });

  // Banner de conclusão
  document.getElementById('celNextBtn').addEventListener('click', () => {
    window.purrSound.playClick();
    document.getElementById('celebrationBanner').classList.add('hidden');
  });

  // Abas laterais
  document.querySelectorAll('.side-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.purrSound.playClick();
      switchSideTab(btn.dataset.tab);
    });
  });

  // Controles do Timer Expandido
  document.querySelectorAll('.phase-btn[data-phase]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.purrSound.playClick();
      setPhase(btn.dataset.phase, true);
    });
  });
  document.getElementById('mainPlayPauseBtn').addEventListener('click', toggleTimer);
  document.getElementById('resetTimerBtn').addEventListener('click', resetTimer);
  document.getElementById('giveUpBtn').addEventListener('click', giveUpFocus);

  document.querySelectorAll('.adj-btn[data-delta]').forEach((btn) => {
    btn.addEventListener('click', () => adjustCurrentMinutes(Number(btn.dataset.delta)));
  });

  // Presets & Steppers Reguláveis
  document.querySelectorAll('.preset-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.purrSound.playClick();
      applyConfigValues(Number(btn.dataset.f), Number(btn.dataset.s), Number(btn.dataset.l));
    });
  });

  document.querySelectorAll('.step-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.purrSound.playClick();
      const input = document.getElementById(btn.dataset.target);
      const step = Number(btn.dataset.step);
      input.value = clamp(Number(input.value || 1) + step, Number(input.min), Number(input.max));
      readSettingsFromInputs();
    });
  });

  ['cfgFocus', 'cfgShort', 'cfgLong', 'cfgCycles'].forEach((id) => {
    document.getElementById(id).addEventListener('change', readSettingsFromInputs);
  });

  // Categorias da Loja
  document.querySelectorAll('.shop-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.purrSound.playClick();
      shopCategory = btn.dataset.cat;
      document.querySelectorAll('.shop-cat-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderShop();
    });
  });

  document.querySelectorAll('.sub-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.purrSound.playClick();
      shopSubFilter = btn.dataset.sub;
      document.querySelectorAll('.sub-chip').forEach((b) => b.classList.toggle('active', b === btn));
      renderShop();
    });
  });

  // Limpar quarto
  document.getElementById('clearRoomBtn').addEventListener('click', () => {
    window.purrSound.playClick();
    state.placedItems = [];
    selectPlacedItem(null);
    saveState();
    renderRoom();
    renderInventory();
    updateTimerUI();
  });

  // Eventos vindos da Bandeja do Windows (Electron)
  window.purrAPI?.onTrayAction?.((action) => {
    if (action === 'toggle-timer') {
      toggleTimer();
    }
  });
  window.purrAPI?.onModeChanged?.((mode) => {
    appMode = mode;
    document.body.classList.toggle('mode-compact', appMode === 'compact');
    document.body.classList.toggle('mode-expanded', appMode === 'expanded');
    document.getElementById('compactView').classList.toggle('hidden', appMode === 'expanded');
    document.getElementById('expandedView').classList.toggle('hidden', appMode === 'compact');
    if (appMode === 'expanded') {
      renderRoom();
      syncRoomActors();
      renderShop();
      renderInventory();
    }
  });

  window.addEventListener('beforeunload', () => saveState(true));
}

function readSettingsFromInputs() {
  applyConfigValues(
    Number(document.getElementById('cfgFocus').value),
    Number(document.getElementById('cfgShort').value),
    Number(document.getElementById('cfgLong').value),
    Number(document.getElementById('cfgCycles').value)
  );
}

function switchSideTab(tabName) {
  document.querySelectorAll('.side-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach((p) => {
    p.classList.toggle('active', p.id === `tab-${tabName}`);
  });
  if (tabName === 'shop') renderShop();
  if (tabName === 'inventory') renderInventory();
}

async function init() {
  const resp = await fetch('assets/catalog.json');
  catalog = await resp.json();

  await loadState();
  normalizePlacedItemsForIsometricRoom();
  window.purrSound.muted = Boolean(state.muted);
  document.getElementById('muteBtn').textContent = state.muted ? '🔇' : '🔊';

  applyRoomTheme(state.roomTheme || 'cozy');
  syncSettingsInputs();
  setPhase('focus', true);
  updateCoinsUI();
  updateTimerUI();
  bindEvents();
  setCompactCollapsed(Boolean(state.compactCollapsed), Boolean(window.purrAPI?.isElectron));

  // Em navegador comum (sem Electron), abre direto no modo expandido com dica
  if (!window.purrAPI?.isElectron) {
    setAppMode('expanded');
  } else {
    setAppMode('compact');
  }

  // Pré-carregar sprites do gato atual
  const catDef = getCatDef(state.activeCat);
  if (catDef) {
    Object.values(catDef.animations).forEach((a) => loadImage(a.src));
  }

  requestAnimationFrame(animationLoop);
}

init().catch((err) => {
  console.error('Erro ao inicializar PurrModoro:', err);
});
