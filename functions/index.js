/* ============================================================================
   PurrModoro — Firebase Cloud Functions (Blaze)
   Mercado Pago (PIX/Cartão BRL), Stripe (USD Global) & Adote um Dev (24 Drops)
   ============================================================================ */

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const SUPPORTER_SECRET_POOL = [
  'cat_sec_galaxy',
  'cat_sec_gold',
  'cat_sec_cyber',
  'cat_sec_sunset',
  'cat_sec_dino_pink',
  'cat_sec_dino_gold',
  'cat_sec_dino_purple',
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
  'theme_sec_starlight',
];

const PRODUCTS = {
  supporter_monthly: { type: 'supporter', coins: 500, priceBRL: 14.9, priceUSD: 299 },
  coins_300: { type: 'coins', coins: 300, priceBRL: 5.9, priceUSD: 129 },
  coins_800: { type: 'coins', coins: 800, priceBRL: 12.9, priceUSD: 249 },
  coins_2200: { type: 'coins', coins: 2200, priceBRL: 29.9, priceUSD: 549 },
};

function getYearMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function grantSupporterDropTx(uid) {
  const userRef = db.collection('users').doc(uid);
  const curMonth = getYearMonth();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists ? snap.data() : {};
    const unlockedSecrets = Array.isArray(data.unlockedSecretIds) ? [...data.unlockedSecretIds] : [];
    const supporter = data.supporter || { active: false, lastClaimMonth: null };

    if (!supporter.active) {
      throw new HttpsError('failed-precondition', 'Assinatura Adote um Dev inativa.');
    }
    if (supporter.lastClaimMonth === curMonth) {
      throw new HttpsError('already-exists', 'Brinde mensal já resgatado neste mês.');
    }

    const remaining = SUPPORTER_SECRET_POOL.filter((id) => !unlockedSecrets.includes(id));
    const chosenId = remaining.length
      ? remaining[Math.floor(Math.random() * remaining.length)]
      : null;

    const updates = {
      coins: FieldValue.increment(PRODUCTS.supporter_monthly.coins),
      'supporter.lastClaimMonth': curMonth,
      updatedAt: new Date().toISOString(),
    };

    if (chosenId) {
      updates.unlockedSecretIds = FieldValue.arrayUnion(chosenId);
      if (chosenId.startsWith('cat_')) {
        updates.unlockedCats = FieldValue.arrayUnion(chosenId);
      } else if (chosenId.startsWith('hat_')) {
        updates.unlockedHats = FieldValue.arrayUnion(chosenId);
      } else if (chosenId.startsWith('furn_')) {
        updates[`ownedItems.${chosenId}`] = FieldValue.increment(1);
      } else if (chosenId === 'theme_sec_starlight') {
        updates.unlockedThemes = FieldValue.arrayUnion('starlight');
      }
    }

    tx.set(userRef, updates, { merge: true });
    return { month: curMonth, coinsAdded: PRODUCTS.supporter_monthly.coins, dropId: chosenId };
  });
}

// 1. Criar preferência de pagamento no Mercado Pago (PIX / Cartão em R$)
exports.createMercadoPagoPreference = onCall({ cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Faça login com Google antes de comprar.');
  }
  const productId = request.data?.productId;
  const product = PRODUCTS[productId];
  if (!product) {
    throw new HttpsError('invalid-argument', 'Produto inválido.');
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new HttpsError('failed-precondition', 'MERCADOPAGO_ACCESS_TOKEN não configurado em functions/.env.');
  }

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          id: productId,
          title: `PurrModoro — ${productId}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: product.priceBRL,
        },
      ],
      metadata: {
        uid: request.auth.uid,
        productId,
      },
      external_reference: `${request.auth.uid}:${productId}`,
      notification_url: 'https://us-central1-purrrmodoro.cloudfunctions.net/paymentWebhook',
      back_urls: {
        success: 'https://purrrmodoro.web.app/?payment=success',
        pending: 'https://purrrmodoro.web.app/?payment=pending',
        failure: 'https://purrrmodoro.web.app/?payment=failure',
      },
      auto_return: 'approved',
    }),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new HttpsError('internal', payload?.message || 'Erro ao criar checkout Mercado Pago.');
  }
  return { checkoutUrl: payload.init_point, id: payload.id };
});

// 2. Criar sessão de checkout no Stripe (US$ Global — futuro internacional)
exports.createStripeCheckoutSession = onCall({ cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Please sign in with Google first.');
  }
  const productId = request.data?.productId;
  const product = PRODUCTS[productId];
  if (!product) {
    throw new HttpsError('invalid-argument', 'Invalid productId.');
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new HttpsError('failed-precondition', 'STRIPE_SECRET_KEY não configurado em functions/.env.');
  }

  const params = new URLSearchParams({
    mode: product.type === 'supporter' ? 'subscription' : 'payment',
    success_url: 'https://purrrmodoro.web.app/?payment=success',
    cancel_url: 'https://purrrmodoro.web.app/?payment=cancel',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(product.priceUSD),
    'line_items[0][price_data][product_data][name]': `PurrModoro ${productId}`,
    'metadata[uid]': request.auth.uid,
    'metadata[productId]': productId,
  });
  if (product.type === 'supporter') {
    params.set('line_items[0][price_data][recurring][interval]', 'month');
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new HttpsError('internal', payload?.error?.message || 'Stripe checkout error.');
  }
  return { checkoutUrl: payload.url, id: payload.id };
});

// 3. Resgatar brinde mensal do clube "Adote um Dev" (+500 moedas + 1/24 drop secreto)
exports.claimMonthlySupporterDrop = onCall({ cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }
  return grantSupporterDropTx(request.auth.uid);
});

// 4. Webhook de confirmação (Mercado Pago / Stripe)
exports.paymentWebhook = onRequest({ cors: true }, async (req, res) => {
  try {
    let uid = req.body?.metadata?.uid || req.body?.uid || null;
    let productId = req.body?.metadata?.productId || req.body?.productId || null;
    let status = req.body?.status || req.body?.data?.status || null;
    const mpEventType = req.body?.type || req.body?.topic || req.query?.type || req.query?.topic || '';
    const paymentId = String(req.body?.data?.id || req.query?.['data.id'] || req.body?.id || Date.now());

    // Notificação IPN/Webhook oficial do Mercado Pago envia apenas { type: 'payment', data: { id } }
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if ((!uid || !productId) && mpEventType === 'payment' && mpToken && paymentId) {
      const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });
      if (mpResp.ok) {
        const mpData = await mpResp.json();
        status = mpData.status || status;
        uid = mpData.metadata?.uid || uid;
        productId = mpData.metadata?.productId || mpData.metadata?.product_id || productId;
        if ((!uid || !productId) && typeof mpData.external_reference === 'string' && mpData.external_reference.includes(':')) {
          const [refUid, refProd] = mpData.external_reference.split(':');
          uid = uid || refUid;
          productId = productId || refProd;
        }
      }
    }

    if (!uid || !PRODUCTS[productId] || (status && !['approved', 'paid', 'complete'].includes(status))) {
      res.status(200).json({ ignored: true });
      return;
    }

    const purchaseRef = db.collection('purchases').doc(paymentId);
    const existing = await purchaseRef.get();
    if (existing.exists) {
      res.status(200).json({ duplicate: true });
      return;
    }

    const product = PRODUCTS[productId];
    const userRef = db.collection('users').doc(uid);

    await purchaseRef.set({
      uid,
      productId,
      coins: product.coins,
      createdAt: new Date().toISOString(),
    });

    if (product.type === 'supporter') {
      await userRef.set(
        {
          supporter: { active: true, since: new Date().toISOString(), lastClaimMonth: null },
        },
        { merge: true }
      );
      await grantSupporterDropTx(uid);
    } else {
      await userRef.set({ coins: FieldValue.increment(product.coins) }, { merge: true });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('paymentWebhook error:', err);
    res.status(500).json({ error: 'internal' });
  }
});
