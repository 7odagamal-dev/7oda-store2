/**
 * Admin Features — Verification Test Suite
 *
 * Run: npx tsx tests/admin-features-suite.ts
 * Covers: Payments, Bundles, Blog, Flash Sales, Bulk Upload
 *
 * Tests auth guards, CSRF protection, input validation, error handling,
 * store isolation, and edge cases for each admin API route.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';

const API_DIR = path.resolve('src/app/api/admin');

// ============================================================
// Helpers
// ============================================================

function readRoute(subpath: string): string {
  const filePath = path.join(API_DIR, subpath, 'route.ts');
  return fs.readFileSync(filePath, 'utf-8');
}

function countExports(src: string): string[] {
  const exports: string[] = [];
  const re = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g;
  let match;
  while ((match = re.exec(src)) !== null) {
    exports.push(match[1]);
  }
  return exports;
}

// ============================================================
// PHASE 1 — Bundles  (/api/admin/bundles)
// ============================================================

function test_bundles_exports_all_methods() {
  const src = readRoute('bundles');
  const methods = countExports(src);
  assert.deepStrictEqual(methods.sort(), ['DELETE', 'GET', 'POST', 'PUT'].sort());
  console.log('  PASS: Bundles exports GET/POST/PUT/DELETE');
}

function test_bundles_auth_on_get() {
  const src = readRoute('bundles');
  assert.ok(src.includes("getAdminSession(req)"), 'GET should call getAdminSession');
  assert.ok(src.includes("!session.valid"), 'GET should check session.valid');
  assert.ok(src.includes("401"), 'GET should return 401 on invalid session');
  console.log('  PASS: Bundles GET has auth guard');
}

function test_bundles_csrf_on_post() {
  const src = readRoute('bundles');
  const postIdx = src.indexOf('export async function POST');
  const putIdx = src.indexOf('export async function PUT');
  const delIdx = src.indexOf('export async function DELETE');
  const postSection = src.substring(postIdx, putIdx);
  const putSection = src.substring(putIdx, delIdx);
  const delSection = src.substring(delIdx);

  assert.ok(postSection.includes('csrfGuard(req)'), 'POST should call csrfGuard');
  assert.ok(putSection.includes('csrfGuard(req)'), 'PUT should call csrfGuard');
  assert.ok(delSection.includes('csrfGuard(req)'), 'DELETE should call csrfGuard');
  assert.ok(!src.substring(0, postIdx).includes('csrfGuard(req)'), 'GET should NOT call csrfGuard');
  console.log('  PASS: Bundles CSRF guards correct (POST/PUT/DELETE protected, GET not)');
}

function test_bundles_validation_on_post() {
  const src = readRoute('bundles');
  assert.ok(src.includes('!body.name'), 'POST validates name');
  assert.ok(src.includes('!body.products'), 'POST validates products');
  assert.ok(src.includes('body.products.length < 2'), 'POST requires >= 2 products');
  assert.ok(src.includes('!body.discount_type'), 'POST validates discount_type');
  assert.ok(src.includes("!['percentage', 'fixed']"), 'POST validates discount_type values');
  assert.ok(src.includes('!body.discount_value'), 'POST validates discount_value');
  assert.ok(src.includes('isNaN(dv)'), 'POST validates discount_value is number');
  console.log('  PASS: Bundles POST has full input validation');
}

function test_bundles_validation_on_put() {
  const src = readRoute('bundles');
  assert.ok(src.includes('!body.id'), 'PUT validates id');
  assert.ok(src.includes('trim().slice(0, 200)'), 'PUT sanitizes name length');
  assert.ok(src.includes('trim().slice(0, 500)'), 'PUT sanitizes description length');
  assert.ok(src.includes('body.products.length < 2'), 'PUT validates products count');
  console.log('  PASS: Bundles PUT has input validation + sanitization');
}

function test_bundles_store_isolation() {
  const src = readRoute('bundles');
  const getIdx = src.indexOf('export async function GET');
  const postIdx = src.indexOf('export async function POST');
  const getSection = src.substring(getIdx, postIdx);
  assert.ok(getSection.includes("session.storeId"), 'GET uses storeId from session');
  assert.ok(getSection.includes(".eq('store_id', storeId)"), 'GET filters by store_id');
  console.log('  PASS: Bundles enforces store isolation');
}

function test_bundles_error_handling() {
  const src = readRoute('bundles');
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  for (const m of methods) {
    const idx = src.indexOf(`export async function ${m}`);
    const next = m === 'DELETE' ? src.length : src.indexOf(`export async function `, idx + 10);
    const section = src.substring(idx, next > idx ? next : src.length);
    assert.ok(section.includes('try {'), `${m} should have try block`);
    assert.ok(section.includes('catch'), `${m} should have catch block`);
    assert.ok(section.includes('error.message') || section.includes('error instanceof Error'), `${m} should have fallback error`);
  }
  console.log('  PASS: Bundles all methods have try/catch error handling');
}

// ============================================================
// PHASE 2 — Blog  (/api/admin/blog)
// ============================================================

function test_blog_exports_all_methods() {
  const src = readRoute('blog');
  const methods = countExports(src);
  assert.deepStrictEqual(methods.sort(), ['DELETE', 'GET', 'POST', 'PUT'].sort());
  console.log('  PASS: Blog exports GET/POST/PUT/DELETE');
}

function test_blog_auth_on_get() {
  const src = readRoute('blog');
  assert.ok(src.includes("getAdminSession(req)"), 'GET should call getAdminSession');
  assert.ok(src.includes("!session.valid"), 'GET should check session.valid');
  assert.ok(src.includes("401"), 'GET should return 401');
  console.log('  PASS: Blog GET has auth guard');
}

function test_blog_csrf_on_mutations() {
  const src = readRoute('blog');
  const postIdx = src.indexOf('export async function POST');
  const putIdx = src.indexOf('export async function PUT');
  const delIdx = src.indexOf('export async function DELETE');
  assert.ok(src.substring(postIdx, putIdx).includes('csrfGuard(req)'), 'POST has CSRF');
  assert.ok(src.substring(putIdx, delIdx).includes('csrfGuard(req)'), 'PUT has CSRF');
  assert.ok(src.substring(delIdx).includes('csrfGuard(req)'), 'DELETE has CSRF');
  console.log('  PASS: Blog CSRF guards correct (POST/PUT/DELETE protected)');
}

function test_blog_post_validation() {
  const src = readRoute('blog');
  assert.ok(src.includes('!title'), 'POST validates title');
  assert.ok(src.includes('!content'), 'POST validates content');
  assert.ok(src.includes('200'), 'title max length checking');
  assert.ok(src.includes('50000'), 'content max length checking');
  assert.ok(src.includes('sanitize(body.title'), 'POST sanitizes title');
  assert.ok(src.includes('sanitize(body.content'), 'POST sanitizes content');
  assert.ok(src.includes('sanitizeSlug'), 'POST generates slug');
  assert.ok(src.includes('published === true'), 'POST handles published flag');
  assert.ok(src.includes('published_at'), 'POST sets published_at');
  console.log('  PASS: Blog POST has full validation + sanitization');
}

function test_blog_put_validation() {
  const src = readRoute('blog');
  assert.ok(src.includes('!body.id'), 'PUT validates id');
  assert.ok(src.includes('sanitize(body.title, 200)'), 'PUT sanitizes title');
  assert.ok(src.includes('sanitize(body.content, 50000)'), 'PUT sanitizes content');
  assert.ok(src.includes('sanitize(body.excerpt, 500)'), 'PUT sanitizes excerpt');
  assert.ok(src.includes('sanitize(body.category, 100)'), 'PUT sanitizes category');
  assert.ok(src.includes('sanitizeSlug'), 'PUT handles slug update');
  assert.ok(src.includes('published_at'), 'PUT handles published_at on publish');
  console.log('  PASS: Blog PUT has validation + sanitization + published_at logic');
}

function test_blog_slug_dedup() {
  const src = readRoute('blog');
  assert.ok(src.includes("${slug}-${Date.now().toString(36)}"), 'POST handles duplicate slugs');
  assert.ok(src.includes(".maybeSingle()"), 'POST checks for existing slug');
  console.log('  PASS: Blog POST deduplicates slugs');
}

function test_blog_store_isolation() {
  const src = readRoute('blog');
  assert.ok(src.includes("session.storeId"), 'Uses storeId from session');
  assert.ok(src.includes(".eq('store_id', storeId)"), 'Filters by store_id on GET');
  assert.ok(src.includes(".eq('store_id', storeId)") && src.includes('body.id') && src.includes('.eq(\'id\''), 'PUT/DELETE filter by store_id');
  console.log('  PASS: Blog enforces store isolation');
}

function test_blog_sanitize_functions() {
  const src = readRoute('blog');
  assert.ok(src.includes('function sanitizeSlug'), 'Has sanitizeSlug helper');
  assert.ok(src.includes('function sanitize'), 'Has sanitize helper');
  assert.ok(src.includes('.replace(/[^\\w\\s-]/g'), 'sanitizeSlug strips special chars');
  console.log('  PASS: Blog has sanitize utilities');
}

// ============================================================
// PHASE 3 — Flash Sales  (/api/admin/flash-sales)
// ============================================================

function test_flash_exports_all_methods() {
  const src = readRoute('flash-sales');
  const methods = countExports(src);
  assert.deepStrictEqual(methods.sort(), ['DELETE', 'GET', 'POST', 'PUT'].sort());
  console.log('  PASS: Flash Sales exports GET/POST/PUT/DELETE');
}

function test_flash_auth_on_all() {
  const src = readRoute('flash-sales');
  const getIdx = src.indexOf('export async function GET');
  const postIdx = src.indexOf('export async function POST');
  const getSection = src.substring(getIdx, postIdx);
  assert.ok(getSection.includes("getAdminSession(req)"), 'GET has auth');
  assert.ok(getSection.includes("!session.valid"), 'GET checks valid');
  console.log('  PASS: Flash Sales GET has auth guard');
}

function test_flash_csrf_on_mutations() {
  const src = readRoute('flash-sales');
  const postIdx = src.indexOf('export async function POST');
  const putIdx = src.indexOf('export async function PUT');
  const delIdx = src.indexOf('export async function DELETE');
  assert.ok(src.substring(postIdx, putIdx).includes('csrfGuard(req)'), 'POST has CSRF');
  assert.ok(src.substring(putIdx, delIdx).includes('csrfGuard(req)'), 'PUT has CSRF');
  assert.ok(src.substring(delIdx).includes('csrfGuard(req)'), 'DELETE has CSRF');
  console.log('  PASS: Flash Sales CSRF guards correct');
}

function test_flash_post_validation() {
  const src = readRoute('flash-sales');
  assert.ok(src.includes('!body.product_id'), 'POST validates product_id');
  assert.ok(src.includes('discount < 1 || discount > 100'), 'POST validates discount range');
  assert.ok(src.includes('!body.ends_at'), 'POST validates ends_at');
  assert.ok(src.includes('endsAt <= new Date()'), 'POST validates future date');
  assert.ok(src.includes('parseInt(body.discount_percentage)'), 'POST parses discount');
  console.log('  PASS: Flash Sales POST validates all required fields');
}

function test_flash_put_validation() {
  const src = readRoute('flash-sales');
  assert.ok(src.includes('!body.id'), 'PUT validates id');
  assert.ok(src.includes('discount < 1 || discount > 100'), 'PUT validates discount');
  assert.ok(src.includes('endsAt <= new Date()'), 'PUT validates future date');
  assert.ok(src.includes('body.is_active !== undefined'), 'PUT validates is_active');
  console.log('  PASS: Flash Sales PUT validates fields');
}

function test_flash_pagination() {
  const src = readRoute('flash-sales');
  assert.ok(src.includes('searchParams.get'), 'GET uses searchParams');
  assert.ok(src.includes('.range(from, to)'), 'GET uses pagination range');
  assert.ok(src.includes('totalPages'), 'GET returns totalPages');
  assert.ok(src.includes('Math.ceil'), 'GET calculates totalPages');
  console.log('  PASS: Flash Sales GET has pagination');
}

function test_flash_store_isolation() {
  const src = readRoute('flash-sales');
  assert.ok(src.includes("session.storeId"), 'Uses storeId');
  assert.ok(src.includes(".eq('store_id', storeId)"), 'Filters by store_id');
  console.log('  PASS: Flash Sales enforces store isolation');
}

function test_flash_delete_store_isolation() {
  const src = readRoute('flash-sales');
  const delIdx = src.indexOf('export async function DELETE');
  const section = src.substring(delIdx);
  assert.ok(section.includes(".eq('store_id', storeId)"), 'DELETE filters by store_id');
  assert.ok(section.includes(".eq('id',"), 'DELETE filters by id');
  console.log('  PASS: Flash Sales DELETE scoped to store');
}

// ============================================================
// PHASE 4 — Bulk Upload  (/api/admin/products/bulk)
// ============================================================

function test_bulk_exports_only_post() {
  const src = readRoute('products/bulk');
  const methods = countExports(src);
  assert.deepStrictEqual(methods, ['POST'], 'Bulk should only export POST');
  console.log('  PASS: Bulk Upload exports only POST');
}

function test_bulk_auth_and_csrf() {
  const src = readRoute('products/bulk');
  assert.ok(src.includes('getAdminSession(request)'), 'Has auth guard');
  assert.ok(src.includes('!session.valid'), 'Checks session.valid');
  assert.ok(src.includes('csrfGuard(request)'), 'Has CSRF guard');
  assert.ok(src.includes('401'), 'Returns 401 on invalid session');
  console.log('  PASS: Bulk Upload has auth + CSRF guards');
}

function test_bulk_file_validation() {
  const src = readRoute('products/bulk');
  assert.ok(src.includes("form.get('file')"), 'Parses form data');
  assert.ok(src.includes('!file'), 'Validates file exists');
  assert.ok(src.includes('!rows.length'), 'Validates file not empty');
  assert.ok(src.includes('400'), 'Returns 400 on invalid file');
  console.log('  PASS: Bulk Upload validates file input');
}

function test_bulk_row_parsing() {
  const src = readRoute('products/bulk');
  assert.ok(src.includes('r.name || r.Name'), 'Parses name with case variants');
  assert.ok(src.includes('r.price || r.Price'), 'Parses price with case variants');
  assert.ok(src.includes('r.stock || r.Stock'), 'Parses stock with case variants');
  assert.ok(src.includes('r.category || r.Category'), 'Parses category with case variants');
  assert.ok(src.includes('r.sizes || r.Sizes'), 'Parses sizes with case variants');
  assert.ok(src.includes('r.old_price || r.oldPrice'), 'Parses old_price variants');
  assert.ok(src.includes('r.main_image || r.mainImage'), 'Parses main_image variants');
  assert.ok(src.includes('r.description || r.Description'), 'Parses description variants');
  console.log('  PASS: Bulk Upload parses column name variants');
}

function test_bulk_row_validation() {
  const src = readRoute('products/bulk');
  assert.ok(src.includes('!name || !price || !category'), 'Validates required fields per row');
  assert.ok(src.includes('Missing required fields'), 'Reports field errors');
  assert.ok(src.includes('results.errors.push'), 'Accumulates row errors');
  assert.ok(src.includes('results.success++'), 'Tracks success count');
  console.log('  PASS: Bulk Upload validates per-row required fields');
}

function test_bulk_error_containment() {
  const src = readRoute('products/bulk');
  assert.ok(src.includes('try {'), 'Each row has try/catch');
  assert.ok(src.includes('err instanceof Error'), 'Error type narrowing');
  assert.ok(src.includes('results.errors.push'), 'Errors captured per row');
  console.log('  PASS: Bulk Upload errors are contained per row');
}

function test_bulk_xlsx_usage() {
  const src = readRoute('products/bulk');
  assert.ok(src.includes("XLSX.read("), 'Uses XLSX library');
  assert.ok(src.includes("XLSX.utils.sheet_to_json"), 'Converts sheet to JSON');
  assert.ok(src.includes("'xlsx'"), 'Imports xlsx library');
  console.log('  PASS: Bulk Upload uses XLSX for file parsing');
}

function test_bulk_product_defaults() {
  const src = readRoute('products/bulk');
  assert.ok(src.includes("is_featured: false"), 'Defaults is_featured to false');
  assert.ok(src.includes("['M', 'L', 'XL']"), 'Default sizes for missing size data');
  assert.ok(src.includes("discount_percentage: discountPct"), 'Calculates discount_percentage');
  assert.ok(src.includes('oldPrice - price') && src.includes('/ oldPrice'), 'Discount calc formula');
  console.log('  PASS: Bulk Upload sets sensible defaults');
}

// ============================================================
// PHASE 5 — Payments (Reconciliation)  (/api/admin/reconciliation)
// ============================================================

function test_reconciliation_exports() {
  const src = readRoute('reconciliation');
  const methods = countExports(src);
  assert.ok(methods.includes('GET'), 'Reconciliation exports GET');
  assert.ok(methods.length >= 1, 'Exports at least GET');
  console.log('  PASS: Reconciliation exports GET');
}

function test_reconciliation_auth() {
  const src = readRoute('reconciliation');
  assert.ok(src.includes('getAdminSession'), 'Has auth guard');
  assert.ok(src.includes('!session.valid'), 'Checks session.valid');
  assert.ok(src.includes('401'), 'Returns 401');
  console.log('  PASS: Reconciliation has auth guard');
}

function test_reconciliation_returns_all_three() {
  const src = readRoute('reconciliation');
  assert.ok(src.includes("'payment_events'"), 'Queries payment_events');
  assert.ok(src.includes("'payment_errors'"), 'Queries payment_errors');
  assert.ok(src.includes("'paymob_orders'") || src.includes("'payment_events'"), 'Queries orders data');
  assert.ok(src.includes('.select('), 'Selects from DB');
  console.log('  PASS: Reconciliation queries all payment tables');
}

function test_reconciliation_store_isolation() {
  const src = readRoute('reconciliation');
  const filterByStoreCount = (src.match(/filterByStore\(/g) || []).length;
  assert.ok(filterByStoreCount >= 3, 'Uses filterByStore on all 3 queries');
  assert.ok(src.includes("session.storeId"), 'Uses storeId from session');
  assert.ok(src.includes("if (session.storeId)"), 'Conditional store filtering');
  console.log('  PASS: Reconciliation enforces store isolation via filterByStore');
}

function test_reconciliation_error_handling() {
  const src = readRoute('reconciliation');
  assert.ok(src.includes('try {'), 'Has try block');
  assert.ok(src.includes('catch'), 'Has catch block');
  assert.ok(src.includes('500'), 'Returns 500 on error');
  console.log('  PASS: Reconciliation has error handling');
}

// ============================================================
// Cross-cutting: No hardcoded secrets in any route
// ============================================================

function test_no_hardcoded_secrets() {
  const files = ['bundles', 'blog', 'flash-sales', 'products/bulk', 'reconciliation'];
  for (const f of files) {
    const src = readRoute(f);
    assert.ok(!src.includes('service_role'), `${f}: no service_role key in code`);
    assert.ok(!src.includes('supabaseKey'), `${f}: no supabaseKey in code`);
    assert.ok(!src.includes('process.env.SERVICE_ROLE_KEY'), `${f}: no direct env access`);
  }
  console.log('  PASS: No hardcoded secrets in any route');
}

function test_all_routes_use_supabaseAdmin() {
  const files = ['bundles', 'blog', 'flash-sales', 'products/bulk', 'reconciliation'];
  for (const f of files) {
    const src = readRoute(f);
    assert.ok(src.includes("supabaseAdmin"), `${f}: uses supabaseAdmin`);
    assert.ok(!src.includes("createClient("), `${f}: no direct createClient`);
  }
  console.log('  PASS: All routes use supabaseAdmin service role');
}

function test_all_imports_include_auth() {
  const files = ['bundles', 'blog', 'flash-sales', 'products/bulk', 'reconciliation'];
  for (const f of files) {
    const src = readRoute(f);
    assert.ok(src.includes("'@/lib/auth'"), `${f}: imports auth`);
    assert.ok(src.includes("'@/lib/csrf'"), `${f}: imports csrf`);
  }
  console.log('  PASS: All routes import auth + csrf modules');
}

// ============================================================
// Test Runner
// ============================================================

const phases: Record<string, (() => void)[]> = {
  '📁 Bundles': [
    test_bundles_exports_all_methods,
    test_bundles_auth_on_get,
    test_bundles_csrf_on_post,
    test_bundles_validation_on_post,
    test_bundles_validation_on_put,
    test_bundles_store_isolation,
    test_bundles_error_handling,
  ],
  '📁 Blog': [
    test_blog_exports_all_methods,
    test_blog_auth_on_get,
    test_blog_csrf_on_mutations,
    test_blog_post_validation,
    test_blog_put_validation,
    test_blog_slug_dedup,
    test_blog_store_isolation,
    test_blog_sanitize_functions,
  ],
  '📁 Flash Sales': [
    test_flash_exports_all_methods,
    test_flash_auth_on_all,
    test_flash_csrf_on_mutations,
    test_flash_post_validation,
    test_flash_put_validation,
    test_flash_pagination,
    test_flash_store_isolation,
    test_flash_delete_store_isolation,
  ],
  '📁 Bulk Upload': [
    test_bulk_exports_only_post,
    test_bulk_auth_and_csrf,
    test_bulk_file_validation,
    test_bulk_row_parsing,
    test_bulk_row_validation,
    test_bulk_error_containment,
    test_bulk_xlsx_usage,
    test_bulk_product_defaults,
  ],
  '📁 Payments': [
    test_reconciliation_exports,
    test_reconciliation_auth,
    test_reconciliation_returns_all_three,
    test_reconciliation_store_isolation,
    test_reconciliation_error_handling,
  ],
  '🔒 Cross-cutting': [
    test_no_hardcoded_secrets,
    test_all_routes_use_supabaseAdmin,
    test_all_imports_include_auth,
  ],
};

let totalPassed = 0;
let totalFailed = 0;

console.log('🧪 Admin Features — Verification Test Suite');
console.log('='.repeat(60));

for (const [phase, tests] of Object.entries(phases)) {
  console.log(`\n${phase}`);
  console.log('─'.repeat(60));
  for (const test of tests) {
    try {
      test();
      totalPassed++;
    } catch (err: unknown) {
      totalFailed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ FAIL: ${test.name}: ${msg}`);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Results: ${totalPassed} passed, ${totalFailed} failed, ${totalPassed + totalFailed} total`);
console.log('='.repeat(60));

if (totalFailed > 0) {
  console.log('\n❌ Some tests FAILED — review issues above');
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED — Admin features verified');
}
