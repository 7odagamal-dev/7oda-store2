# Paymob Fix — Final Report

## Files Modified (7 files)

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/paymob.ts` | Renamed `getAuthToken()` → `authenticate()`. Updated `createOrder()` return type to `{ id: string }`. Updated `getPaymentKey()` to accept `integrationId` and `orderId` as string. Removed env var access from inside functions for cleaner DI. |
| 2 | `src/app/api/paymob/payment/route.ts` | **Complete rewrite**: No longer accepts `amount` from client — amount is computed server-side from DB `order.total * 100`. Uses `authenticate()` → `createOrder()` → `getPaymentKey()`. Rate limit, ownership check, and status validation preserved. |
| 3 | `src/app/api/paymob/auth/route.ts` | Updated import from `getAuthToken` → `authenticate`. |
| 4 | `src/app/checkout/page.tsx` | Removed `amount` from Paymob payment request body. Now only sends `orderId` + `customer`. The amount is computed server-side. |
| 5 | `.env.local` | Uncommented `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. |
| 6 | `tests/api-paymob.test.ts` | Updated mocks (`getAuthToken` → `authenticate`, `createOrder` return type). Removed amount-verification tests (no longer applicable). 8 tests → 6 tests. |

## Summary of Changes

### Security: Amount is NEVER trusted from client
- **Before**: The payment API accepted `amount` from the client, then verified it against DB. If the client sent a wrong amount (e.g., due to flash sale discount mismatch), it returned "Amount mismatch".
- **After**: The payment API ignores any `amount` from the client. It fetches the order from DB and computes `amountCents = Math.round(order.total * 100)`. No mismatch possible.

### Paymob API alignment
- `authenticate()` calls `POST /auth/tokens`
- `createOrder()` calls `POST /ecommerce/orders` with `merchant_order_id = order.id`
- `getPaymentKey()` calls `POST /acceptance/payment_keys` with `integration_id`, `callback_url`, `lock_order_when_paid: true`
- `verifyHmac()` uses SHA-512 per Paymob spec

### Callback (POST webhook + GET redirect)
- POST: HMAC SHA-512 verification, anti-replay (5-min window), idempotency lock (`.is('paymob_txn_id', null)`), stock commit RPC, coupon increment, payment_events logging, 200 OK return
- GET: Processes order if pending (stock commit, idempotency lock, coupon), redirects to `/order-success`

### UX
- Paymob flow: Button disabled immediately → "Processing..." → order created → "Redirecting to payment gateway..." → Paymob iframe → redirect back to `/order-success`
- `online_transfer` (manual): Goes directly to OrderSuccess with payment instructions (Vodafone Cash, InstaPay)
- `cash_on_delivery`: Shows delivery info

## Final Test Results

- **Build**: 81 routes, 0 errors
- **Tests**: 55/55 pass (7 test files)

## Remaining Notes for User

1. **Paymob keys**: Already set in `.env.local`. If payment fails, verify:
   - `PAYMOB_API_KEY` is valid (not expired)
   - `PAYMOB_INTEGRATION_ID` matches a card-accepting integration in your Paymob dashboard
   - `PAYMOB_IFRAME_ID` matches the iframe in your Paymob dashboard
   - `PAYMOB_HMAC_SECRET` matches what's configured in your Paymob webhook settings

2. **Webhook URL**: In dev mode, Paymob cannot reach `localhost`. Use `ngrok http 3000` or deploy to test. The GET redirect handler at `/api/paymob/callback` will process orders as a fallback.

3. **Wallet payments (Vodafone Cash / Orange Cash)**: Requires a separate Wallet Integration ID from Paymob dashboard. Need to add `subtype: 'WALLET'` integration. Blocked until you obtain this ID.

4. **After testing**: Run `Remove-Item -Recurse -Force .next` and restart dev server to clear any cached build.
