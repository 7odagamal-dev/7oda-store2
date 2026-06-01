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

export async function getAuthToken(): Promise<string> {
  const res = await fetch(`${PAYMOB_API}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
  });
  if (!res.ok) throw new Error('Paymob auth failed');
  const data: PaymobAuthResponse = await res.json();
  return data.token;
}

export async function createOrder(token: string, amountCents: number, orderId: string): Promise<number> {
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
  if (!res.ok) throw new Error('Paymob order creation failed');
  const data: PaymobOrderResponse = await res.json();
  return data.id;
}

export async function getPaymentKey(
  token: string,
  orderId: number,
  amountCents: number,
  billingData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    street: string;
  }
): Promise<string> {
  const integrationId = process.env.PAYMOB_INTEGRATION_ID;
  if (!integrationId) throw new Error('PAYMOB_INTEGRATION_ID not set');

  const res = await fetch(`${PAYMOB_API}/acceptance/payment_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: orderId,
      billing_data: billingData,
      currency: 'EGP',
      integration_id: Number(integrationId),
      lock_order_when_paid: true,
    }),
  });
  if (!res.ok) throw new Error('Paymob payment key failed');
  const data: PaymobPaymentKeyResponse = await res.json();
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
