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

const DINO_PHRASES = [
  'RAWWR! (miau jurássico!) 🦖',
  'ERR_PROCRASTINATION_DISCONNECTED 🌵',
  'Pulando cactos no foco! 🦖✨',
  'Sem Wi-Fi, 100% produtividade! 🦖🐾',
  'Prrrr-ex feliz! 🦖💖',
];

const ROOM_THEME_CATALOG = [
  {
    id: 'cozy',
    name: 'Tema Cafeteria Cozy',
    chipLabel: '☕ Cozy',
    price: 0,
    starter: true,
    description: 'Paredes creme aconchegantes e piso de madeira quentinha.',
  },
  {
    id: 'pastel',
    name: 'Tema Doce Pastel',
    chipLabel: '🌸 Pastel',
    price: 120,
    starter: false,
    description: 'Tons suaves de algodão-doce e lavanda para estudar em paz.',
  },
  {
    id: 'bamboo',
    name: 'Tema Jardim Bamboo',
    chipLabel: '🎋 Bamboo',
    price: 150,
    starter: false,
    description: 'Inspirado em casas de chá com tatame e verde zen.',
  },
  {
    id: 'halloween',
    name: 'Tema Noite Mística',
    chipLabel: '🎃 Noite',
    price: 180,
    starter: false,
    premiumOnly: true,
    description: 'Quarto noturno estrelado com lua crescente e clima de bruxinha!',
  },
  {
    id: 'starlight',
    secretId: 'theme_sec_starlight',
    name: 'Tema Galáxia Lo-Fi',
    chipLabel: '🌌 Galáxia',
    price: 0,
    starter: false,
    secret: true,
    description: 'Brinde Secreto: quarto cósmico estrelado em azul-noite e neon lo-fi!',
  },
];

const DEFAULT_STATE = {
  saveVersion: 2,
  coins: 100,
  unlockedCats: ['cat_mochi', 'cat_dino'],
  activeCat: 'cat_mochi',
  unlockedHats: [],
  activeHat: null,
  unlockedPets: [],
  activePets: [],
  unlockedThemes: ['cozy'],
  ownedItems: {
    plant_mini: 1,
    bowl_water_blue: 1,
  },
  placedItems: [
    { uid: 'starter-plant', itemId: 'plant_mini', x: 68, y: 60, flip: false, z: 60 },
    { uid: 'starter-bowl', itemId: 'bowl_water_blue', x: 34, y: 68, flip: false, z: 68 },
  ],
  placedFoods: [],
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
  streak: {
    current: 0,
    best: 0,
    lastClaimDate: null,
    freezeShields: 0,
  },
  cloudUser: null,
  supporter: {
    active: false,
    since: null,
    lastClaimMonth: null,
  },
  unlockedSecretIds: [],
  loginPromptShownCount: 0,
  lang: null,
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
  art_heart_grey: 'left',
  art_stripes: 'left',
  art_abstract: 'left',
  art_dog_golden: 'flat',
  shelf_wall_wood: 'right',
  furn_sec_neon_heart: 'right',
};

const PREMIUM_ONLY_IDS = new Set([
  'cat_mochi_box',
  'cat_evil_box',
  'cat_zombie',
  'cat_witch',
  'pet_bunny',
  'pet_golden',
  'pet_zombie_hand',
  'coffee_moka',
  'food_ramen',
  'food_onigiri',
  'food_ice_cream_tub',
  'halloween',
]);

function isPremiumLocked(entry) {
  if (!entry) return false;
  const requiresPremium = Boolean(entry.premiumOnly || PREMIUM_ONLY_IDS.has(entry.id));
  return requiresPremium && !state.supporter?.active;
}

function openPremiumShopPrompt(entry) {
  window.purrSound.playClick();
  const isEn = getCurrentLang() === 'en';
  const msg = isEn
    ? `👑 "${entry?.name || 'Item'}" is in the Premium Shop! Support PurrModoro to unlock.`
    : `👑 "${entry?.name || 'Item'}" é da Loja Premium! Seja Apoiador para liberar a compra.`;
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], msg, 4200);
  showCompactSpeech(msg, 4200);
  switchSideTab('support');
}

// Superfícies (estantes, mesas, aparador, prateleira de parede) onde itens menores podem apoiar
const SURFACE_SPECS = {
  shelf_wood: {
    xSpanFactor: 0.36,
    minUpFactor: 0.08,
    maxUpFactor: 0.88,
    tiers: [0.14, 0.34, 0.54, 0.78],
  },
  table_coffee_wood: {
    xSpanFactor: 0.38,
    minUpFactor: 0.42,
    maxUpFactor: 0.76,
  },
  table_side_wood: {
    xSpanFactor: 0.38,
    minUpFactor: 0.50,
    maxUpFactor: 0.82,
  },
  shelf_wall_wood: {
    xSpanFactor: 0.38,
    minUpFactor: 0.38,
    maxUpFactor: 0.72,
  },
};

let catalog = { items: [], cats: [], pets: [], hats: [] };
let state = structuredClone(DEFAULT_STATE);
let appMode = 'compact'; // 'compact' | 'expanded'
let shopCategory = 'furniture';
let shopSubFilter = 'all';
let selectedPlacedUid = null;
let dragState = null;
let heldFood = null;

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
  const direct =
    catalog.items.find((i) => i.id === id) ||
    catalog.cats.find((c) => c.id === id) ||
    catalog.pets.find((p) => p.id === id) ||
    (catalog.hats || []).find((h) => h.id === id);
  if (direct) return direct;

  const secretTheme = ROOM_THEME_CATALOG.find((t) => t.secretId && t.secretId === id);
  if (secretTheme) {
    return {
      id: secretTheme.secretId,
      themeId: secretTheme.id,
      name: `${secretTheme.name} (Quarto)`,
      description: secretTheme.description,
      secret: true,
    };
  }
  return null;
}

function getCatDef(id) {
  return catalog.cats.find((c) => c.id === id) || catalog.cats[0];
}

function getPetDef(id) {
  return catalog.pets.find((p) => p.id === id);
}

function getHatDef(id) {
  return (catalog.hats || []).find((h) => h.id === id) || null;
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
  if (!saved || typeof saved !== 'object' || saved.saveVersion !== 2) {
    state = structuredClone(DEFAULT_STATE);
    saveState(true);
    return;
  }

  state = {
    ...structuredClone(DEFAULT_STATE),
    ...saved,
    saveVersion: 2,
    compactCollapsed: Boolean(saved.compactCollapsed),
    isometricMigratedV2: Boolean(saved.isometricMigratedV2),
    timerConfig: { ...DEFAULT_STATE.timerConfig, ...(saved.timerConfig || {}) },
    stats: { ...DEFAULT_STATE.stats, ...(saved.stats || {}) },
    streak: { ...DEFAULT_STATE.streak, ...(saved.streak || {}) },
    supporter: { ...DEFAULT_STATE.supporter, ...(saved.supporter || {}) },
    unlockedSecretIds: Array.isArray(saved.unlockedSecretIds) ? saved.unlockedSecretIds : [],
    cloudUser:
      saved.cloudUser &&
      saved.cloudUser.provider !== 'cloud-local' &&
      saved.cloudUser.email !== 'miau.player@gmail.com'
        ? saved.cloudUser
        : null,
    loginPromptShownCount: Number(saved.loginPromptShownCount) || 0,
    lang: saved.lang === 'en' || saved.lang === 'pt' ? saved.lang : null,
    ownedItems: saved.ownedItems || { ...DEFAULT_STATE.ownedItems },
    placedItems: Array.isArray(saved.placedItems) ? saved.placedItems : [...DEFAULT_STATE.placedItems],
  };
  const savedThemes = Array.isArray(saved?.unlockedThemes) ? saved.unlockedThemes : ['cozy'];
  state.unlockedCats = Array.from(
    new Set(['cat_mochi', 'cat_dino', ...(Array.isArray(state.unlockedCats) ? state.unlockedCats : [])])
  );
  state.unlockedThemes = Array.from(new Set(['cozy', ...savedThemes]));
  if (!state.unlockedThemes.includes(state.roomTheme)) {
    state.roomTheme = 'cozy';
  }
  state.unlockedHats = Array.isArray(saved?.unlockedHats) ? saved.unlockedHats : [];
  state.activeHat = saved?.activeHat && state.unlockedHats.includes(saved.activeHat) ? saved.activeHat : null;
  state.placedFoods = Array.isArray(saved?.placedFoods) ? saved.placedFoods : [];
  const loadedCoins = Number(state.coins);
  state.coins = !Number.isFinite(loadedCoins) || loadedCoins >= 900000
    ? 100
    : Math.max(0, Math.floor(loadedCoins));
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
    if (state.cloudUser && window.purrCloud?.syncStateToCloud) {
      window.purrCloud.syncStateToCloud(state).catch(() => {});
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

function drawSpriteSheetFrame(canvas, src, fw, fh, frameIndex, flip = false, customScale = null) {
  const img = loadImage(src);
  if (!img.complete || img.naturalWidth === 0) return;

  const ctx = canvas.getContext('2d');
  const totalCols = Math.max(1, Math.floor(img.naturalWidth / fw));
  const col = ((frameIndex % totalCols) + totalCols) % totalCols;
  const sx = col * fw;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const scale = Math.min(canvas.width / fw, canvas.height / fh);
  const drawScale = customScale !== null ? customScale : (scale >= 1 ? Math.floor(scale) : scale);
  const dw = Math.round(fw * drawScale);
  const dh = Math.round(fh * drawScale);
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

const CAT_HEAD_ANCHORS = {
  'cat_mochi_idle.png': { x: 10, y: 5, bob: [0, 0, 0, 1, 1, 1, 1, 0, 0, 0] },
  'cat_mochi_box.png': { x: 15, y: 5, bob: [0, 0, 0, 0] },
  'cat_cream_cheer.png': { x: 31, y: 18, bob: [0, 1] },
  'cat_tuxedo_cheer.png': { x: 31, y: 18, bob: [0, 1] },
  'cat_white_cheer.png': { x: 31, y: 18, bob: [0, 1] },
  'cat_cream_cry.png': { x: 27, y: 18, bob: [0, 1, 1, 0] },
  'cat_tuxedo_cry.png': { x: 27, y: 18, bob: [0, 1, 1, 0] },
  'cat_cream_sleep.png': { x: 40, y: 29, bob: [0, 0, 1, 0] },
  'cat_tuxedo_sleep.png': { x: 40, y: 29, bob: [0, 0, 1, 0] },
  'cat_curled_sleep.png': { x: 19, y: 3, bob: [0] },
  'cat_dracula.png': { x: 9, y: 4, bob: [0, 0, 1, 0, 0, 1] },
  'cat_vampire_angry.png': { x: 10, y: 4, bob: [0, 0, 0, 1, 1, 1, 0, 0, 0] },
  'cat_witch.png': { x: 17, y: 17, bob: [0, -2, -4, -6, -4, -2] },
  'cat_evil_box.png': { x: 15, y: 8, bob: [0, -2, -5, -6, -6, -6, -6, -6, -6, -6, -6, -6] },
  'cat_zombie_eating.png': { x: 11, y: 5, bob: [0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0] },
  'cat_dino_idle.png': { x: 20, y: 7, bob: [0, -1, 0, 0, 0, -1, 0, 0] },
  'cat_dino_sleep.png': { x: 19, y: 16, bob: [0, 0, 1, 0] },
  'cat_dino_cheer.png': { x: 20, y: 7, bob: [0, -3, -4, -2] },
  'cat_dino_cry.png': { x: 20, y: 7, bob: [0, 1, 0, 1] },
  'cat_dino_walk.png': { x: 20, y: 7, bob: [0, -1, 0, -1] },
  'cat_mochi_walk.png': { x: 10, y: 5, bob: [0, -1, 0, -1] },
  'cat_mochi_box_walk.png': { x: 15, y: 5, bob: [0, -1, 0, -1] },
  'cat_cream_walk.png': { x: 31, y: 18, bob: [0, -1, 0, -1] },
  'cat_tuxedo_walk.png': { x: 31, y: 18, bob: [0, -1, 0, -1] },
  'cat_white_walk.png': { x: 31, y: 18, bob: [0, -1, 0, -1] },
};

function resolveCatHeadAnchor(sheetName, fw = 32) {
  if (CAT_HEAD_ANCHORS[sheetName]) return CAT_HEAD_ANCHORS[sheetName];
  if (sheetName.includes('_dino')) {
    if (sheetName.endsWith('_sleep.png')) return CAT_HEAD_ANCHORS['cat_dino_sleep.png'];
    if (sheetName.endsWith('_cheer.png')) return CAT_HEAD_ANCHORS['cat_dino_cheer.png'];
    if (sheetName.endsWith('_cry.png')) return CAT_HEAD_ANCHORS['cat_dino_cry.png'];
    if (sheetName.endsWith('_walk.png')) return CAT_HEAD_ANCHORS['cat_dino_walk.png'];
    return CAT_HEAD_ANCHORS['cat_dino_idle.png'];
  }
  if (sheetName.endsWith('_walk.png')) return fw <= 32 ? CAT_HEAD_ANCHORS['cat_mochi_walk.png'] : CAT_HEAD_ANCHORS['cat_cream_walk.png'];
  if (sheetName.endsWith('_idle.png')) return CAT_HEAD_ANCHORS['cat_mochi_idle.png'];
  if (sheetName.endsWith('_sleep.png')) return CAT_HEAD_ANCHORS['cat_cream_sleep.png'];
  if (sheetName.endsWith('_cheer.png')) return CAT_HEAD_ANCHORS['cat_cream_cheer.png'];
  if (sheetName.endsWith('_cry.png')) return CAT_HEAD_ANCHORS['cat_cream_cry.png'];
  return { x: fw / 2, y: 4, bob: [0] };
}

function isDinoId(id) {
  return String(id || '').includes('dino');
}

function drawCatFrameWithHat(canvas, anim, frameIndex, flip = false, customScale = null, hatIdOverride = undefined) {
  drawSpriteSheetFrame(canvas, anim.src, anim.fw, anim.fh, frameIndex, flip, customScale);
  const hatId = hatIdOverride !== undefined ? hatIdOverride : state.activeHat;
  if (!hatId) return;
  const hatDef = getHatDef(hatId);
  if (!hatDef) return;
  const hatImg = loadImage(hatDef.image);
  if (!hatImg.complete || hatImg.naturalWidth === 0) return;

  const ctx = canvas.getContext('2d');
  const scale = Math.min(canvas.width / anim.fw, canvas.height / anim.fh);
  const drawScale = customScale !== null ? customScale : (scale >= 1 ? Math.floor(scale) : scale);
  const dw = Math.round(anim.fw * drawScale);
  const dh = Math.round(anim.fh * drawScale);
  const dx = Math.round((canvas.width - dw) / 2);
  const dy = canvas.height - dh;

  const sheetName = anim.src.split('/').pop();
  const anchor = resolveCatHeadAnchor(sheetName, anim.fw);
  const bobArr = anchor.bob || [0];
  const bobY = bobArr[frameIndex % bobArr.length] || 0;
  const headCanvasX = dx + anchor.x * drawScale;
  const headCanvasY = dy + (anchor.y + bobY) * drawScale;

  const hatScale = anim.fw <= 32 ? drawScale * 0.62 : drawScale * 1.15;
  const hatW = Math.round(hatImg.naturalWidth * hatScale);
  const hatH = Math.round(hatImg.naturalHeight * hatScale);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(
    hatImg,
    Math.round(headCanvasX - hatW / 2),
    Math.round(headCanvasY - hatH * 0.78),
    hatW,
    hatH
  );
  ctx.restore();
}

function getActorSpriteScale(kind, config, inCompact = false, animFw = 32) {
  const id = config?.id;
  if (kind === 'cat') {
    if (id === 'cat_witch' && animFw === 48) return inCompact ? 1.15 : 1.48;
    if (animFw <= 32) return 2.0;
    if (animFw === 43) return 1.45;
    return 1.0;
  }
  if (id === 'pet_bunny') return 1.25;
  if (id === 'pet_zombie_hand') return 1.65;
  if (id === 'pet_golden') return 1.2;
  return 1.0;
}

function getActorCanvasSize(kind, config) {
  const id = config?.id;
  if (kind === 'cat') {
    if (id === 'cat_witch') return { w: 72, h: 90 };
    return { w: 68, h: 82 };
  }
  if (id === 'pet_bunny') return { w: 40, h: 32 };
  if (id === 'pet_zombie_hand') return { w: 44, h: 52 };
  if (id === 'pet_golden') return { w: 66, h: 38 };
  return { w: 48, h: 48 };
}

function getCatAnimationForState(catDef, moodOrBehavior) {
  const anims = catDef?.animations || {};
  if (moodOrBehavior === 'cheer' && anims.cheer) return anims.cheer;
  if (moodOrBehavior === 'cry' && anims.cry) return anims.cry;
  if (moodOrBehavior === 'sleep' && anims.sleep) return anims.sleep;
  if (moodOrBehavior === 'walk' && anims.walk) return anims.walk;
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
    cancelHeldFood();
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

  // Convite fofo "Me leva com você?! *-*" após concluir ciclos (2º ciclo ou a cada 4 ciclos se ainda não logado)
  if (
    finishedPhase === 'focus' &&
    !state.cloudUser &&
    (state.stats.cyclesCompleted === 2 || state.stats.cyclesCompleted % 4 === 0)
  ) {
    setTimeout(() => {
      if (!state.cloudUser) openLoginPromptModal(true);
    }, 1100);
  }
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
  starlight: {
    backdrop: '#0a1026',
    backdropAccent: 'rgba(56, 189, 248, 0.16)',
    wallLeft: '#18244d',
    wallRight: '#111a38',
    wallStripe: 'rgba(125, 211, 252, 0.10)',
    wallCut: '#2d3f7a',
    wallCap: '#3e5499',
    baseboardLeft: '#2d3f7a',
    baseboardRight: '#212f5e',
    floorBase: '#202954',
    floorLine: 'rgba(8, 12, 32, 0.45)',
    floorEdgeLeft: '#151c3b',
    floorEdgeRight: '#0f142b',
    rugOuter: '#38bdf8',
    rugInner: '#7c3aed',
    outline: '#070b1a',
  },
};

function isSurfaceDef(def) {
  return Boolean(def && (def.isSurface || SURFACE_SPECS[def.id]));
}

function canItemSitOnSurface(def) {
  if (!def || def.wallItem || isSurfaceDef(def)) return false;
  return ![
    'tower_deluxe',
    'house_cozy',
    'post_pink',
    'post_olive',
    'post_blue',
    'bed_blue',
    'bed_charcoal',
    'bed_berry',
    'bed_moss',
  ].includes(def.id);
}

function computeSurfaceChildZ(host, childY) {
  const hostZ = host.z || Math.round(host.y);
  return hostZ + 15 + Math.max(0, Math.round(childY - (host.y - 20)));
}

function syncSurfaceChildrenZ(host) {
  state.placedItems.forEach((child) => {
    if (child.onSurfaceUid === host.uid) {
      child.z = computeSurfaceChildZ(host, child.y);
      (state.placedFoods || []).forEach((food) => {
        if (food.hostUid === child.uid) {
          food.z = child.z + 2;
        }
      });
    }
  });
  (state.placedFoods || []).forEach((food) => {
    if (food.hostUid === host.uid) {
      food.z = computeSurfaceChildZ(host, food.y);
    }
  });
}

function clampToIsometricFloor(x, y, def = null) {
  // Piso 10x10 tiles no canvas 260x260: vértice traseiro F_BACK=(50.0, 44.615), 1 tile = (4.6923, 2.34615)
  const dx = x - 50.0;
  const dy = y - 44.615;
  const u = 0.5 * (dy / 2.34615 + dx / 4.6923);
  const v = 0.5 * (dy / 2.34615 - dx / 4.6923);

  const extraWallMargin = def
    ? clamp((def.width * getItemRoomScale(def)) / 180, 0.15, 0.75)
    : 0.25;
  const minUV = 0.65 + extraWallMargin;
  const maxUV = 9.5; // exatamente 0.5 tile da borda frontal

  const cu = clamp(u, minUV, maxUV);
  const cv = clamp(v, minUV, maxUV);
  const nx = 50.0 + (cu - cv) * 4.6923;
  const ny = 44.615 + (cu + cv) * 2.34615;
  return { x: Number(nx.toFixed(2)), y: Number(ny.toFixed(2)) };
}

function clampToIsometricWall(x, y, def = null) {
  let nx = clamp(x, 9, 91);
  if (nx > 47 && nx < 50) nx = 47;
  if (nx >= 50 && nx < 53) nx = 53;
  const baseY = 44.62 + Math.abs(nx - 50) * 0.5;
  const drawH = def ? Math.max(10, Math.round(def.height * getItemRoomScale(def))) : 48;
  const itemHPct = (drawH / 600) * 100;
  const minY = baseY - 38.5 + itemHPct;
  const maxY = baseY - 2.5;
  const ny = clamp(y, minY, maxY);
  return { x: Number(nx.toFixed(2)), y: Number(ny.toFixed(2)) };
}

function getAutoWallFlip(itemId, x) {
  const nativeSide = WALL_NATIVE_SIDE[itemId] || 'right';
  if (nativeSide === 'flat') return false;
  const targetSide = x < 50 ? 'left' : 'right';
  return targetSide !== nativeSide;
}

function normalizePlacedItemsForIsometricRoom() {
  const uidMap = new Map(state.placedItems.map((p) => [p.uid, p]));

  // Primeiro normaliza paredes, superfícies e itens no chão (sem superfície hospedeira)
  state.placedItems.forEach((placed) => {
    const def = getCatalogItem(placed.itemId);
    if (!def) return;
    if (placed.onSurfaceUid && !uidMap.has(placed.onSurfaceUid)) {
      placed.onSurfaceUid = null;
    }
    if (def.wallItem) {
      const clamped = clampToIsometricWall(placed.x, placed.y, def);
      placed.x = clamped.x;
      placed.y = clamped.y;
      placed.flip = getAutoWallFlip(placed.itemId, placed.x);
      placed.z = Math.round(placed.y);
    } else if (!placed.onSurfaceUid) {
      const clamped = clampToIsometricFloor(placed.x, placed.y, def);
      placed.x = clamped.x;
      placed.y = clamped.y;
      placed.z = Math.round(placed.y);
    }
  });

  // Depois garante o z-index dos itens apoiados em cima de superfícies válidas
  state.placedItems.forEach((placed) => {
    if (!placed.onSurfaceUid) return;
    const host = uidMap.get(placed.onSurfaceUid);
    if (host) {
      placed.z = computeSurfaceChildZ(host, placed.y);
    }
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

  // Vértices exatos 2:1 ampliados (dx = 122, dy = 61) ocupando todo o quarto
  const T_MID = { x: 130, y: 10 };
  const T_LEFT = { x: 8, y: 71 };
  const T_RIGHT = { x: 252, y: 71 };
  const F_BACK = { x: 130, y: 116 };
  const F_LEFT = { x: 8, y: 177 };
  const F_RIGHT = { x: 252, y: 177 };
  const F_FRONT = { x: 130, y: 238 };

  // 1. Fundo suave ao redor do diorama
  ctx.fillStyle = pal.backdrop;
  ctx.fillRect(0, 0, W, H);

  if (state.roomTheme === 'halloween') {
    const stars = [
      [18, 18], [46, 14], [80, 20], [184, 16], [208, 12], [248, 34], [14, 48], [246, 220], [18, 232],
    ];
    stars.forEach(([sx, sy], i) => {
      ctx.fillStyle = i % 2 === 0 ? '#ffe699' : '#d9b8ff';
      ctx.fillRect(sx, sy, 2, 2);
    });
    // Lua crescente redonda
    ctx.fillStyle = '#ffe999';
    ctx.beginPath();
    ctx.arc(234, 22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.backdrop;
    ctx.beginPath();
    ctx.arc(238, 19, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (state.roomTheme === 'starlight') {
    const cosmicStars = [
      [14, 16], [42, 28], [76, 12], [112, 24], [156, 14], [198, 26], [242, 42],
      [18, 56], [248, 196], [16, 214], [228, 232], [38, 244], [210, 12],
    ];
    cosmicStars.forEach(([sx, sy], i) => {
      ctx.fillStyle = i % 3 === 0 ? '#38bdf8' : (i % 3 === 1 ? '#f472b6' : '#fef08a');
      ctx.fillRect(sx, sy, 2, 2);
    });
    // Planetinha anelado lo-fi no canto superior direito
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(230, 24, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(230, 24, 13, 4, -0.32, 0, Math.PI * 2);
    ctx.stroke();
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
      { x: F_LEFT.x - 3, y: F_LEFT.y + 11 },
      { x: F_BACK.x, y: F_BACK.y + 12 },
      { x: F_RIGHT.x + 3, y: F_RIGHT.y + 11 },
      { x: F_FRONT.x, y: F_FRONT.y + 13 },
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
  const tiles = 10;
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

function isThemeUnlocked(tDef) {
  if (!tDef) return false;
  return (
    state.unlockedThemes.includes(tDef.id) ||
    Boolean(tDef.secretId && (state.unlockedSecretIds || []).includes(tDef.secretId))
  );
}

function renderThemeChips() {
  document.querySelectorAll('.theme-chip').forEach((btn) => {
    const tId = btn.dataset.theme;
    const tDef = ROOM_THEME_CATALOG.find((t) => t.id === tId);
    if (!tDef) return;
    const unlocked = isThemeUnlocked(tDef);
    if (tDef.secret && !unlocked) {
      btn.classList.add('hidden');
      return;
    }
    btn.classList.remove('hidden');
    const isActive = state.roomTheme === tId;
    btn.classList.toggle('active', isActive);
    btn.classList.toggle('locked', !unlocked);
    btn.textContent = unlocked ? tDef.chipLabel : `${tDef.chipLabel} 🔒${tDef.price}`;
    btn.title = unlocked
      ? `Usar ${tDef.name}`
      : `Desbloquear ${tDef.name} por ${tDef.price} moedas`;
  });
}

function applyRoomTheme(theme) {
  if (!state.unlockedThemes.includes(theme)) {
    state.unlockedThemes.push(theme);
  }
  state.roomTheme = theme;
  document.body.classList.remove('theme-cozy', 'theme-pastel', 'theme-bamboo', 'theme-halloween', 'theme-starlight');
  document.body.classList.add(`theme-${theme}`);
  renderThemeChips();
  drawIsometricRoom();
  saveState();
}

function buyOrApplyTheme(themeId) {
  const tDef = ROOM_THEME_CATALOG.find((t) => t.id === themeId);
  if (!tDef) return;
  if (isThemeUnlocked(tDef)) {
    window.purrSound.playClick();
    applyRoomTheme(themeId);
    renderShop();
    return;
  }
  if (tDef.secret) {
    window.purrSound.playSad();
    if (roomActors[0]) showRoomPetSpeech(roomActors[0], '🔒 Tema secreto do clube Adote um Dev!');
    return;
  }
  if (isPremiumLocked(tDef)) {
    openPremiumShopPrompt(tDef);
    return;
  }
  if (state.coins < tDef.price) {
    window.purrSound.playSad();
    if (roomActors[0]) showRoomPetSpeech(roomActors[0], `Precisa de 🪙 ${tDef.price} moedas!`);
    return;
  }
  state.coins -= tDef.price;
  state.unlockedThemes.push(themeId);
  window.purrSound.playCoin();
  applyRoomTheme(themeId);
  updateCoinsUI();
  renderShop();
  renderInventory();
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], `Tema novo: ${tDef.name}! 🎨✨`);
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

function getItemRoomScale(def) {
  if (!def) return 1.0;
  if (def.animated || def.id === 'decor_eye_jar') return 0.24;
  if (def.subCategory === 'potinho') return 0.65;
  if (['bed_blue', 'bed_charcoal', 'bed_berry', 'bed_moss'].includes(def.id)) return 0.72;
  if (def.id === 'house_cozy') return 1.12;
  if (def.subCategory === 'janela') return 0.95;
  if (def.id === 'shelf_wood') return 0.82;
  if (['post_pink', 'post_olive', 'post_blue', 'scratch_low_white', 'scratch_low_wood', 'plant_tall'].includes(def.id)) {
    return 0.85;
  }
  if (def.id === 'tower_deluxe') return 1.15;
  if (def.id === 'plant_mini') return 1.0;
  if (['art_stripes', 'art_abstract', 'art_plant'].includes(def.id)) return 0.85;
  if (['art_cat_portrait', 'art_heart_grey'].includes(def.id)) return 1.4;
  if (def.id === 'art_dog_golden') return 1.1;
  if (['ball_sage', 'ball_indigo'].includes(def.id)) return 0.85;
  if (['yarn_pink', 'yarn_blue'].includes(def.id)) return 1.3;
  if (def.id === 'decor_candle') return 1.5;
  if (def.id === 'furn_sec_arcade') return 0.65;
  return 1.0;
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

    const scale = getItemRoomScale(def);
    const drawW = Math.max(10, Math.round(def.width * scale));
    const drawH = Math.max(10, Math.round(def.height * scale));

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
      img.draggable = false;
      if (placed.flip) img.style.transform = 'scaleX(-1)';
      wrap.appendChild(img);
    }

    wrap.draggable = false;
    wrap.addEventListener('dragstart', (e) => e.preventDefault());
    wrap.addEventListener('pointerdown', (e) => startDraggingItem(e, placed.uid));
    layer.appendChild(wrap);
  });

  // Comidinhas servidas (em potinhos, mesas ou no chão)
  (state.placedFoods || []).forEach((food) => {
    const def = getCatalogItem(food.foodId);
    if (!def) return;

    const wrap = document.createElement('div');
    wrap.className = 'placed-food';
    wrap.dataset.foodUid = food.uid;
    wrap.title = `${def.name} — Clique para chamar o pet!`;
    wrap.style.left = `${food.x}%`;
    wrap.style.top = `${food.y}%`;
    wrap.style.zIndex = String(food.z || Math.round(food.y) + 1);

    const keepBaseFoodSize =
      def.id === 'food_kibble_bag' ||
      def.id === 'coffee_latte' ||
      def.id === 'coffee_moka' ||
      def.id === 'food_taiyaki';
    const baseSize = food.inBowl ? 20 : 25;
    const size = keepBaseFoodSize ? baseSize : Math.round(baseSize * 1.48);
    const img = document.createElement('img');
    img.src = def.image;
    img.width = size;
    img.height = size;
    img.alt = def.name;
    img.draggable = false;
    wrap.appendChild(img);
    wrap.draggable = false;
    wrap.addEventListener('dragstart', (e) => e.preventDefault());

    wrap.addEventListener('click', (e) => {
      e.stopPropagation();
      if (heldFood) {
        placeHeldFoodInRoom(e.clientX, e.clientY, food.hostUid || null);
        return;
      }
      assignNearestActorToFood(food);
    });
    layer.appendChild(wrap);
  });
}

function clearSurfaceTargetHighlights() {
  document.querySelectorAll('.placed-item.surface-target').forEach((el) => {
    el.classList.remove('surface-target');
  });
}

function findHostSurface(px, py, draggedPlaced, rect) {
  if (!rect?.width || !rect?.height) return null;
  const hosts = state.placedItems
    .filter((h) => h.uid !== draggedPlaced.uid && SURFACE_SPECS[h.itemId])
    .sort((a, b) => (b.z || Math.round(b.y)) - (a.z || Math.round(a.y)));

  for (const host of hosts) {
    const spec = SURFACE_SPECS[host.itemId];
    const hostDef = getCatalogItem(host.itemId);
    if (!hostDef) continue;

    const scale = getItemRoomScale(hostDef);
    const drawW = Math.max(10, Math.round(hostDef.width * scale));
    const drawH = Math.max(10, Math.round(hostDef.height * scale));
    const hostWPct = (drawW / rect.width) * 100;
    const hostHPct = (drawH / rect.height) * 100;

    const halfX = hostWPct * spec.xSpanFactor;
    const minY = host.y - hostHPct * spec.maxUpFactor;
    const maxY = host.y - hostHPct * spec.minUpFactor;
    const hitPad = 1.6;

    if (
      px >= host.x - halfX - hitPad &&
      px <= host.x + halfX + hitPad &&
      py >= minY - hitPad &&
      py <= maxY + hitPad
    ) {
      const snappedX = clamp(px, host.x - halfX, host.x + halfX);
      let snappedY = clamp(py, minY, maxY);

      if (Array.isArray(spec.tiers) && spec.tiers.length > 0 && hostHPct > 0) {
        const upRatio = (host.y - snappedY) / hostHPct;
        let bestTier = spec.tiers[0];
        let bestDist = Infinity;
        for (const t of spec.tiers) {
          const dist = Math.abs(upRatio - t);
          if (dist < bestDist) {
            bestDist = dist;
            bestTier = t;
          }
        }
        snappedY = host.y - bestTier * hostHPct;
      }

      return {
        host,
        x: Number(snappedX.toFixed(2)),
        y: Number(snappedY.toFixed(2)),
      };
    }
  }
  return null;
}

function startDraggingItem(e, uid) {
  e.stopPropagation();
  if (heldFood) {
    if (e.button === 0) {
      e.preventDefault();
      placeHeldFoodInRoom(e.clientX, e.clientY, uid);
    }
    return;
  }
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  const placed = state.placedItems.find((p) => p.uid === uid);
  if (!placed) return;

  selectPlacedItem(uid);
  const canvasEl = document.getElementById('roomCanvas');
  const rect = canvasEl.getBoundingClientRect();
  const itemEl = e.currentTarget;
  const clickPctX = ((e.clientX - rect.left) / rect.width) * 100;
  const clickPctY = ((e.clientY - rect.top) / rect.height) * 100;

  dragState = {
    uid,
    placed,
    itemEl,
    rect,
    def: getCatalogItem(placed.itemId),
    grabOffsetX: placed.x - clickPctX,
    grabOffsetY: placed.y - clickPctY,
  };
  document.body.classList.add('dragging-furniture');
  try {
    itemEl.setPointerCapture?.(e.pointerId);
  } catch {
    // fallback if synthetic or unsupported pointerId
  }
}

function handleRoomPointerMove(e) {
  updateHeldFoodCursorPos(e.clientX, e.clientY);
  if (!dragState) return;
  const { placed, itemEl, rect, def, grabOffsetX, grabOffsetY } = dragState;
  const px = ((e.clientX - rect.left) / rect.width) * 100 + grabOffsetX;
  const py = ((e.clientY - rect.top) / rect.height) * 100 + grabOffsetY;
  const prevX = placed.x;
  const prevY = placed.y;

  clearSurfaceTargetHighlights();

  if (def?.wallItem) {
    const prevSide = placed.x < 50 ? 'left' : 'right';
    const clamped = clampToIsometricWall(px, py, def);
    placed.x = clamped.x;
    placed.y = clamped.y;
    placed.z = Math.round(placed.y);
    const nextSide = placed.x < 50 ? 'left' : 'right';
    if (prevSide !== nextSide) {
      placed.flip = getAutoWallFlip(placed.itemId, placed.x);
      const mediaEl = itemEl.querySelector('img, canvas');
      if (mediaEl) {
        mediaEl.style.transform = placed.flip ? 'scaleX(-1)' : '';
      }
    }
  } else if (canItemSitOnSurface(def)) {
    const surfaceHit = findHostSurface(px, py, placed, rect);
    if (surfaceHit) {
      placed.x = surfaceHit.x;
      placed.y = surfaceHit.y;
      placed.onSurfaceUid = surfaceHit.host.uid;
      placed.z = computeSurfaceChildZ(surfaceHit.host, placed.y);
      const hostEl = document.querySelector(`.placed-item[data-uid="${surfaceHit.host.uid}"]`);
      hostEl?.classList.add('surface-target');
    } else {
      placed.onSurfaceUid = null;
      const clamped = clampToIsometricFloor(px, py, def);
      placed.x = clamped.x;
      placed.y = clamped.y;
      placed.z = Math.round(placed.y);
    }
  } else {
    placed.onSurfaceUid = null;
    const clamped = clampToIsometricFloor(px, py, def);
    placed.x = clamped.x;
    placed.y = clamped.y;
    placed.z = Math.round(placed.y);
  }

  itemEl.style.left = `${placed.x}%`;
  itemEl.style.top = `${placed.y}%`;
  itemEl.style.zIndex = String(placed.z);

  const deltaX = placed.x - prevX;
  const deltaY = placed.y - prevY;
  const movedHostUids = new Set([placed.uid]);

  if (isSurfaceDef(def)) {
    state.placedItems.forEach((child) => {
      if (child.onSurfaceUid !== placed.uid) return;
      movedHostUids.add(child.uid);
      child.x = Number((child.x + deltaX).toFixed(2));
      child.y = Number((child.y + deltaY).toFixed(2));
      child.z = computeSurfaceChildZ(placed, child.y);
      const childEl = document.querySelector(`.placed-item[data-uid="${child.uid}"]`);
      if (childEl) {
        childEl.style.left = `${child.x}%`;
        childEl.style.top = `${child.y}%`;
        childEl.style.zIndex = String(child.z);
      }
    });
  }

  (state.placedFoods || []).forEach((food) => {
    if (!food.hostUid || !movedHostUids.has(food.hostUid)) return;
    food.x = Number((food.x + deltaX).toFixed(2));
    food.y = Number((food.y + deltaY).toFixed(2));
    const hostItem = state.placedItems.find((p) => p.uid === food.hostUid);
    food.z = hostItem
      ? (isSurfaceDef(def) && food.hostUid === placed.uid
        ? computeSurfaceChildZ(placed, food.y)
        : (hostItem.z || Math.round(hostItem.y)) + 2)
      : Math.round(food.y) + 1;
    const foodEl = document.querySelector(`.placed-food[data-food-uid="${food.uid}"]`);
    if (foodEl) {
      foodEl.style.left = `${food.x}%`;
      foodEl.style.top = `${food.y}%`;
      foodEl.style.zIndex = String(food.z);
    }
  });
}

function stopDraggingItem(e) {
  if (!dragState) return;
  if (dragState.itemEl && e?.pointerId !== undefined) {
    try {
      dragState.itemEl.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore if capture already released
    }
  }
  dragState = null;
  document.body.classList.remove('dragging-furniture');
  clearSurfaceTargetHighlights();
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
    const rawX = nativeSide === 'left' ? 18 + Math.random() * 22 : 60 + Math.random() * 22;
    const baseY = 44.62 + Math.abs(rawX - 50) * 0.5;
    const clamped = clampToIsometricWall(rawX, baseY - 14, def);
    x = clamped.x;
    y = clamped.y;
    flip = getAutoWallFlip(itemId, x);
  } else {
    const rawX = 24 + Math.random() * 52;
    const rawY = 58 + Math.random() * 22;
    const clamped = clampToIsometricFloor(rawX, rawY, def);
    x = clamped.x;
    y = clamped.y;
  }

  const entry = { uid, itemId, x, y, flip, z: Math.round(y), onSurfaceUid: null };
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

function buildThemeSwatch(themeId) {
  const pal = ISO_THEME_PALETTES[themeId] || ISO_THEME_PALETTES.cozy;
  const wrap = document.createElement('div');
  wrap.className = 'theme-swatch-preview';
  wrap.style.background = pal.floorBase;

  const leftWall = document.createElement('div');
  leftWall.style.cssText = `position:absolute;left:0;top:0;width:50%;height:58%;background:${pal.wallLeft};border-right:1px solid ${pal.outline};`;
  const rightWall = document.createElement('div');
  rightWall.style.cssText = `position:absolute;right:0;top:0;width:50%;height:58%;background:${pal.wallRight};`;
  const rug = document.createElement('div');
  rug.style.cssText = `position:absolute;left:28%;bottom:8%;width:44%;height:26%;background:${pal.rugOuter};border:1px solid ${pal.outline};border-radius:3px;`;

  wrap.appendChild(leftWall);
  wrap.appendChild(rightWall);
  wrap.appendChild(rug);
  return wrap;
}

function renderThemeShopCards(grid) {
  ROOM_THEME_CATALOG.forEach((tDef) => {
    const unlocked = isThemeUnlocked(tDef);
    if (tDef.secret && !unlocked) return;

    const card = document.createElement('div');
    card.className = 'shop-card';
    card.title = `${tDef.name} — ${tDef.description}`;

    const preview = document.createElement('div');
    preview.className = 'shop-preview';
    preview.appendChild(buildThemeSwatch(tDef.id));

    const title = document.createElement('div');
    title.className = 'shop-title';
    title.textContent = tDef.name;

    const desc = document.createElement('div');
    desc.className = 'shop-desc';
    desc.textContent = tDef.description;

    const btn = document.createElement('button');
    btn.className = 'shop-action-btn';

    const active = state.roomTheme === tDef.id;
    const premiumLocked = !unlocked && isPremiumLocked(tDef);
    if (premiumLocked) {
      card.classList.add('is-premium-locked');
      const badge = document.createElement('span');
      badge.className = 'premium-badge';
      badge.textContent = '👑 Loja Premium';
      card.appendChild(badge);
    }

    if (active) {
      btn.classList.add('equipped');
      btn.textContent = '✓ Tema em Uso';
      btn.disabled = true;
    } else if (unlocked) {
      btn.classList.add('owned');
      btn.textContent = '🎨 Aplicar Tema';
      btn.onclick = () => buyOrApplyTheme(tDef.id);
    } else if (premiumLocked) {
      btn.classList.add('premium-locked');
      btn.textContent = `🔒 👑 Loja Premium (🪙 ${tDef.price})`;
      btn.onclick = () => openPremiumShopPrompt(tDef);
    } else {
      btn.innerHTML = `🪙 ${tDef.price} • Desbloquear`;
      btn.disabled = state.coins < tDef.price;
      btn.onclick = () => buyOrApplyTheme(tDef.id);
    }

    card.appendChild(preview);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(btn);
    grid.appendChild(card);
  });
}

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
  } else if (shopCategory === 'hats') {
    list = catalog.hats || [];
  } else if (shopCategory === 'pets') {
    list = catalog.pets;
  }

  if (shopCategory === 'furniture' && (shopSubFilter === 'all' || shopSubFilter === 'tema')) {
    renderThemeShopCards(grid);
  }

  const isSecretUnlocked = (entry) => (state.unlockedSecretIds || []).includes(entry.id);
  list = list.filter((entry) => !entry.secret || isSecretUnlocked(entry));

  list.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.title = entry.description
      ? `${entry.name} — ${entry.description}`
      : `${entry.name}`;

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
    } else if (shopCategory === 'hats') {
      const catDef = getCatDef(state.activeCat);
      const anim = catDef ? getCatAnimationForState(catDef, 'idle') : null;
      const cv = document.createElement('canvas');
      cv.width = 68;
      cv.height = 76;
      cv.dataset.previewHat = entry.id;
      preview.appendChild(cv);
      if (anim) loadImage(anim.src);
      loadImage(entry.image);
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
    const isItemOwned =
      (shopCategory === 'cats' && state.unlockedCats.includes(entry.id)) ||
      (shopCategory === 'hats' && state.unlockedHats.includes(entry.id)) ||
      (shopCategory === 'pets' && state.unlockedPets.includes(entry.id));
    const premiumLocked = !isItemOwned && isPremiumLocked(entry);
    if (premiumLocked) {
      card.classList.add('is-premium-locked');
      const badge = document.createElement('span');
      badge.className = 'premium-badge';
      badge.textContent = '👑 Loja Premium';
      card.appendChild(badge);
    }

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
      } else if (premiumLocked) {
        btn.classList.add('premium-locked');
        btn.textContent = `🔒 👑 Loja Premium (🪙 ${entry.price})`;
        btn.onclick = () => openPremiumShopPrompt(entry);
      } else {
        btn.innerHTML = `🪙 ${entry.price} • Adotar`;
        btn.disabled = state.coins < entry.price;
        btn.onclick = () => buyCat(entry);
      }
    } else if (shopCategory === 'hats') {
      const owned = state.unlockedHats.includes(entry.id);
      const equipped = state.activeHat === entry.id;
      if (equipped) {
        btn.classList.add('equipped');
        btn.textContent = '✓ Usando (Tirar)';
        btn.onclick = () => {
          window.purrSound.playClick();
          state.activeHat = null;
          saveState();
          renderShop();
          renderInventory();
        };
      } else if (owned) {
        btn.classList.add('owned');
        btn.textContent = 'Equipar Chapéu';
        btn.onclick = () => {
          window.purrSound.playClick();
          state.activeHat = entry.id;
          loadImage(entry.image);
          saveState();
          renderShop();
          renderInventory();
        };
      } else if (entry.loginReward) {
        btn.classList.add('owned');
        btn.textContent = '☁️ Login Google (Grátis)';
        btn.onclick = () => openLoginPromptModal(false);
      } else {
        btn.innerHTML = `🪙 ${entry.price} • Comprar`;
        btn.disabled = state.coins < entry.price;
        btn.onclick = () => buyHat(entry);
      }
    } else if (shopCategory === 'pets') {
      const owned = state.unlockedPets.includes(entry.id);
      const active = state.activePets.includes(entry.id);
      if (owned) {
        btn.classList.add(active ? 'equipped' : 'owned');
        btn.textContent = active ? '✓ Passeando no Quarto' : 'Chamar p/ Quarto';
        btn.onclick = () => togglePetInRoom(entry.id);
      } else if (premiumLocked) {
        btn.classList.add('premium-locked');
        btn.textContent = `🔒 👑 Loja Premium (🪙 ${entry.price})`;
        btn.onclick = () => openPremiumShopPrompt(entry);
      } else {
        btn.innerHTML = `🪙 ${entry.price} • Adotar`;
        btn.disabled = state.coins < entry.price;
        btn.onclick = () => buyPet(entry);
      }
    } else if (shopCategory === 'food') {
      const isHoldingThis = heldFood && heldFood.id === entry.id;
      if (premiumLocked) {
        btn.classList.add('premium-locked');
        btn.textContent = `🔒 👑 Loja Premium (🪙 ${entry.price})`;
        btn.onclick = () => openPremiumShopPrompt(entry);
      } else {
        btn.innerHTML = isHoldingThis ? '✕ Soltar' : `🪙 ${entry.price} • Pegar`;
        btn.disabled = !isHoldingThis && state.coins < entry.price;
        if (isHoldingThis) btn.classList.add('active');
        btn.onclick = (ev) => startHoldingFood(entry, ev);
      }
    } else {
      const ownedCount = state.ownedItems[entry.id] || 0;
      if (premiumLocked) {
        btn.classList.add('premium-locked');
        btn.textContent = `🔒 👑 Loja Premium (🪙 ${entry.price})`;
        btn.onclick = () => openPremiumShopPrompt(entry);
      } else {
        btn.innerHTML =
          ownedCount > 0
            ? `🪙 ${entry.price} • Comprar +1 (${ownedCount})`
            : `🪙 ${entry.price} • Comprar`;
        btn.disabled = state.coins < entry.price;
        btn.onclick = () => buyFurniture(entry);
      }
    }

    card.appendChild(preview);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(btn);
    grid.appendChild(card);
  });
}

function buyFurniture(item) {
  if (isPremiumLocked(item)) {
    openPremiumShopPrompt(item);
    return;
  }
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
  if (isPremiumLocked(catDef)) {
    openPremiumShopPrompt(catDef);
    return;
  }
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

function buyHat(hatDef) {
  if (state.coins < hatDef.price || state.unlockedHats.includes(hatDef.id)) return;
  state.coins -= hatDef.price;
  state.unlockedHats.push(hatDef.id);
  state.activeHat = hatDef.id;
  loadImage(hatDef.image);
  window.purrSound.playCoin();
  saveState();
  updateCoinsUI();
  renderShop();
  renderInventory();
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], `Amei o ${hatDef.name}! 🎩✨`);
}

function buyPet(petDef) {
  if (isPremiumLocked(petDef)) {
    openPremiumShopPrompt(petDef);
    return;
  }
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

function startHoldingFood(item, ev = null) {
  if (!item) return;
  if (isPremiumLocked(item)) {
    openPremiumShopPrompt(item);
    return;
  }
  if (heldFood && heldFood.id === item.id) {
    cancelHeldFood();
    return;
  }
  if (state.coins < item.price) {
    window.purrSound.playClick();
    showCompactSpeech('🪙 Moedinhas insuficientes!');
    return;
  }
  window.purrSound.playClick();
  heldFood = item;
  const cursor = document.getElementById('heldFoodCursor');
  const img = document.getElementById('heldFoodImg');
  if (img) {
    img.src = item.image;
    img.alt = item.name;
  }
  if (cursor) {
    if (ev && typeof ev.clientX === 'number' && typeof ev.clientY === 'number') {
      cursor.style.left = `${ev.clientX}px`;
      cursor.style.top = `${ev.clientY}px`;
    }
    cursor.classList.remove('hidden');
  }
  document.body.classList.add('holding-food');
  if (roomActors[0]) {
    showRoomPetSpeech(roomActors[0], `Oba! ${item.name} — dê pra mim, no potinho ou no chão! 😋`);
  }
  if (shopCategory === 'food') renderShop();
}

function cancelHeldFood() {
  const wasHolding = Boolean(heldFood);
  heldFood = null;
  const cursor = document.getElementById('heldFoodCursor');
  if (cursor) cursor.classList.add('hidden');
  document.body.classList.remove('holding-food');
  if (wasHolding && shopCategory === 'food') renderShop();
}

function updateHeldFoodCursorPos(clientX, clientY) {
  if (!heldFood) return;
  const cursor = document.getElementById('heldFoodCursor');
  if (!cursor) return;
  cursor.style.left = `${clientX}px`;
  cursor.style.top = `${clientY}px`;
}

function consumeFoodByActor(actor, item, alreadyPaid = false) {
  if (!actor || !item) return false;
  if (!alreadyPaid) {
    if (state.coins < item.price) {
      cancelHeldFood();
      return false;
    }
    state.coins -= item.price;
  }

  window.purrSound.playMeow();

  if (item.buff?.type === 'coin_multiplier') {
    state.activeBuff = {
      type: 'coin_multiplier',
      multiplier: item.buff.multiplier,
      label: item.buff.label,
      name: item.name,
    };
    showCompactSpeech(`☕ ${item.buff.label} no próximo foco!`);
    showRoomPetSpeech(actor, `☕ Bônus ${item.buff.label} ativo!`);
    spawnRoomParticle(actor.x, actor.y - 12, '☕');
  } else if (item.buff?.type === 'streak_freeze') {
    if (!state.streak) state.streak = { current: 0, best: 0, lastClaimDate: null, freezeShields: 0 };
    const addedFreezes = item.buff.freezes || 1;
    state.streak.freezeShields = (state.streak.freezeShields || 0) + addedFreezes;
    const plural = addedFreezes > 1 ? 's' : '';
    showCompactSpeech(`❄️ +${addedFreezes} Escudo${plural} de Ofensiva!`);
    showRoomPetSpeech(actor, `❄️ +${addedFreezes} Escudo${plural}! Total: ${state.streak.freezeShields}`);
    spawnRoomParticle(actor.x, actor.y - 12, '❄️');
    if (typeof renderStreakUI === 'function') renderStreakUI();
  } else {
    showRoomPetSpeech(actor, `Nhac nhac! ${item.name} 😋`);
    spawnRoomParticle(actor.x, actor.y - 12, '❤️');
    spawnRoomParticle(actor.x + 5, actor.y - 15, item.particle || '🐟');
    showCompactSpeech(
      actor.kind === 'cat' && isDinoId(actor.config?.id)
        ? '🦖 Raaawr! Que delícia!'
        : '😋 Que delícia, miau!'
    );
  }

  saveState();
  updateCoinsUI();
  updateTimerUI();
  renderShop();
  return true;
}

function findTargetBowl(px, py, clickedPlacedUid, rect) {
  if (clickedPlacedUid) {
    const clicked = state.placedItems.find((p) => p.uid === clickedPlacedUid);
    const cDef = clicked ? getCatalogItem(clicked.itemId) : null;
    if (cDef?.subCategory === 'potinho') return clicked;
  }
  if (!rect?.width || !rect?.height) return null;

  const bowls = state.placedItems
    .filter((p) => getCatalogItem(p.itemId)?.subCategory === 'potinho')
    .sort((a, b) => (b.z || Math.round(b.y)) - (a.z || Math.round(a.y)));

  for (const bowl of bowls) {
    const def = getCatalogItem(bowl.itemId);
    const scale = getItemRoomScale(def);
    const drawW = Math.max(12, Math.round((def.width || 24) * scale));
    const drawH = Math.max(12, Math.round((def.height || 24) * scale));
    const halfWPct = Math.max(3.8, ((drawW / rect.width) * 100) * 0.75);
    const hPct = Math.max(5.5, (drawH / rect.height) * 100);
    if (
      px >= bowl.x - halfWPct &&
      px <= bowl.x + halfWPct &&
      py >= bowl.y - hPct * 1.1 &&
      py <= bowl.y + 2.5
    ) {
      return bowl;
    }
  }
  return null;
}

function assignNearestActorToFood(foodEntry) {
  if (!foodEntry || roomActors.length === 0) return null;
  const available = roomActors.filter((a) => !a.targetFoodUid || a.targetFoodUid === foodEntry.uid);
  const pool = available.length > 0 ? available : roomActors;
  let best = pool[0];
  let bestDist = Infinity;
  for (const actor of pool) {
    const d = Math.hypot(actor.x - foodEntry.x, actor.y - foodEntry.y);
    if (d < bestDist) {
      bestDist = d;
      best = actor;
    }
  }
  best.targetFoodUid = foodEntry.uid;
  best.behavior = 'walk';
  const target = clampToIsometricFloor(foodEntry.x, foodEntry.y + 1.2);
  best.targetX = target.x;
  best.targetY = target.y;
  best.behaviorTimer = 9;
  return best;
}

function placeHeldFoodInRoom(clientX, clientY, clickedPlacedUid = null) {
  if (!heldFood) return false;
  if (state.coins < heldFood.price) {
    cancelHeldFood();
    return false;
  }

  const roomCanvas = document.getElementById('roomCanvas');
  const rect = roomCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;

  const px = ((clientX - rect.left) / rect.width) * 100;
  const py = ((clientY - rect.top) / rect.height) * 100;
  const item = heldFood;

  const bowl = findTargetBowl(px, py, clickedPlacedUid, rect);
  const surfaceHit = bowl ? null : findHostSurface(px, py, { uid: '__held_food__' }, rect);

  let fx;
  let fy;
  let fz;
  let hostUid = null;
  let inBowl = false;

  if (bowl) {
    hostUid = bowl.uid;
    inBowl = true;
    fx = bowl.x;
    fy = Number((bowl.y - 1.4).toFixed(2));
    fz = (bowl.z || Math.round(bowl.y)) + 2;
  } else if (surfaceHit) {
    hostUid = surfaceHit.host.uid;
    fx = surfaceHit.x;
    fy = surfaceHit.y;
    fz = computeSurfaceChildZ(surfaceHit.host, fy);
  } else {
    const floorPos = clampToIsometricFloor(px, py, { width: 25, height: 25 });
    fx = floorPos.x;
    fy = floorPos.y;
    fz = Math.round(fy) + 1;
  }

  state.coins -= item.price;
  const foodEntry = {
    uid: `food_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    foodId: item.id,
    x: fx,
    y: fy,
    z: fz,
    hostUid,
    inBowl,
  };
  state.placedFoods.push(foodEntry);
  window.purrSound.playCoin();

  cancelHeldFood();
  saveState();
  renderRoom();
  updateCoinsUI();
  renderShop();

  const chosen = assignNearestActorToFood(foodEntry);
  if (chosen) {
    showRoomPetSpeech(
      chosen,
      inBowl
        ? `Oba, ${item.name} no potinho! 🥣`
        : surfaceHit
        ? `Uau, ${item.name} na mesa! 😋`
        : `Eba, ${item.name}! Tô indo comer! 🐾`
    );
  }
  return true;
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

  // Chapéus dos Gatinhos
  const hatsList = document.getElementById('invHatsList');
  if (hatsList) {
    hatsList.innerHTML = '';
    const noneBtn = document.createElement('button');
    noneBtn.className = 'inv-pill-btn' + (!state.activeHat ? ' active' : '');
    noneBtn.textContent = '✕ Sem Chapéu';
    noneBtn.onclick = () => {
      window.purrSound.playClick();
      state.activeHat = null;
      saveState();
      renderInventory();
      renderShop();
    };
    hatsList.appendChild(noneBtn);

    state.unlockedHats.forEach((hid) => {
      const def = getHatDef(hid);
      if (!def) return;
      const btn = document.createElement('button');
      btn.className = 'inv-pill-btn' + (state.activeHat === hid ? ' active' : '');
      btn.textContent = `🎩 ${def.name}` + (state.activeHat === hid ? ' ✓' : '');
      btn.onclick = () => {
        window.purrSound.playClick();
        state.activeHat = hid;
        loadImage(def.image);
        saveState();
        renderInventory();
        renderShop();
      };
      hatsList.appendChild(btn);
    });
  }

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
    card.title =
      available > 0
        ? `${def.name} — Clique em "+ Colocar" para levar ao quarto`
        : `${def.name} — Clique em "✓ No quarto" para selecionar este item`;

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
  const isDino = isDinoId(state.activeCat);
  p.textContent = randomFrom(isDino ? ['🦖', '🌵', '✨', '💚'] : ['❤️', '💖', '🐾', '✨']);
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
    roomActors.push(createRoomActor('main-cat', 'cat', catDef, 50, 68));
  }

  state.activePets.forEach((pid, idx) => {
    const petDef = getPetDef(pid);
    if (petDef) {
      const pos = clampToIsometricFloor(34 + idx * 16, 70);
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
  const box = getActorCanvasSize(kind, config);
  canvas.width = box.w;
  canvas.height = box.h;

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
    if (heldFood) {
      const foodItem = heldFood;
      cancelHeldFood();
      consumeFoodByActor(actor, foodItem, false);
      return;
    }
    if (actor.kind === 'cat') {
      if (isDinoId(actor.config.id)) {
        window.purrSound.playClick();
        spawnRoomParticle(actor.x, actor.y - 10, randomFrom(['🦖', '🌵', '✨', '💚']));
        showRoomPetSpeech(actor, randomFrom(DINO_PHRASES));
      } else {
        window.purrSound.playPurr();
        spawnRoomParticle(actor.x, actor.y - 10, randomFrom(['❤️', '💖', '🐾']));
        showRoomPetSpeech(actor, randomFrom(SPEECH_PHRASES.pet));
      }
    } else if (actor.config.id === 'pet_bunny') {
      window.purrSound.playClick();
      spawnRoomParticle(actor.x, actor.y - 10, randomFrom(['🥕', '🌸', '💖', '✨']));
      showRoomPetSpeech(actor, randomFrom(['🐰💕', '🥕✨', '🌸🐰', '🍀💖', '✨🥕']));
    } else if (actor.config.id === 'pet_zombie_hand') {
      window.purrSound.playClick();
      spawnRoomParticle(actor.x, actor.y - 10, randomFrom(['✨', '🔮', '💜', '🕯️']));
      showRoomPetSpeech(actor, randomFrom(['🖐️✨', '🔮💜', '🕯️🖐️', '💀✨', '✨🖤']));
    } else {
      window.purrSound.playClick();
      spawnRoomParticle(actor.x, actor.y - 10, randomFrom(['🦴', '🐾', '💖', '✨']));
      showRoomPetSpeech(actor, randomFrom(['🐶💖', '🦴✨', '🐾❤️']));
    }
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
  drawCatFrameWithHat(
    canvas,
    anim,
    frameIdx,
    compactPet.dir < 0,
    getActorSpriteScale('cat', catDef, true, anim.fw)
  );
}

function updateRoomActors(dt) {
  if (appMode !== 'expanded') return;

  roomActors.forEach((actor) => {
    if (actor.kind === 'cat' && (petMood === 'cheer' || petMood === 'cry')) {
      actor.targetFoodUid = null;
    } else {
      let targetFood = actor.targetFoodUid
        ? (state.placedFoods || []).find((f) => f.uid === actor.targetFoodUid)
        : null;
      if (actor.targetFoodUid && !targetFood) {
        actor.targetFoodUid = null;
      }

      if (targetFood) {
        const walkTarget = clampToIsometricFloor(targetFood.x, targetFood.y + 1.2);
        const dx = walkTarget.x - actor.x;
        const dy = walkTarget.y - actor.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 2.2) {
          const foodId = targetFood.foodId;
          const eatenUid = targetFood.uid;
          state.placedFoods = (state.placedFoods || []).filter((f) => f.uid !== eatenUid);
          roomActors.forEach((a) => {
            if (a.targetFoodUid === eatenUid) a.targetFoodUid = null;
          });
          actor.behavior = 'idle';
          actor.behaviorTimer = 2.0;
          const foodDef = getCatalogItem(foodId);
          renderRoom();
          if (foodDef) {
            consumeFoodByActor(actor, foodDef, true);
          } else {
            saveState();
          }
        } else {
          actor.behavior = 'walk';
          actor.dir = dx >= 0 ? 1 : -1;
          const speed = 14 * dt;
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
      } else {
        actor.behaviorTimer -= dt;
        if (actor.behaviorTimer <= 0) {
          const untargetedFoods = (state.placedFoods || []).filter(
            (f) => !roomActors.some((a) => a.targetFoodUid === f.uid)
          );
          if (untargetedFoods.length > 0 && Math.random() < 0.72) {
            const chosenFood = randomFrom(untargetedFoods);
            const walkTarget = clampToIsometricFloor(chosenFood.x, chosenFood.y + 1.2);
            actor.targetFoodUid = chosenFood.uid;
            actor.behavior = 'walk';
            actor.targetX = walkTarget.x;
            actor.targetY = walkTarget.y;
            actor.behaviorTimer = 8;
          } else {
            const roll = Math.random();
            if (roll < 0.52) {
              actor.behavior = 'walk';
              const target = clampToIsometricFloor(
                18 + Math.random() * 64,
                50 + Math.random() * 34
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
        }

        if (actor.behavior === 'walk' && !actor.targetFoodUid) {
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
    }

    let mood = actor.behavior;
    if (actor.kind === 'cat' && (petMood === 'cheer' || petMood === 'cry')) {
      mood = petMood;
    }

    if (actor.kind === 'cat') {
      const anim = getCatAnimationForState(actor.config, mood);
      const frame = Math.floor(animElapsed * (anim.fps || 5)) % anim.frames;
      drawCatFrameWithHat(
        actor.canvas,
        anim,
        frame,
        actor.dir < 0,
        getActorSpriteScale('cat', actor.config, false, anim.fw)
      );
    } else {
      const p = actor.config;
      const frame = Math.floor(animElapsed * (p.fps || 6)) % p.frames;
      drawSpriteSheetFrame(
        actor.canvas,
        p.src,
        p.fw,
        p.fh,
        frame,
        actor.dir < 0,
        getActorSpriteScale('pet', p, false, p.fw)
      );
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
    const previewScale = anim.fw <= 32 ? 1.55 : (anim.fh >= 64 ? 0.8 : 1.3);
    drawCatFrameWithHat(cv, anim, frame, false, previewScale, state.activeHat);
  });

  // Previews de chapéus no gatinho selecionado
  document.querySelectorAll('canvas[data-preview-hat]').forEach((cv) => {
    const catDef = getCatDef(state.activeCat);
    if (!catDef) return;
    const anim = getCatAnimationForState(catDef, 'idle');
    const frame = Math.floor(animElapsed * (anim.fps || 5)) % anim.frames;
    const previewScale = anim.fw <= 32 ? 1.85 : (anim.fh >= 64 ? 0.94 : 1.5);
    drawCatFrameWithHat(cv, anim, frame, false, previewScale, cv.dataset.previewHat);
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
    spawnCompactHeart();
    if (isDinoId(state.activeCat)) {
      window.purrSound.playClick();
      showCompactSpeech(randomFrom(DINO_PHRASES));
      return;
    }
    window.purrSound.playPurr();
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
  document.getElementById('closeAppBtn').addEventListener('click', () => {
    window.purrSound.playClick();
    saveState(true);
    if (window.purrAPI?.hideToTray) {
      window.purrAPI.hideToTray();
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
      buyOrApplyTheme(btn.dataset.theme);
    });
  });

  // Drag & Drop no Quarto
  const roomCanvas = document.getElementById('roomCanvas');
  roomCanvas.addEventListener('pointerdown', (e) => {
    const isRoomBg =
      e.target === roomCanvas ||
      e.target.id === 'roomBgCanvas' ||
      e.target.id === 'roomFurnitureLayer' ||
      e.target.id === 'roomPetsLayer';

    if (heldFood) {
      if (e.button === 2) {
        e.preventDefault();
        cancelHeldFood();
        return;
      }
      if (e.button === 0 && isRoomBg) {
        e.stopPropagation();
        placeHeldFoodInRoom(e.clientX, e.clientY, null);
        return;
      }
    }

    if (isRoomBg) {
      selectPlacedItem(null);
    }
  });
  window.addEventListener('contextmenu', (e) => {
    if (heldFood) {
      e.preventDefault();
      cancelHeldFood();
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && heldFood) {
      cancelHeldFood();
    }
  });
  window.addEventListener('pointermove', handleRoomPointerMove);
  window.addEventListener('pointerup', stopDraggingItem);
  window.addEventListener('pointercancel', stopDraggingItem);
  window.addEventListener('blur', stopDraggingItem);
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
    syncSurfaceChildrenZ(item);
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
    syncSurfaceChildrenZ(item);
    saveState();
    renderRoom();
  });
  document.getElementById('tbStoreBtn').addEventListener('click', () => {
    if (!selectedPlacedUid) return;
    const removedUid = selectedPlacedUid;
    window.purrSound.playClick();
    state.placedItems = state.placedItems.filter((p) => p.uid !== removedUid);
    state.placedItems.forEach((child) => {
      if (child.onSurfaceUid === removedUid) {
        const prevX = child.x;
        const prevY = child.y;
        child.onSurfaceUid = null;
        const cDef = getCatalogItem(child.itemId);
        const clamped = clampToIsometricFloor(child.x, child.y, cDef);
        child.x = clamped.x;
        child.y = clamped.y;
        child.z = Math.round(child.y);
        const shiftX = child.x - prevX;
        const shiftY = child.y - prevY;
        (state.placedFoods || []).forEach((food) => {
          if (food.hostUid === child.uid) {
            food.x = Number((food.x + shiftX).toFixed(2));
            food.y = Number((food.y + shiftY).toFixed(2));
            food.z = child.z + 2;
          }
        });
      }
    });
    state.placedFoods = (state.placedFoods || []).map((food) => {
      if (food.hostUid !== removedUid) return food;
      const clamped = clampToIsometricFloor(food.x, food.y, { width: 25, height: 25 });
      return {
        ...food,
        hostUid: null,
        inBowl: false,
        x: clamped.x,
        y: clamped.y,
        z: Math.round(clamped.y) + 1,
      };
    });
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
      const nextPhase = btn.dataset.phase;
      window.purrSound.playClick();
      if (timer.running && nextPhase !== timer.phase) {
        const isEn = getCurrentLang() === 'en';
        const phaseNames = isEn
          ? { focus: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break' }
          : { focus: 'Foco', shortBreak: 'Pausa', longBreak: 'Pausa Longa' };
        const msg = isEn
          ? `⏳ A ${phaseNames[timer.phase]} timer is already running! Pause or Give Up before switching.`
          : `⏳ Já existe um timer de ${phaseNames[timer.phase]} rodando! Pause ou dê Desistir antes de trocar.`;
        if (roomActors[0]) showRoomPetSpeech(roomActors[0], msg, 4200);
        showCompactSpeech(msg, 4200);
        return;
      }
      if (nextPhase !== timer.phase) {
        setPhase(nextPhase, true);
      }
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
    state.placedFoods = [];
    roomActors.forEach((a) => {
      a.targetFoodUid = null;
    });
    selectPlacedItem(null);
    saveState();
    renderRoom();
    renderInventory();
    updateTimerUI();
  });

  // Ofensiva Diária, Conta Google, Idioma, "Adote um Dev" & Banner Web
  document.getElementById('streakHeaderBtn')?.addEventListener('click', () => {
    window.purrSound.playClick();
    openStreakModal();
  });
  document.getElementById('compactStreakBadge')?.addEventListener('click', () => {
    window.purrSound.playClick();
    if (appMode === 'compact') setAppMode('expanded');
    openStreakModal();
  });
  document.getElementById('closeStreakModalBtn')?.addEventListener('click', () => {
    window.purrSound.playClick();
    closeStreakModal();
  });
  document.getElementById('claimDailyStreakBtn')?.addEventListener('click', claimDailyStreak);
  document.getElementById('openFreezeShopBtn')?.addEventListener('click', () => {
    window.purrSound.playClick();
    document.getElementById('streakModal')?.classList.add('hidden');
    shopCategory = 'food';
    document.querySelectorAll('.shop-cat-btn').forEach((b) => b.classList.toggle('active', b.dataset.cat === 'food'));
    switchSideTab('shop');
    renderShop();
  });

  document.getElementById('accountHeaderBtn')?.addEventListener('click', () => {
    window.purrSound.playClick();
    openLoginPromptModal(false);
  });
  document.getElementById('closeLoginModalBtn')?.addEventListener('click', () => {
    window.purrSound.playClick();
    closeLoginPromptModal();
  });
  document.getElementById('loginLaterBtn')?.addEventListener('click', () => {
    window.purrSound.playClick();
    closeLoginPromptModal();
  });
  document.getElementById('googleSignInBtn')?.addEventListener('click', handleGoogleSignIn);
  document.getElementById('syncCloudNowBtn')?.addEventListener('click', syncCloudNow);
  document.getElementById('googleSignOutBtn')?.addEventListener('click', handleGoogleSignOut);

  document.getElementById('langToggleBtn')?.addEventListener('click', () => {
    window.purrSound.playClick();
    const cur = getCurrentLang();
    state.lang = cur === 'pt' ? 'en' : 'pt';
    saveState(true);
    applyLanguageUI();
  });

  document.getElementById('subscribeDevBtn')?.addEventListener('click', handleSubscribeAdoptDev);
  document.getElementById('claimMonthlyDropBtn')?.addEventListener('click', claimMonthlySupporterDropUI);
  document.getElementById('webBannerCloseBtn')?.addEventListener('click', () => {
    document.getElementById('webPromoBanner')?.classList.add('hidden');
  });
  document.getElementById('updateAvailableBtn')?.addEventListener('click', () => {
    if (latestUpdateInfo?.autoReady && window.purrAPI?.installUpdate) {
      window.purrAPI.installUpdate();
      return;
    }
    const url = latestUpdateInfo?.url || window.purrCloud?.GITHUB_RELEASES_URL;
    if (url) window.open(url, '_blank', 'noopener');
  });

  if (window.purrAPI?.onUpdateStatus) {
    window.purrAPI.onUpdateStatus((payload) => {
      const btn = document.getElementById('updateAvailableBtn');
      if (!btn || !payload) return;
      if (payload.status === 'downloading') {
        btn.classList.remove('hidden');
        btn.textContent = `⬇️ v${payload.version || ''}`;
        btn.title = `Baixando atualização v${payload.version || ''} em segundo plano...`;
      } else if (payload.status === 'ready') {
        latestUpdateInfo = { ...(latestUpdateInfo || {}), version: payload.version, autoReady: true };
        btn.classList.remove('hidden');
        btn.textContent = `🔄 Atualizar v${payload.version || ''}`;
        btn.title = `Atualização v${payload.version || ''} pronta! Clique para reiniciar e aplicar (ou instala sozinho ao sair).`;
      }
    });
  }

  // Fechar modais ao clicar fora do card
  ['streakModal', 'loginPromptModal'].forEach((mid) => {
    document.getElementById(mid)?.addEventListener('click', (ev) => {
      if (ev.target?.id === mid) {
        if (mid === 'streakModal') closeStreakModal();
        else closeLoginPromptModal();
      }
    });
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
  if (tabName === 'support') renderSupportTab();
}

/* ============================================================================
   OFENSIVA DIÁRIA (DUOLINGO), CONTA GOOGLE, UPDATES, i18n & "ADOTE UM DEV"
   ============================================================================ */

let latestUpdateInfo = null;

function getCurrentLang() {
  return window.purrCloud ? window.purrCloud.getLang(state) : (state.lang || 'pt');
}

function tc(key) {
  return window.purrCloud ? window.purrCloud.t(key, getCurrentLang()) : key;
}

function normalizeStreakOnBoot() {
  if (!window.purrCloud) return;
  if (!state.streak) state.streak = { current: 0, best: 0, lastClaimDate: null, freezeShields: 0 };
  const today = window.purrCloud.getTodayISO();
  const last = state.streak.lastClaimDate;
  if (!last || last === today) return;

  const diff = window.purrCloud.diffDaysISO(last, today);
  if (diff <= 1) return;

  const missedDays = diff - 1;
  const shields = state.streak.freezeShields || 0;
  if (shields >= missedDays && state.streak.current > 0) {
    state.streak.freezeShields = shields - missedDays;
    // Atualiza última data para ontem para manter a ofensiva protegida hoje
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
    state.streak.lastClaimDate = yStr;
    saveState();
    setTimeout(() => {
      showCompactSpeech('❄️ Catnip Congelado salvou sua ofensiva!');
    }, 900);
  } else if (diff > 1) {
    state.streak.current = 0;
    saveState();
  }
}

function renderStreakUI() {
  const s = state.streak || { current: 0, best: 0, lastClaimDate: null, freezeShields: 0 };
  const today = window.purrCloud ? window.purrCloud.getTodayISO() : '';
  const claimedToday = s.lastClaimDate === today;

  const headerCnt = document.getElementById('headerStreakCount');
  if (headerCnt) headerCnt.textContent = String(s.current || 0);
  const compactBadge = document.getElementById('compactStreakBadge');
  if (compactBadge) {
    compactBadge.textContent = `🔥${s.current || 0}`;
    compactBadge.style.opacity = claimedToday ? '1' : '0.82';
  }

  const big = document.getElementById('streakCurrentBig');
  if (big) big.textContent = String(s.current || 0);
  const shieldsEl = document.getElementById('streakShieldsCount');
  if (shieldsEl) shieldsEl.textContent = String(s.freezeShields || 0);

  const track = document.getElementById('streakDaysTrack');
  if (track && window.purrCloud) {
    track.innerHTML = '';
    const rewards = window.purrCloud.STREAK_DAY_REWARDS;
    const completedMod = (s.current || 0) % 7;
    const activeCycleDone = (s.current || 0) > 0 && completedMod === 0 && claimedToday ? 7 : completedMod;

    rewards.forEach((amt, idx) => {
      const tile = document.createElement('div');
      const isDone = idx < activeCycleDone;
      const isToday = !claimedToday && idx === activeCycleDone;
      tile.className = 'streak-day-tile' + (isDone ? ' done' : '') + (isToday ? ' today' : '');
      tile.innerHTML = `<span>D${idx + 1}</span><span>${isDone ? '🔥' : '🪙'}</span><strong>+${amt}</strong>`;
      track.appendChild(tile);
    });
  }

  const claimBtn = document.getElementById('claimDailyStreakBtn');
  if (claimBtn) {
    claimBtn.disabled = claimedToday;
    claimBtn.textContent = claimedToday ? tc('streakClaimedBtn') : tc('streakClaimBtn');
  }
  const hint = document.getElementById('streakFreezeHint');
  if (hint) hint.textContent = tc('streakBuyShieldHint');
}

function openStreakModal() {
  renderStreakUI();
  document.getElementById('streakModal')?.classList.remove('hidden');
}

function closeStreakModal() {
  document.getElementById('streakModal')?.classList.add('hidden');
}

function claimDailyStreak() {
  if (!window.purrCloud) return;
  if (!state.streak) state.streak = { current: 0, best: 0, lastClaimDate: null, freezeShields: 0 };
  const today = window.purrCloud.getTodayISO();
  if (state.streak.lastClaimDate === today) return;

  const rewards = window.purrCloud.STREAK_DAY_REWARDS;
  const dayIdx = (state.streak.current || 0) % rewards.length;
  const coinsEarned = rewards[dayIdx];

  state.streak.current = (state.streak.current || 0) + 1;
  state.streak.best = Math.max(state.streak.best || 0, state.streak.current);
  state.streak.lastClaimDate = today;
  state.coins += coinsEarned;

  window.purrSound.playCoin();
  spawnCoinRain();
  saveState(true);
  updateCoinsUI();
  renderStreakUI();
  renderShop();
  if (roomActors[0]) {
    showRoomPetSpeech(roomActors[0], `🔥 ${state.streak.current} dias! +${coinsEarned} 🪙!`);
  }
  showCompactSpeech(`🔥 Dia ${state.streak.current}: +${coinsEarned} 🪙!`);
}

function updateAccountHeaderUI() {
  const btn = document.getElementById('accountHeaderBtn');
  if (!btn) return;
  if (state.cloudUser) {
    btn.classList.add('connected');
    const shortName = String(state.cloudUser.name || 'Nuvem').split(' ')[0];
    btn.textContent = `☁️ ${shortName}`;
    btn.title = `${state.cloudUser.email || shortName} — Sincronizado na nuvem!`;
  } else {
    btn.classList.remove('connected');
    btn.textContent = tc('loginChipDisconnected');
    btn.title = tc('loginModalDesc');
  }

  const formArea = document.getElementById('loginFormArea');
  const connArea = document.getElementById('loginConnectedArea');
  const userCard = document.getElementById('loginUserCard');
  if (formArea && connArea) {
    formArea.classList.toggle('hidden', Boolean(state.cloudUser));
    connArea.classList.toggle('hidden', !state.cloudUser);
  }
  if (userCard && state.cloudUser) {
    userCard.innerHTML = `✅ Conectado como <strong>${state.cloudUser.name}</strong> (${state.cloudUser.email})<br><small>Último backup: ${new Date(state.cloudUser.syncedAt || Date.now()).toLocaleString()}</small>`;
  }
}

function openLoginPromptModal(fromAutoPopup = false) {
  if (fromAutoPopup) {
    state.loginPromptShownCount = (state.loginPromptShownCount || 0) + 1;
    saveState();
  }
  updateAccountHeaderUI();
  const cv = document.getElementById('loginModalCatCanvas');
  if (cv) cv.dataset.previewHat = 'hat_cloud_star';
  document.getElementById('loginPromptModal')?.classList.remove('hidden');
}

function closeLoginPromptModal() {
  const cv = document.getElementById('loginModalCatCanvas');
  if (cv) delete cv.dataset.previewHat;
  document.getElementById('loginPromptModal')?.classList.add('hidden');
}

async function handleGoogleSignIn() {
  if (!window.purrCloud) return;
  const btn = document.getElementById('googleSignInBtn');
  if (btn) btn.disabled = true;
  let user;
  try {
    user = await window.purrCloud.signInWithGoogle();
  } finally {
    if (btn) btn.disabled = false;
  }

  if (!user || user.error || !user.uid) {
    const errMsg = `⚠️ ${user?.error || 'Login Google cancelado.'}`;
    if (roomActors[0]) showRoomPetSpeech(roomActors[0], errMsg, 4500);
    showCompactSpeech(errMsg, 4500);
    return;
  }
  state.cloudUser = user;

  // Primeiro puxa gatinhos, chapéus, móveis e moedas que já estejam salvos na nuvem
  const pullRes = await window.purrCloud.pullFromCloudIntoState(state);

  let bonusMsg = pullRes.merged
    ? '☁️ Conta e gatinhos sincronizados da nuvem!'
    : '☁️ Conta conectada na nuvem!';
  if (!state.unlockedHats.includes('hat_cloud_star')) {
    state.unlockedHats.push('hat_cloud_star');
    state.activeHat = 'hat_cloud_star';
    state.coins += 150;
    const hatDef = getHatDef('hat_cloud_star');
    if (hatDef) loadImage(hatDef.image);
    bonusMsg = '☁️ Conectado! Você ganhou Chapéu Nuvem Mágica + 150 🪙!';
    spawnCoinRain();
    window.purrSound.playTimerComplete();
  } else {
    window.purrSound.playCoin();
  }

  const syncRes = await window.purrCloud.syncStateToCloud(state);
  if (syncRes.syncedAt) state.cloudUser.syncedAt = syncRes.syncedAt;
  normalizePlacedItemsForIsometricRoom();
  applyRoomTheme(state.roomTheme || 'cozy');
  syncRoomActors();
  saveState(true);
  updateCoinsUI();
  updateAccountHeaderUI();
  renderStreakUI();
  renderInventory();
  renderShop();
  renderSupportTab();
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], bonusMsg);
  showCompactSpeech('☁️ Conta salva na nuvem!');
}

async function syncCloudNow() {
  if (!state.cloudUser || !window.purrCloud) return;
  const res = await window.purrCloud.pullAndSyncCloudState(state);
  if (res.ok) {
    state.cloudUser.syncedAt = res.syncedAt;
    normalizePlacedItemsForIsometricRoom();
    applyRoomTheme(state.roomTheme || 'cozy');
    syncRoomActors();
    saveState(true);
    updateCoinsUI();
    updateAccountHeaderUI();
    renderStreakUI();
    renderInventory();
    renderShop();
    renderSupportTab();
    window.purrSound.playCoin();
    if (roomActors[0]) showRoomPetSpeech(roomActors[0], '☁️ Perfil e gatinhos sincronizados!');
  } else {
    window.purrSound.playSad();
    const errMsg =
      res.reason === 'auth-expired'
        ? '⚠️ Sessão Google expirada neste navegador. Faça login novamente para sincronizar!'
        : `⚠️ Não foi possível sincronizar com o Firestore (${res.reason || 'erro'}).`;
    if (roomActors[0]) showRoomPetSpeech(roomActors[0], errMsg, 4500);
    showCompactSpeech(errMsg, 4500);
    if (res.reason === 'auth-expired') {
      openLoginPromptModal(false);
    }
  }
}

async function handleGoogleSignOut() {
  window.purrSound.playClick();
  if (state.cloudUser?.uid && state.cloudUser?.provider === 'firebase-google') {
    try {
      await window.purrCloud?.syncStateToCloud?.(state);
    } catch {}
  }
  await window.purrCloud?.signOutFromCloud?.();
  const prevLang = state.lang;
  const prevMuted = state.muted;
  const fresh = structuredClone(DEFAULT_STATE);
  fresh.lang = prevLang;
  fresh.muted = prevMuted;
  state = fresh;
  applyRoomTheme(state.roomTheme || 'cozy');
  renderThemeChips();
  syncRoomActors();
  saveState(true);
  updateTimerUI();
  updateCoinsUI();
  updateAccountHeaderUI();
  renderStreakUI();
  renderInventory();
  renderShop();
  renderSupportTab();
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], '👋 Conta desconectada! Tudo resetado para o modo local.');
}

function requireLoginForPurchase() {
  if (state.cloudUser) return true;
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], tc('supportLoginRequired'));
  openLoginPromptModal(false);
  return false;
}

function getCurrentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getSupporterMonthsCount(sup) {
  if (!sup?.active) return 0;
  if (!sup.since) return Math.max(1, (state.unlockedSecretIds || []).length);
  const start = new Date(sup.since);
  const now = new Date();
  if (Number.isNaN(start.getTime())) return 1;
  const diff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
  return Math.max(1, diff, (state.unlockedSecretIds || []).length);
}

function formatMonthLabelOffset(sinceIso, monthIndexZeroBased) {
  const base = sinceIso ? new Date(sinceIso) : new Date();
  const d = Number.isNaN(base.getTime()) ? new Date() : new Date(base.getFullYear(), base.getMonth() + monthIndexZeroBased, 1);
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[d.getMonth()]}/${d.getFullYear()}`;
}

function getSecretRewardName(sid) {
  if (sid === 'theme_sec_starlight') return '🌌 Tema Galáxia Lo-Fi';
  const item = getCatalogItem(sid);
  if (item) return `✨ ${item.name}`;
  const cat = getCatDef(sid);
  if (cat) return `🐱 ${cat.name}`;
  return `🎁 ${sid}`;
}

function renderSupportTab() {
  if (!window.purrCloud) return;
  const lang = getCurrentLang();
  const plan = window.purrCloud.SUPPORTER_PLAN;
  const unlockedIds = state.unlockedSecretIds || [];
  const unlockedCount = unlockedIds.length;
  const totalPool = window.purrCloud.SUPPORTER_SECRET_POOL.length;

  const curMonth = getCurrentYearMonth();
  const sup = state.supporter || { active: false, since: null, lastClaimMonth: null };
  const canClaimThisMonth = Boolean(sup.active && sup.lastClaimMonth !== curMonth);
  const monthsActive = getSupporterMonthsCount(sup);

  const badge = document.getElementById('supportPriceBadge');
  if (badge) {
    badge.classList.toggle('hidden', Boolean(sup.active));
    badge.textContent = window.purrCloud.formatPrice(plan, lang);
  }

  const counter = document.getElementById('supporterDropsCounter');
  if (counter) {
    counter.textContent = sup.active
      ? `Mês ${monthsActive} (${unlockedCount} brindes)`
      : 'Mês 0 (Não ativo)';
  }
  const bar = document.getElementById('supporterProgressBar');
  if (bar) {
    const pct = sup.active
      ? Math.min(100, Math.max(8, Math.round((Math.min(unlockedCount, totalPool) / totalPool) * 100)))
      : 0;
    bar.style.width = `${pct}%`;
  }
  const gw = document.getElementById('supportGatewayHint');
  if (gw) {
    gw.classList.toggle('hidden', Boolean(sup.active));
    gw.textContent = lang === 'en' ? tc('supportGatewayEn') : tc('supportGatewayPt');
  }

  const subBtn = document.getElementById('subscribeDevBtn');
  const claimBtn = document.getElementById('claimMonthlyDropBtn');
  const statusEl = document.getElementById('supporterStatusText');

  if (subBtn && claimBtn && statusEl) {
    if (sup.active) {
      subBtn.classList.add('hidden');
      subBtn.disabled = true;
      claimBtn.classList.toggle('hidden', !canClaimThisMonth);
      claimBtn.classList.remove('px-btn-ghost');
      claimBtn.classList.add('px-btn-primary');
      claimBtn.textContent = tc('supportClaimMonthlyBtn');
      statusEl.textContent = canClaimThisMonth
        ? `🎁 Seu presente do Mês ${monthsActive} está pronto para abrir!`
        : `✓ Presente do mês (${curMonth}) já resgatado! Próximo presente no mês que vem.`;
    } else {
      subBtn.classList.remove('hidden');
      subBtn.disabled = false;
      subBtn.textContent = `${tc('supportSubscribeBtn')} (${window.purrCloud.formatPrice(plan, lang)})`;
      claimBtn.classList.add('hidden');
      statusEl.textContent = 'Ao assinar, você libera na hora a Loja Premium, +500 🪙 e 1 presente por mês!';
    }
  }

  // Pacotes de Moedas
  const packsGrid = document.getElementById('coinPacksGrid');
  if (packsGrid) {
    packsGrid.innerHTML = '';
    window.purrCloud.COIN_PACKS.forEach((pack) => {
      const card = document.createElement('div');
      card.className = 'coin-pack-card' + (pack.popular ? ' popular' : '');
      const packName = lang === 'en' ? pack.nameEn : pack.namePt;
      const priceLabel = window.purrCloud.formatPrice(pack, lang);
      card.innerHTML = `
        <div class="coin-pack-emoji">${pack.emoji}</div>
        <div class="coin-pack-amount">+${pack.coins} 🪙</div>
        <div class="coin-pack-name">${packName}</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'tiny-btn';
      btn.style.width = '100%';
      btn.textContent = priceLabel;
      btn.onclick = () => handleBuyCoinPack(pack);
      card.appendChild(btn);
      packsGrid.appendChild(card);
    });
  }

  // Histórico Mensal Contínuo (sem limite de 2 anos!)
  const secTag = document.getElementById('secretUnlockedCountTag');
  if (secTag) {
    secTag.textContent = sup.active ? `${monthsActive} ${monthsActive === 1 ? 'mês' : 'meses'}` : '0 meses';
  }
  const secGrid = document.getElementById('secretCollectionGrid');
  if (secGrid) {
    secGrid.innerHTML = '';
    if (!sup.active && unlockedCount === 0) {
      secGrid.innerHTML =
        '<span class="label-sm">🔒 Assine Adote um Dev para desbloquear a Loja Premium e registrar seus presentes mês a mês!</span>';
    } else {
      const totalRows = Math.max(monthsActive, unlockedCount + (canClaimThisMonth ? 1 : 0), 1);
      for (let i = 0; i < totalRows; i++) {
        const row = document.createElement('div');
        const sid = unlockedIds[i] || null;
        const isCurrentReady = !sid && canClaimThisMonth && i === totalRows - 1;
        row.className = 'monthly-gift-row' + (isCurrentReady ? ' is-ready' : '');

        const left = document.createElement('span');
        left.className = 'monthly-gift-month';
        left.textContent = `Mês ${i + 1} • ${formatMonthLabelOffset(sup.since, i)}`;

        const right = document.createElement('span');
        right.className = 'monthly-gift-reward';
        if (sid) {
          right.textContent = `${getSecretRewardName(sid)} + 500 🪙`;
        } else if (isCurrentReady) {
          right.textContent = '🎁 Pronto para abrir (+500 🪙)!';
        } else {
          right.textContent = '🪙 Bônus Mensal VIP (+500 moedas)';
        }

        row.appendChild(left);
        row.appendChild(right);
        secGrid.appendChild(row);
      }
    }
  }
}

function claimMonthlySupporterDropUI() {
  if (!window.purrCloud) return;
  const curMonth = getCurrentYearMonth();
  if (!state.supporter?.active || state.supporter.lastClaimMonth === curMonth) return;

  state.supporter.lastClaimMonth = curMonth;
  state.coins += window.purrCloud.SUPPORTER_PLAN.monthlyCoins;
  const drop = window.purrCloud.grantNextSecretDrop(state, catalog);
  window.purrSound.playTimerComplete();
  spawnCoinRain();
  if (drop?.kind === 'theme') {
    applyRoomTheme(drop.themeId || 'starlight');
  } else {
    renderThemeChips();
  }
  saveState(true);
  updateCoinsUI();
  renderShop();
  renderInventory();
  renderSupportTab();

  const dropName = drop?.entry?.name || 'Bônus VIP';
  if (roomActors[0]) {
    showRoomPetSpeech(roomActors[0], `🎁 +500 🪙 & Brinde Secreto: ${dropName}! 💖`);
  }
  showCompactSpeech(`🎁 Brinde VIP: ${dropName}!`);
}

async function handleSubscribeAdoptDev() {
  if (!requireLoginForPurchase()) return;
  if (state.supporter?.active) return;

  if (window.purrCloud?.startCheckout) {
    const res = await window.purrCloud.startCheckout(window.purrCloud.SUPPORTER_PLAN.id, getCurrentLang());
    if (res.ok && res.checkoutUrl) {
      if (window.purrAPI?.openExternal) {
        window.purrAPI.openExternal(res.checkoutUrl);
      } else {
        window.open(res.checkoutUrl, '_blank', 'noopener');
      }
      if (roomActors[0]) {
        showRoomPetSpeech(roomActors[0], '💳 Checkout aberto! Assim que aprovar, seu brinde entra na nuvem!');
      }
      return;
    }
    if (!res.fallback) {
      if (roomActors[0]) showRoomPetSpeech(roomActors[0], `⚠️ ${res.error || 'Não foi possível abrir o checkout agora.'}`);
      return;
    }
  }

  state.supporter = {
    active: true,
    since: new Date().toISOString(),
    lastClaimMonth: null,
  };
  claimMonthlySupporterDropUI();
}

async function handleBuyCoinPack(pack) {
  if (!requireLoginForPurchase()) return;

  if (window.purrCloud?.startCheckout) {
    const res = await window.purrCloud.startCheckout(pack.id, getCurrentLang());
    if (res.ok && res.checkoutUrl) {
      if (window.purrAPI?.openExternal) {
        window.purrAPI.openExternal(res.checkoutUrl);
      } else {
        window.open(res.checkoutUrl, '_blank', 'noopener');
      }
      if (roomActors[0]) {
        showRoomPetSpeech(roomActors[0], '💳 Checkout Mercado Pago aberto! Boas compras 🪙!');
      }
      return;
    }
    if (!res.fallback) {
      if (roomActors[0]) showRoomPetSpeech(roomActors[0], `⚠️ ${res.error || 'Não foi possível abrir o checkout agora.'}`);
      return;
    }
  }

  state.coins += pack.coins;
  window.purrSound.playCoin();
  spawnCoinRain();
  saveState(true);
  updateCoinsUI();
  renderShop();
  if (roomActors[0]) showRoomPetSpeech(roomActors[0], `🪙 +${pack.coins} moedas creditadas!`);
  showCompactSpeech(`🪙 +${pack.coins} moedas!`);
}

function applyLanguageUI() {
  if (!window.purrCloud) return;
  const lang = getCurrentLang();
  const helpBtn = document.getElementById('pomodoroHelpBtn');
  if (helpBtn) {
    helpBtn.dataset.tip =
      lang === 'en'
        ? 'Pomodoro Method: focus without distractions during Focus (e.g. 25m), rest during Short Break (5m), and every 4 cycles take a Long Break (15m) to recharge!'
        : 'Método Pomodoro: foque sem distrações durante o Foco (ex: 25m), descanse na Pausa Curta (5m) e, a cada 4 ciclos, faça uma Pausa Longa (15m) para recarregar!';
  }
  const map = [
    ['.header-titles .subtitle', 'appSubtitle'],
    ['.side-tab[data-tab="timer"]', 'tabTimer'],
    ['.side-tab[data-tab="shop"]', 'tabShop'],
    ['.side-tab[data-tab="inventory"]', 'tabInventory'],
    ['.side-tab[data-tab="support"]', 'tabSupport'],
    ['.phase-btn[data-phase="focus"]', 'phaseFocus'],
    ['.phase-btn[data-phase="shortBreak"]', 'phaseShortBreak'],
    ['.phase-btn[data-phase="longBreak"]', 'phaseLongBreak'],
    ['#minimizeCompactBtn', 'modeClockBtn'],
    ['#langToggleBtn', 'langLabel'],
    ['#webBannerText', 'webBannerText'],
    ['#webDownloadExeBtn', 'webBannerBtn'],
    ['#webHeroTitle', 'webHeroTitle'],
    ['#webHeroSubtitle', 'webHeroSubtitle'],
    ['#webHeroDownloadBtn', 'webHeroDownloadBtn'],
    ['#webHeroReleasesBtn', 'webHeroReleasesBtn'],
    ['#webFeature1Title', 'webFeature1Title'],
    ['#webFeature1Desc', 'webFeature1Desc'],
    ['#webFeature2Title', 'webFeature2Title'],
    ['#webFeature2Desc', 'webFeature2Desc'],
    ['#webFeature3Title', 'webFeature3Title'],
    ['#webFeature3Desc', 'webFeature3Desc'],
    ['#webFeature4Title', 'webFeature4Title'],
    ['#webFeature4Desc', 'webFeature4Desc'],
    ['#streakModalTitle', 'streakTitle'],
    ['#streakModalSubtitle', 'streakSubtitle'],
    ['#loginModalTitle', 'loginModalTitle'],
    ['#loginModalDesc', 'loginModalDesc'],
    ['#googleSignInBtn', 'loginGoogleBtn'],
    ['#loginLaterBtn', 'loginLaterBtn'],
    ['#syncCloudNowBtn', 'loginSyncNowBtn'],
    ['#googleSignOutBtn', 'loginLogoutBtn'],
    ['#supportHeroTitle', 'supportHeroTitle'],
    ['#supportHeroDesc', 'supportHeroDesc'],
    ['#supportPacksTitle', 'supportPacksTitle'],
    ['#supporterCollectionLabel', 'supporterDropsProgress'],
  ];

  map.forEach(([sel, key]) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = tc(key);
  });

  document.querySelectorAll('.coin-pill').forEach((el) => {
    const tip = tc('coinTip');
    el.setAttribute('title', tip);
    el.setAttribute('data-tip', tip);
  });

  updateAccountHeaderUI();
  renderStreakUI();
  renderSupportTab();
}

function initWebPromoBanner() {
  const banner = document.getElementById('webPromoBanner');
  if (!window.purrAPI?.isElectron) {
    document.body.classList.add('is-web-browser');
    if (banner) banner.classList.remove('hidden');
    document.getElementById('webLandingHero')?.classList.remove('hidden');
    document.getElementById('webLandingFooter')?.classList.remove('hidden');
  }
}

async function checkAppUpdates() {
  if (!window.purrCloud) return;
  const info = await window.purrCloud.checkLatestRelease(window.purrCloud.APP_VERSION);
  if (!info) return;
  latestUpdateInfo = info;
  const btn = document.getElementById('updateAvailableBtn');
  if (btn) {
    btn.classList.remove('hidden');
    btn.textContent = `✨ ${info.version}`;
    btn.title = `Nova versão ${info.version} disponível! Clique para baixar.`;
  }
}

async function init() {
  const resp = await fetch('assets/catalog.json');
  catalog = await resp.json();

  await loadState();
  normalizePlacedItemsForIsometricRoom();
  normalizeStreakOnBoot();
  window.purrSound.muted = Boolean(state.muted);
  document.getElementById('muteBtn').textContent = state.muted ? '🔇' : '🔊';

  applyRoomTheme(state.roomTheme || 'cozy');
  syncSettingsInputs();
  setPhase('focus', true);
  updateCoinsUI();
  updateTimerUI();
  bindEvents();
  applyLanguageUI();
  initWebPromoBanner();
  checkAppUpdates();
  if (state.cloudUser && window.purrCloud?.pullAndSyncCloudState) {
    window.purrCloud.pullAndSyncCloudState(state).then((res) => {
      if (res?.merged) {
        normalizePlacedItemsForIsometricRoom();
        applyRoomTheme(state.roomTheme || 'cozy');
        syncRoomActors();
        updateCoinsUI();
        updateAccountHeaderUI();
        renderStreakUI();
        renderInventory();
        renderShop();
        renderSupportTab();
        saveState(true);
      }
    }).catch(() => {});
  }
  setCompactCollapsed(Boolean(state.compactCollapsed), Boolean(window.purrAPI?.isElectron));

  // Em navegador comum (sem Electron), abre direto no modo expandido com dica
  if (!window.purrAPI?.isElectron) {
    setAppMode('expanded');
    if (window.location.search.includes('electron_auth=1')) {
      state.cloudUser = null;
      openLoginPromptModal(false);
    }
  } else {
    setAppMode('compact');
  }

  // Pré-carregar sprites do gato atual e chapéu equipado
  const catDef = getCatDef(state.activeCat);
  if (catDef) {
    Object.values(catDef.animations).forEach((a) => loadImage(a.src));
  }
  if (state.activeHat) {
    const hatDef = getHatDef(state.activeHat);
    if (hatDef) loadImage(hatDef.image);
  }

  requestAnimationFrame(animationLoop);
}

init().catch((err) => {
  console.error('Erro ao inicializar PurrModoro:', err);
});
