import crypto from 'crypto';

const PAYMOB_API = 'https://accept.paymob.com/api';

interface PaymobAuthResponse {
  token: string;
}

interface PaymobOrderResponse {
  id: number;
}

interface PaymobPaymentKeyResponse {
  token: string;
}

export async function authenticate(apiKey?: string): Promise<string> {
  const key = apiKey || process.env.PAYMOB_SECRET_KEY;
  if (!key) throw new Error('PAYMOB_SECRET_KEY not configured');
  console.log('[Paymob] authenticate() — key prefix:', key.slice(0, 15) + '...', 'key length:', key.length);

  // Strategy 1: old field name api_key (classic Paymob Accept)
  console.log('[Paymob] Trying strategy 1 — { api_key }');
  const res1 = await fetch(`${PAYMOB_API}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key }),
  });
  const text1 = await res1.text();
  if (res1.ok) {
    const data: PaymobAuthResponse = JSON.parse(text1);
    console.log('[Paymob] ✅ Strategy 1 OK — token prefix:', data.token?.slice(0, 10) + '...');
    return data.token;
  }
  console.log('[Paymob] ❌ Strategy 1 failed:', res1.status, text1.slice(0, 200));

  // Strategy 2: try secret_key field instead of api_key
  console.log('[Paymob] Trying strategy 2 — { secret_key }');
  const res2 = await fetch(`${PAYMOB_API}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_key: key }),
  });
  const text2 = await res2.text();
  if (res2.ok) {
    const data: PaymobAuthResponse = JSON.parse(text2);
    console.log('[Paymob] ✅ Strategy 2 OK — token prefix:', data.token?.slice(0, 10) + '...');
    return data.token;
  }
  console.log('[Paymob] ❌ Strategy 2 failed:', res2.status, text2.slice(0, 200));

  // Strategy 3: Bearer token in Authorization header
  console.log('[Paymob] Trying strategy 3 — Authorization: Bearer');
  const res3 = await fetch(`${PAYMOB_API}/ecommerce/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      delivery_needed: false,
      amount_cents: 10000,
      merchant_order_id: 'test-auth-' + Date.now(),
      currency: 'EGP',
      items: [],
    }),
  });
  const text3 = await res3.text();
  if (res3.ok) {
    console.log('[Paymob] ✅ Strategy 3 OK — Bearer token works! No auth step needed.');
    return key; // Use the secret key directly as the "token"
  }
  console.log('[Paymob] ❌ Strategy 3 failed:', res3.status, text3.slice(0, 200));

  // Strategy 4: Basic auth (base64 encode key: as credentials)
  console.log('[Paymob] Trying strategy 4 — Basic auth');
  const basic = Buffer.from(`${key}:`).toString('base64');
  const res4 = await fetch(`${PAYMOB_API}/auth/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basic}`,
    },
    body: JSON.stringify({}),
  });
  const text4 = await res4.text();
  if (res4.ok) {
    const data: PaymobAuthResponse = JSON.parse(text4);
    console.log('[Paymob] ✅ Strategy 4 OK — Basic auth works!');
    return data.token;
  }
  console.log('[Paymob] ❌ Strategy 4 failed:', res4.status, text4.slice(0, 200));

  // All strategies failed
  const allErrors = [
    `api_key: ${res1.status}`,
    `secret_key: ${res2.status}`,
    `Bearer: ${res3.status}`,
    `Basic: ${res4.status}`,
  ].join(', ');
  throw new Error(
    `Paymob auth failed all 4 strategies (${allErrors}). ` +
    `Verify that: 1) The key is correct (prefix: ${key.slice(0, 15)}...), ` +
    `2) API access is enabled in your Paymob dashboard, ` +
    `3) The key is for Accept (Online Card) product, not Paymob POS/Terminal.`
  );
}

export async function createOrder(token: string, amountCents: number, orderId: string): Promise<{ id: string }> {
  console.log('[Paymob] createOrder() calling POST /ecommerce/orders ...', { amountCents, merchant_order_id: orderId });
  const res = await fetch(`${PAYMOB_API}/ecommerce/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: false,
      amount_cents: amountCents,
      merchant_order_id: orderId,
      currency: 'EGP',
      items: [],
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    console.error('[Paymob] createOrder() FAILED:', res.status, bodyText);
    throw new Error(`Paymob order creation failed (${res.status}): ${bodyText.slice(0, 300)}`);
  }
  const data: PaymobOrderResponse = JSON.parse(bodyText);
  console.log('[Paymob] createOrder() OK — order id:', data.id);
  return { id: String(data.id) };
}

export async function getPaymentKey(
  token: string,
  orderId: string,
  amountCents: number,
  billingData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    street: string;
  },
  integrationId?: number,
  callbackUrl?: string
): Promise<string> {
  const integrationIdNum = integrationId || Number(process.env.PAYMOB_INTEGRATION_ID);
  if (!integrationIdNum) throw new Error('PAYMOB_INTEGRATION_ID not configured');

  const body: Record<string, unknown> = {
    auth_token: token,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: orderId,
    billing_data: billingData,
    currency: 'EGP',
    integration_id: integrationIdNum,
    lock_order_when_paid: true,
  };
  if (callbackUrl) {
    body.callback_url = callbackUrl;
  }

  console.log('[Paymob] getPaymentKey() calling POST /acceptance/payment_keys ...', { amount_cents: body.amount_cents, integration_id: body.integration_id, order_id: body.order_id });
  const res = await fetch(`${PAYMOB_API}/acceptance/payment_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    console.error('[Paymob] getPaymentKey() FAILED:', res.status, bodyText);
    throw new Error(`Paymob payment key failed (${res.status}): ${bodyText.slice(0, 300)}`);
  }
  const data: PaymobPaymentKeyResponse = JSON.parse(bodyText);
  console.log('[Paymob] getPaymentKey() OK');
  return data.token;
}

export function verifyHmac(data: Record<string, unknown>, hmacSecret: string): boolean {
  const { hmac, ...rest } = data;
  const keys = Object.keys(rest).sort();
  const message = keys.map(k => {
    const val = rest[k];
    if (val !== null && typeof val === 'object') {
      return `${k}=${JSON.stringify(val)}`;
    }
    return `${k}=${val}`;
  }).join('&');
  const computed = crypto.createHmac('sha512', hmacSecret).update(message).digest('hex');
  return computed === hmac;
}
