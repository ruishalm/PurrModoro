/* ============================================================================
   PurrModoro — Cloud Sync, Google Auth, Daily Streak, i18n, Updates & Support
   ============================================================================ */

(function () {
  const APP_VERSION = '0.1.5';
  const GITHUB_LATEST_API = 'https://api.github.com/repos/ruishalm/PurrModoro/releases/latest';
  const GITHUB_RELEASES_URL = 'https://github.com/ruishalm/PurrModoro/releases/latest';
  const WEB_APP_URL = 'https://purrrmodoro.web.app';
  const CLOUD_LOCAL_VAULT_KEY = 'purrmodoro_cloud_vault_v1';

  // Credenciais Web do projeto Firebase "purrrmodoro"
  const firebaseConfig = {
    projectId: 'purrrmodoro',
    appId: '1:777177980914:web:3eea235216eb0e4df7d56b',
    storageBucket: 'purrrmodoro.firebasestorage.app',
    apiKey: 'AIzaSyCXUgg8-gsyOuwb1PeZaQT8GhyjKVoTKms',
    authDomain: 'purrrmodoro.firebaseapp.com',
    messagingSenderId: '777177980914',
    measurementId: 'G-9HQ9JK961S',
  };

  let analyticsInitialized = false;
  function ensureFirebaseInitialized() {
    if (!isFirebaseConfigured() || !window.firebase) return false;
    try {
      if (!window.firebase.apps || window.firebase.apps.length === 0) {
        window.firebase.initializeApp(firebaseConfig);
      }
      const isHttpOrigin = typeof window !== 'undefined' && /^https?:/.test(window.location?.protocol || '');
      if (isHttpOrigin && !analyticsInitialized && typeof window.firebase.analytics === 'function') {
        window.firebase.analytics();
        analyticsInitialized = true;
      }
      return true;
    } catch (err) {
      console.warn('Firebase init warning:', err?.message);
      return false;
    }
  }

  const SUPPORTER_SECRET_POOL = [
    // 7 Cores secretas de Gatinhos & Dinos
    'cat_sec_galaxy',
    'cat_sec_gold',
    'cat_sec_cyber',
    'cat_sec_sunset',
    'cat_sec_dino_pink',
    'cat_sec_dino_gold',
    'cat_sec_dino_purple',
    // 16 Chapéus secretos (maioria!)
    'hat_sec_astronaut',
    'hat_sec_viking',
    'hat_sec_pirate',
    'hat_sec_flower_crown',
    'hat_sec_rgb_ears',
    'hat_sec_detective',
    'hat_sec_party',
    'hat_sec_ufo',
    'hat_sec_propeller',
    'hat_sec_samurai',
    'hat_sec_cowboy',
    'hat_sec_devil_horns',
    'hat_sec_unicorn',
    'hat_sec_grad_cap',
    'hat_sec_coffee_cup',
    'hat_sec_sakura_pin',
    // 1 Tema de quarto secreto
    'theme_sec_starlight',
  ];

  const STREAK_DAY_REWARDS = [15, 20, 25, 30, 40, 50, 75];

  const SUPPORTER_PLAN = {
    id: 'supporter_monthly',
    monthlyCoins: 500,
    priceBRL: 'R$ 14,90/mês',
    priceUSD: 'US$ 2.99/mo',
  };

  const COIN_PACKS = [
    {
      id: 'coins_300',
      coins: 300,
      emoji: '🥛',
      namePt: 'Pires de Moedas',
      nameEn: 'Milk Saucer Pack',
      priceBRL: 'R$ 5,90',
      priceUSD: 'US$ 1.29',
    },
    {
      id: 'coins_800',
      coins: 800,
      emoji: '🥣',
      namePt: 'Potinho Recheado',
      nameEn: 'Full Bowl Pack',
      priceBRL: 'R$ 12,90',
      priceUSD: 'US$ 2.49',
      popular: true,
    },
    {
      id: 'coins_2200',
      coins: 2200,
      emoji: '👑',
      namePt: 'Baú do Imperador Miau',
      nameEn: 'Emperor Meow Chest',
      priceBRL: 'R$ 29,90',
      priceUSD: 'US$ 5.49',
    },
  ];

  const I18N = {
    pt: {
      appSubtitle: 'Pomodoro Cozy & Quartinho do Gato',
      tabTimer: '🍅 Timer',
      tabShop: '🛒 Lojinha',
      tabInventory: '🎒 Quarto',
      tabSupport: '💖 Apoiar',
      phaseFocus: '🍅 Foco',
      phaseShortBreak: '☕ Pausa',
      phaseLongBreak: '🌙 Longa',
      modeClockBtn: '🐾 Modo Relógio',
      loginChipDisconnected: '☁️ Entrar',
      loginChipConnected: '☁️ Nuvem OK',
      updateChip: '✨ Nova versão!',
      coinTip: 'Para ganhar moedas, use o timer em suas tarefas!',
      streakTitle: '🔥 Ofensiva Diária',
      streakSubtitle: 'Volte todo dia para manter o foguinho aceso e ganhar mais moedinhas!',
      streakClaimBtn: '🎁 Resgatar Moedinhas de Hoje',
      streakClaimedBtn: '✓ Recompensa de Hoje Resgatada!',
      streakShieldsLabel: 'Escudos de Catnip Congelado:',
      streakBuyShieldHint: 'Dica: compre o Picolé de Catnip Congelado na aba ☕ Café para proteger sua ofensiva se faltar 1 dia!',
      loginModalTitle: 'Me leva com você?! *-*',
      loginModalDesc: 'Conecte sua conta Google grátis para salvar seu quartinho na nuvem, abrir em qualquer PC e ganhar na hora o Chapéu Nuvem Mágica ☁️⭐ + 150 🪙!',
      loginGoogleBtn: 'Entrar com Google & Ganhar Chapéu',
      loginLaterBtn: 'Talvez depois',
      loginConnectedDesc: 'Sua conta está conectada na nuvem! Seu progresso e brindes ficam sincronizados com segurança.',
      loginSyncNowBtn: '🔄 Sincronizar Agora',
      loginLogoutBtn: 'Sair da conta',
      supportHeroTitle: '💖 Adote um Dev (Clube VIP)',
      supportHeroDesc: '+500 🪙 todo mês + 1 Brinde Secreto Exclusivo aleatório de uma coleção oculta com 24 itens (2 anos sem repetir!)',
      supportSubscribeBtn: '💖 Assinar Adote um Dev',
      supportClaimMonthlyBtn: '🎁 Abrir Brinde Mensal (+500 🪙)',
      supportGatewayPt: 'Pagamento em R$ via Mercado Pago (PIX ou Cartão)',
      supportGatewayEn: 'Checkout in US$ via Stripe',
      supportPacksTitle: '🪙 Pacotes Avulsos de Moedinhas',
      supportLoginRequired: 'Entre com sua conta Google primeiro para vincular sua compra com segurança!',
      webBannerText: 'Versão Web de Apresentação! Quer o gatinho livre em cima do relógio do Windows e iniciando com o PC?',
      webBannerBtn: '⬇️ Baixar PurrModoro (.exe)',
      webHeroTitle: 'PurrModoro — Seu Gatinho de Foco em Pixel Art 🐾',
      webHeroSubtitle: 'Teste o quartinho isométrico e o timer Pomodoro aqui mesmo no navegador! No app de Windows (.exe), seu gatinho caminha livre perto do relógio da bandeja, inicia junto com o PC e sincroniza tudo na nuvem.',
      webHeroDownloadBtn: '⬇️ Baixar para Windows (.exe) — Grátis',
      webHeroReleasesBtn: '📦 Ver Versão & Notas no GitHub',
      webFeature1Title: '🐾 Modo Relógio no Windows',
      webFeature1Desc: 'O gatinho caminha acima da hora do sistema sem atrapalhar e inicia com o Windows.',
      webFeature2Title: '🏠 Quartinho Isométrico Cozy',
      webFeature2Desc: 'Ganhe moedas focando nas tarefas e compre móveis, quadros, comidas e temas do quarto.',
      webFeature3Title: '🔥 Ofensiva Diária & Nuvem',
      webFeature3Desc: 'Entre com Google, ganhe o Chapéu Nuvem Mágica + 150 🪙 e mantenha sua sequência ativa.',
      webFeature4Title: '💖 23 Bichinhos & 27 Chapéus',
      webFeature4Desc: 'Inclui Dino Verde, novas cores gratuitas e clube Adote um Dev com 24 brindes secretos.',
      supporterDropsProgress: 'Coleção Secreta Adote um Dev',
      langLabel: '🇧🇷 PT',
    },
    en: {
      appSubtitle: 'Cozy Pomodoro & Isometric Cat Room',
      tabTimer: '🍅 Timer',
      tabShop: '🛒 Shop',
      tabInventory: '🎒 Room',
      tabSupport: '💖 Support',
      phaseFocus: '🍅 Focus',
      phaseShortBreak: '☕ Break',
      phaseLongBreak: '🌙 Long',
      modeClockBtn: '🐾 Clock Mode',
      loginChipDisconnected: '☁️ Sign In',
      loginChipConnected: '☁️ Cloud OK',
      updateChip: '✨ Update!',
      coinTip: 'To earn coins, finish focus sessions using the timer!',
      streakTitle: '🔥 Daily Streak',
      streakSubtitle: 'Come back every day to keep your flame alive and earn bonus coins!',
      streakClaimBtn: '🎁 Claim Today’s Coins',
      streakClaimedBtn: '✓ Claimed Today!',
      streakShieldsLabel: 'Frozen Catnip Shields:',
      streakBuyShieldHint: 'Tip: buy Frozen Catnip Popsicle in the ☕ Cafe tab to freeze your streak if you miss a day!',
      loginModalTitle: 'Take me with you?! *-*',
      loginModalDesc: 'Link your free Google account to back up your room to the cloud, play on any PC, and unlock the exclusive Magic Cloud Hat ☁️⭐ + 150 🪙!',
      loginGoogleBtn: 'Sign in with Google & Claim Hat',
      loginLaterBtn: 'Maybe later',
      loginConnectedDesc: 'Your account is linked! Your room, coins and secret drops stay safely backed up.',
      loginSyncNowBtn: '🔄 Sync Now',
      loginLogoutBtn: 'Sign Out',
      supportHeroTitle: '💖 Adopt a Dev (Monthly VIP)',
      supportHeroDesc: '+500 🪙 every month + 1 Random Secret Gift from a hidden 24-asset vault (2 full years of unique drops!)',
      supportSubscribeBtn: '💖 Join Adopt a Dev',
      supportClaimMonthlyBtn: '🎁 Open Monthly Gift (+500 🪙)',
      supportGatewayPt: 'BRL Checkout via Mercado Pago (PIX / Card)',
      supportGatewayEn: 'Global USD Checkout via Stripe',
      supportPacksTitle: '🪙 Coin Top-Up Packs',
      supportLoginRequired: 'Please sign in with Google first so your purchase stays safely linked to your account!',
      webBannerText: 'Web Preview Mode! Want your cat walking directly above the Windows clock with auto-start?',
      webBannerBtn: '⬇️ Download PurrModoro (.exe)',
      webHeroTitle: 'PurrModoro — Your Pixel-Art Focus Companion 🐾',
      webHeroSubtitle: 'Try the isometric room and Pomodoro timer right in your browser! Download the Windows (.exe) app so your cat walks above the system tray clock, auto-starts with Windows, and syncs to the cloud.',
      webHeroDownloadBtn: '⬇️ Download for Windows (.exe) — Free',
      webHeroReleasesBtn: '📦 View Releases & Notes on GitHub',
      webFeature1Title: '🐾 Windows Clock Widget',
      webFeature1Desc: 'Your pet walks right above the taskbar clock without getting in the way.',
      webFeature2Title: '🏠 Isometric Cozy Room',
      webFeature2Desc: 'Earn coins from focus sessions and decorate walls, desks, plants, and room themes.',
      webFeature3Title: '🔥 Daily Streak & Cloud Sync',
      webFeature3Desc: 'Sign in with Google for the free Magic Cloud Hat + 150 🪙 and cross-device saves.',
      webFeature4Title: '💖 23 Pets & 27 Hats',
      webFeature4Desc: 'Includes Green Dino, free pelts, and Adopt a Dev VIP with 24 monthly secret drops.',
      supporterDropsProgress: 'Adopt a Dev Secret Collection',
      langLabel: '🇺🇸 EN',
    },
  };

  function getLang(state) {
    if (state?.lang === 'en' || state?.lang === 'pt') return state.lang;
    const nav = (navigator.language || 'pt').toLowerCase();
    return nav.startsWith('pt') ? 'pt' : 'en';
  }

  function t(key, lang = 'pt') {
    const dict = I18N[lang] || I18N.pt;
    return dict[key] || I18N.pt[key] || key;
  }

  function formatPrice(itemOrPlan, lang = 'pt') {
    return lang === 'en' ? itemOrPlan.priceUSD : itemOrPlan.priceBRL;
  }

  function isFirebaseConfigured() {
    return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
  }

  function getTodayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function diffDaysISO(fromISO, toISO) {
    if (!fromISO || !toISO) return 999;
    const a = new Date(`${fromISO}T00:00:00Z`).getTime();
    const b = new Date(`${toISO}T00:00:00Z`).getTime();
    return Math.round((b - a) / 86400000);
  }

  function parseSemverTuple(ver) {
    const clean = String(ver || '').replace(/^v/i, '').split('-')[0];
    return clean.split('.').map((n) => parseInt(n, 10) || 0);
  }

  function isNewerVersion(remoteVer, localVer) {
    const r = parseSemverTuple(remoteVer);
    const l = parseSemverTuple(localVer);
    for (let i = 0; i < 3; i += 1) {
      if ((r[i] || 0) > (l[i] || 0)) return true;
      if ((r[i] || 0) < (l[i] || 0)) return false;
    }
    const rBeta = String(remoteVer).includes('beta');
    const lBeta = String(localVer).includes('beta');
    if (lBeta && !rBeta) return true;
    return false;
  }

  async function checkLatestRelease(currentVersion = APP_VERSION) {
    try {
      const resp = await fetch(GITHUB_LATEST_API, { cache: 'no-store' });
      if (!resp.ok) return null;
      const data = await resp.json();
      const latestTag = data.tag_name || '';
      if (latestTag && isNewerVersion(latestTag, currentVersion)) {
        return {
          version: latestTag,
          url: data.html_url || GITHUB_RELEASES_URL,
          notes: data.body || '',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  function readCloudVault() {
    try {
      return JSON.parse(localStorage.getItem(CLOUD_LOCAL_VAULT_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function writeCloudVault(vault) {
    try {
      localStorage.setItem(CLOUD_LOCAL_VAULT_KEY, JSON.stringify(vault));
    } catch {
      // ignora erro de quota local
    }
  }

  function formatFirebaseUser(u) {
    return {
      uid: u.uid,
      name: u.displayName || 'Treinador Miau',
      email: u.email || '',
      photoURL: u.photoURL || '',
      provider: 'firebase-google',
      syncedAt: new Date().toISOString(),
    };
  }

  async function signInWithGoogle() {
    if (!ensureFirebaseInitialized() || !window.firebase?.auth) {
      return { error: 'Firebase Auth indisponível. Verifique sua conexão com a internet.' };
    }

    try {
      if (window.purrAPI?.googleSignIn) {
        const cred = await window.purrAPI.googleSignIn();
        if (!cred || cred.cancelled || cred.error || (!cred.idToken && !cred.accessToken)) {
          return { error: cred?.error || 'Login Google cancelado.' };
        }
        const oauthCred = window.firebase.auth.GoogleAuthProvider.credential(
          cred.idToken || null,
          cred.accessToken || null
        );
        const res = await window.firebase.auth().signInWithCredential(oauthCred);
        if (!res?.user?.uid) {
          return { error: 'Falha ao autenticar conta Google no Firebase.' };
        }
        return formatFirebaseUser(res.user);
      }

      const isHttpOrigin = typeof window !== 'undefined' && /^https?:/.test(window.location?.protocol || '');
      if (!isHttpOrigin) {
        return { error: 'Autenticação Google disponível apenas via navegador ou app desktop.' };
      }

      const provider = new window.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await window.firebase.auth().signInWithPopup(provider);
      if (!res?.user?.uid) {
        return { error: 'Não foi possível concluir o login Google.' };
      }

      if (typeof window !== 'undefined' && window.location?.search?.includes('electron_auth=1')) {
        const payload = {
          idToken: res.credential?.idToken || null,
          accessToken: res.credential?.accessToken || null,
        };
        document.title = 'PURR_AUTH:' + JSON.stringify(payload);
      }

      return formatFirebaseUser(res.user);
    } catch (err) {
      console.warn('Erro no login Google Firebase:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { error: 'Login Google cancelado.' };
      }
      if (code === 'auth/popup-blocked') {
        return { error: 'Pop-up bloqueado pelo navegador. Permita pop-ups neste site.' };
      }
      return { error: err?.message || 'Falha ao entrar com Google.' };
    }
  }

  async function signOutFromCloud() {
    try {
      try {
        localStorage.removeItem(CLOUD_LOCAL_VAULT_KEY);
      } catch {}
      if (ensureFirebaseInitialized() && window.firebase?.auth) {
        await window.firebase.auth().signOut();
      }
      return { ok: true };
    } catch (err) {
      console.warn('Erro ao sair do Firebase Auth:', err?.message);
      return { ok: false, error: err?.message || 'signout-error' };
    }
  }

  function sanitizePlacedItems(items) {
    if (!Array.isArray(items)) return [];
    return items.slice(0, 200).map((item) => ({
      uid: String(item?.uid || ''),
      itemId: String(item?.itemId || ''),
      x: Math.round((Number(item?.x) || 50) * 100) / 100,
      y: Math.round((Number(item?.y) || 60) * 100) / 100,
      flip: Boolean(item?.flip),
      z: Math.round(Number(item?.z) || 60),
      ...(item?.onSurfaceUid ? { onSurfaceUid: String(item.onSurfaceUid) } : {}),
    }));
  }

  function sanitizeOwnedItems(owned) {
    const clean = {};
    if (!owned || typeof owned !== 'object') return clean;
    for (const [key, val] of Object.entries(owned).slice(0, 200)) {
      const n = Math.max(0, Math.floor(Number(val) || 0));
      if (key && n > 0) clean[String(key)] = n;
    }
    return clean;
  }

  function buildFirestoreUserSnapshot(state) {
    const unlockedCats = Array.from(
      new Set(['cat_mochi', 'cat_dino', ...(Array.isArray(state.unlockedCats) ? state.unlockedCats : [])])
    )
      .map(String)
      .slice(0, 100);
    const activeCat = unlockedCats.includes(state.activeCat) ? String(state.activeCat) : unlockedCats[0];

    const unlockedHats = Array.from(new Set(Array.isArray(state.unlockedHats) ? state.unlockedHats : []))
      .map(String)
      .slice(0, 100);
    const activeHat = state.activeHat && unlockedHats.includes(state.activeHat) ? String(state.activeHat) : null;

    const unlockedPets = Array.from(new Set(Array.isArray(state.unlockedPets) ? state.unlockedPets : []))
      .map(String)
      .slice(0, 50);
    const activePets = Array.from(new Set(Array.isArray(state.activePets) ? state.activePets : []))
      .filter((id) => unlockedPets.includes(id))
      .map(String)
      .slice(0, 20);

    const unlockedThemes = Array.from(
      new Set(['cozy', ...(Array.isArray(state.unlockedThemes) ? state.unlockedThemes : [])])
    )
      .map(String)
      .slice(0, 30);
    const roomTheme = unlockedThemes.includes(state.roomTheme) ? String(state.roomTheme) : 'cozy';

    const rawStreak = state.streak || {};
    const validClaimDate =
      typeof rawStreak.lastClaimDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawStreak.lastClaimDate)
        ? rawStreak.lastClaimDate
        : null;

    const rawSup = state.supporter || {};
    const validSince =
      typeof rawSup.since === 'string' && rawSup.since.length >= 19 && rawSup.since.length <= 40
        ? rawSup.since
        : null;
    const validClaimMonth =
      typeof rawSup.lastClaimMonth === 'string' && /^\d{4}-\d{2}$/.test(rawSup.lastClaimMonth)
        ? rawSup.lastClaimMonth
        : null;

    const rawStats = state.stats || {};

    return {
      uid: String(state.cloudUser.uid),
      displayName: state.cloudUser?.name ? String(state.cloudUser.name).slice(0, 120) : '',
      email: state.cloudUser?.email ? String(state.cloudUser.email).slice(0, 200) : '',
      updatedAt: new Date().toISOString(),
      coins: Math.min(10000000, Math.max(0, Math.floor(Number(state.coins) || 0))),
      unlockedCats,
      activeCat,
      unlockedHats,
      activeHat,
      unlockedPets,
      activePets,
      unlockedThemes,
      roomTheme,
      ownedItems: sanitizeOwnedItems(state.ownedItems),
      placedItems: sanitizePlacedItems(state.placedItems),
      streak: {
        current: Math.min(100000, Math.max(0, Math.floor(Number(rawStreak.current) || 0))),
        best: Math.min(100000, Math.max(0, Math.floor(Number(rawStreak.best) || 0))),
        lastClaimDate: validClaimDate,
        freezeShields: Math.min(1000, Math.max(0, Math.floor(Number(rawStreak.freezeShields) || 0))),
      },
      supporter: {
        active: Boolean(rawSup.active),
        since: validSince,
        lastClaimMonth: validClaimMonth,
      },
      unlockedSecretIds: Array.from(new Set(Array.isArray(state.unlockedSecretIds) ? state.unlockedSecretIds : []))
        .map(String)
        .slice(0, 50),
      stats: {
        cyclesCompleted: Math.min(1000000, Math.max(0, Math.floor(Number(rawStats.cyclesCompleted) || 0))),
        totalFocusMinutes: Math.min(100000000, Math.max(0, Math.floor(Number(rawStats.totalFocusMinutes) || 0))),
      },
    };
  }

  function waitForFirebaseAuthReady(timeoutMs = 2500) {
    return new Promise((resolve) => {
      if (!ensureFirebaseInitialized() || !window.firebase?.auth) {
        resolve(null);
        return;
      }
      const auth = window.firebase.auth();
      if (auth.currentUser) {
        resolve(auth.currentUser);
        return;
      }
      let settled = false;
      let unsub = null;
      const done = (user) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (typeof unsub === 'function') unsub();
        resolve(user || null);
      };
      const timer = setTimeout(() => done(auth.currentUser), timeoutMs);
      unsub = auth.onAuthStateChanged((user) => done(user));
    });
  }

  async function syncStateToCloud(state) {
    if (!state?.cloudUser?.uid) return { ok: false, reason: 'not-logged-in' };

    const snapshot = buildFirestoreUserSnapshot(state);

    const vault = readCloudVault();
    vault[state.cloudUser.uid] = snapshot;
    writeCloudVault(vault);

    if (ensureFirebaseInitialized() && window.firebase?.firestore && state.cloudUser.provider === 'firebase-google') {
      try {
        const authUser = await waitForFirebaseAuthReady();
        if (!authUser || authUser.uid !== state.cloudUser.uid) {
          console.warn('Firestore sync skipped: sessão Firebase Auth ausente ou UID diferente.', {
            hasAuthUser: Boolean(authUser),
            authUid: authUser?.uid || null,
            stateUid: state.cloudUser.uid,
          });
          return { ok: false, reason: 'auth-expired' };
        }
        await window.firebase.firestore().collection('users').doc(state.cloudUser.uid).set(snapshot, { merge: true });
        return { ok: true, mode: 'firestore', syncedAt: snapshot.updatedAt };
      } catch (err) {
        console.warn('Firestore sync warning:', err?.message);
        return { ok: false, reason: err?.message || 'firestore-error' };
      }
    }

    return { ok: false, reason: 'firebase-unavailable' };
  }

  async function loadStateFromCloud(uid, provider = 'firebase-google') {
    if (!uid) return null;
    if (ensureFirebaseInitialized() && window.firebase?.firestore && provider === 'firebase-google') {
      try {
        const authUser = await waitForFirebaseAuthReady();
        if (!authUser || authUser.uid !== uid) {
          console.warn('Firestore load skipped: sessão Firebase Auth ausente ou UID diferente.', {
            hasAuthUser: Boolean(authUser),
            authUid: authUser?.uid || null,
            stateUid: uid,
          });
          return null;
        }
        const snap = await window.firebase.firestore().collection('users').doc(uid).get();
        if (snap.exists) {
          return snap.data();
        }
        return null;
      } catch (err) {
        console.warn('Firestore load warning:', err?.message);
        return null;
      }
    }
    const vault = readCloudVault();
    return vault[uid] || null;
  }

  function mergeCloudProfileIntoState(state, remote) {
    if (!state || !remote || typeof remote !== 'object') return false;

    const remoteCats = Array.isArray(remote.unlockedCats) ? remote.unlockedCats : [];
    const remoteHats = Array.isArray(remote.unlockedHats) ? remote.unlockedHats : [];
    const remotePets = Array.isArray(remote.unlockedPets) ? remote.unlockedPets : [];
    const remoteThemes = Array.isArray(remote.unlockedThemes) ? remote.unlockedThemes : [];
    const remoteSecrets = Array.isArray(remote.unlockedSecretIds) ? remote.unlockedSecretIds : [];

    state.unlockedCats = Array.from(new Set(['cat_mochi', 'cat_dino', ...(state.unlockedCats || []), ...remoteCats]));
    state.unlockedHats = Array.from(new Set([...(state.unlockedHats || []), ...remoteHats]));
    state.unlockedPets = Array.from(new Set([...(state.unlockedPets || []), ...remotePets]));
    state.unlockedThemes = Array.from(new Set(['cozy', ...(state.unlockedThemes || []), ...remoteThemes]));
    state.unlockedSecretIds = Array.from(new Set([...(state.unlockedSecretIds || []), ...remoteSecrets]));

    if (remote.supporter?.active || state.supporter?.active) {
      state.supporter = {
        active: Boolean(state.supporter?.active || remote.supporter?.active),
        since: remote.supporter?.since || state.supporter?.since || null,
        lastClaimMonth:
          [state.supporter?.lastClaimMonth, remote.supporter?.lastClaimMonth].filter(Boolean).sort().pop() || null,
      };
    }

    const mergedOwned = { ...(state.ownedItems || {}) };
    if (remote.ownedItems && typeof remote.ownedItems === 'object') {
      for (const [k, qty] of Object.entries(remote.ownedItems)) {
        const q = Math.max(0, Math.floor(Number(qty) || 0));
        if (q > 0) mergedOwned[k] = Math.max(mergedOwned[k] || 0, q);
      }
    }
    state.ownedItems = mergedOwned;

    state.coins = Math.max(Math.floor(Number(state.coins) || 0), Math.floor(Number(remote.coins) || 0));

    if (remote.activeCat && state.unlockedCats.includes(remote.activeCat)) {
      state.activeCat = remote.activeCat;
    }
    if (remote.activeHat && state.unlockedHats.includes(remote.activeHat)) {
      state.activeHat = remote.activeHat;
    }
    if (Array.isArray(remote.activePets) && remote.activePets.length) {
      state.activePets = remote.activePets.filter((id) => state.unlockedPets.includes(id));
    }
    if (remote.roomTheme && state.unlockedThemes.includes(remote.roomTheme)) {
      state.roomTheme = remote.roomTheme;
    }
    if (Array.isArray(remote.placedItems) && remote.placedItems.length > 0 && (state.placedItems || []).length <= 2) {
      state.placedItems = sanitizePlacedItems(remote.placedItems);
    }

    if (remote.streak) {
      const localDate = state.streak?.lastClaimDate || '';
      const remoteDate = remote.streak?.lastClaimDate || '';
      state.streak = {
        current: remoteDate >= localDate
          ? Math.max(state.streak?.current || 0, remote.streak?.current || 0)
          : state.streak?.current || 0,
        best: Math.max(state.streak?.best || 0, remote.streak?.best || 0),
        lastClaimDate: remoteDate > localDate ? remoteDate : (state.streak?.lastClaimDate || null),
        freezeShields: Math.max(state.streak?.freezeShields || 0, remote.streak?.freezeShields || 0),
      };
    }

    if (remote.stats) {
      state.stats = {
        cyclesCompleted: Math.max(state.stats?.cyclesCompleted || 0, remote.stats?.cyclesCompleted || 0),
        totalFocusMinutes: Math.max(state.stats?.totalFocusMinutes || 0, remote.stats?.totalFocusMinutes || 0),
      };
    }
    return true;
  }

  async function pullFromCloudIntoState(state) {
    if (!state?.cloudUser?.uid) return { ok: false, merged: false };
    const remote = await loadStateFromCloud(state.cloudUser.uid, state.cloudUser.provider);
    if (!remote) return { ok: true, merged: false };
    mergeCloudProfileIntoState(state, remote);
    return { ok: true, merged: true };
  }

  async function pullAndSyncCloudState(state) {
    if (!state?.cloudUser?.uid) return { ok: false, reason: 'not-logged-in' };
    const pullRes = await pullFromCloudIntoState(state);
    const pushRes = await syncStateToCloud(state);
    return { ...pushRes, merged: pullRes.merged };
  }

  function grantNextSecretDrop(state, catalog) {
    if (!state) return null;
    if (!Array.isArray(state.unlockedSecretIds)) state.unlockedSecretIds = [];

    const remaining = SUPPORTER_SECRET_POOL.filter((id) => !state.unlockedSecretIds.includes(id));
    if (remaining.length === 0) return null;

    const chosenId = remaining[Math.floor(Math.random() * remaining.length)];
    state.unlockedSecretIds.push(chosenId);

    if (chosenId === 'theme_sec_starlight') {
      if (!Array.isArray(state.unlockedThemes)) state.unlockedThemes = ['cozy'];
      if (!state.unlockedThemes.includes('starlight')) state.unlockedThemes.push('starlight');
      state.roomTheme = 'starlight';
      return {
        id: chosenId,
        kind: 'theme',
        themeId: 'starlight',
        entry: { id: chosenId, name: 'Tema Galáxia Lo-Fi (Quarto)' },
      };
    }

    const catEntry = (catalog?.cats || []).find((c) => c.id === chosenId);
    const hatEntry = (catalog?.hats || []).find((h) => h.id === chosenId);
    const itemEntry = (catalog?.items || []).find((i) => i.id === chosenId);

    if (catEntry) {
      if (!state.unlockedCats.includes(chosenId)) state.unlockedCats.push(chosenId);
      return { id: chosenId, kind: 'cat', entry: catEntry };
    }
    if (hatEntry) {
      if (!state.unlockedHats.includes(chosenId)) state.unlockedHats.push(chosenId);
      return { id: chosenId, kind: 'hat', entry: hatEntry };
    }
    if (itemEntry) {
      state.ownedItems[chosenId] = (state.ownedItems[chosenId] || 0) + 1;
      return { id: chosenId, kind: 'furniture', entry: itemEntry };
    }
    return { id: chosenId, kind: 'unknown', entry: null };
  }

  async function startCheckout(productId, lang = 'pt') {
    if (
      ensureFirebaseInitialized() &&
      window.firebase?.functions &&
      window.firebase?.auth?.().currentUser
    ) {
      const fnName = lang === 'en' ? 'createStripeCheckoutSession' : 'createMercadoPagoPreference';
      try {
        const callable = window.firebase.functions().httpsCallable(fnName);
        const res = await callable({ productId });
        if (res?.data?.checkoutUrl) {
          return { ok: true, checkoutUrl: res.data.checkoutUrl, id: res.data.id };
        }
      } catch (err) {
        if (lang === 'en' && String(err?.code || '').includes('failed-precondition')) {
          try {
            const mpCall = window.firebase.functions().httpsCallable('createMercadoPagoPreference');
            const mpRes = await mpCall({ productId });
            if (mpRes?.data?.checkoutUrl) {
              return { ok: true, checkoutUrl: mpRes.data.checkoutUrl, id: mpRes.data.id };
            }
          } catch (innerErr) {
            return { ok: false, error: innerErr?.message || 'checkout-error' };
          }
        }
        return { ok: false, error: err?.message || 'checkout-error' };
      }
    }
    return { ok: false, fallback: true };
  }

  window.purrCloud = {
    APP_VERSION,
    GITHUB_RELEASES_URL,
    WEB_APP_URL,
    firebaseConfig,
    SUPPORTER_SECRET_POOL,
    STREAK_DAY_REWARDS,
    SUPPORTER_PLAN,
    COIN_PACKS,
    getLang,
    t,
    formatPrice,
    isFirebaseConfigured,
    getTodayISO,
    diffDaysISO,
    checkLatestRelease,
    signInWithGoogle,
    signOutFromCloud,
    buildFirestoreUserSnapshot,
    syncStateToCloud,
    loadStateFromCloud,
    mergeCloudProfileIntoState,
    pullFromCloudIntoState,
    pullAndSyncCloudState,
    startCheckout,
    grantNextSecretDrop,
  };
})();
