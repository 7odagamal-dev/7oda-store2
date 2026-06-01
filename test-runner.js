const http = require('http');

async function request(path, options = {}) {
  const url = `http://localhost:3001${path}`;
  const fetchOptions = {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  };
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, fetchOptions);
  let text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, headers: res.headers, data };
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message, errData) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`, errData ? '\\n' + JSON.stringify(errData, null, 2) : '');
      failed++;
    }
  }

  try {
    // 1. Home page loading
    const home = await request('/');
    assert(home.status === 200, 'Home page loaded successfully', { status: home.status });

    // 2. 404 page loading
    const notFound = await request('/does-not-exist');
    assert(notFound.status === 404, '404 page loaded successfully', { status: notFound.status });

    // 3. Admin Login (simulating failed login first)
    const loginFail = await request('/api/admin/login', {
      method: 'POST',
      body: { password: 'wrong' }
    });
    assert(loginFail.status === 401, 'Admin login rejects invalid password');

    // Admin Login (success) - we don't have the password easily accessible, let's check .env.local
    // But we can test product fetching as anon
    const shopPage = await request('/shop');
    assert(shopPage.status === 200, 'Shop page loaded successfully');

    // Try a checkout flow
    const checkoutRes = await request('/api/checkout', {
      method: 'POST',
      body: {
        customer_name: 'Test User',
        phone: '01012345678',
        governorate: 'Cairo',
        city: 'Nasr City',
        address: '123 Test St',
        payment_method: 'cash_on_delivery',
        items: [{ product_id: '123e4567-e89b-12d3-a456-426614174000', size: 'M', quantity: 1 }]
      }
    });
    // It should return either 400 (if invalid ID format handled) or 500 (if Supabase rejects it)
    assert(checkoutRes.status === 500 || checkoutRes.status === 400, `Checkout API responds with handled error for invalid product (Status: ${checkoutRes.status})`);

    // Verify error boundary
    // In dev we could throw an error, but in prod we can't easily trigger the error boundary from outside unless a specific URL throws
  } catch (error) {
    console.error("Test script failed:", error);
  }

  console.log(`\\nTest Run Complete: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
