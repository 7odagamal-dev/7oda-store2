import { NextRequest, NextResponse } from 'next/server';
import { createSession, warmupSchema } from '@/lib/auth';
import { normalizeSupabaseProjectUrl } from '@/lib/supabase-project-url';

import { checkRateLimit, clearRateLimit } from '@/lib/rate-limit';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

/** Normalize .env password: trim + strip one layer of matching outer quotes (dotenv / editors). */
function normalizeEnvPassword(raw: string): string {
  let s = raw.trim();
  while (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function isPlaceholderSupabaseUrl(url: string): boolean {
  return /YOUR_PROJECT|your-project|example\.com|changeme/i.test(url);
}

function isLikelyNetworkFetchFailure(message: string): boolean {
  return /fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|getaddrinfo|certificate|SSL|TLS|UNABLE_TO_VERIFY/i.test(
    message
  );
}

export async function POST(req: NextRequest) {
  // Warm up schema cache to avoid PostgREST cold-start delay
  warmupSchema();

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

  // Check rate limit
  const isAllowed = await checkRateLimit(ip, 'admin_login', MAX_ATTEMPTS, LOCKOUT_MS);
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again in 15 minutes.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const submitted =
    typeof body === 'object' &&
    body !== null &&
    'password' in body &&
    typeof (body as { password: unknown }).password === 'string'
      ? (body as { password: string }).password.trim()
      : '';

  const adminPasswordRaw = process.env.ADMIN_PASSWORD;
  if (adminPasswordRaw === undefined || adminPasswordRaw === '') {
    console.error('ADMIN_PASSWORD env variable is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const adminPassword = normalizeEnvPassword(adminPasswordRaw);

  if (submitted !== adminPassword) {
    // Attempt recorded inside checkRateLimit
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // Clear failed attempts on success
  await clearRateLimit(ip, 'admin_login');

  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

  if (!supabaseUrl) {
    return NextResponse.json(
      {
        error: 'NEXT_PUBLIC_SUPABASE_URL is not set in .env.local',
        hint: 'From Supabase: Settings → API → copy the Project URL (starts with https://).',
      },
      { status: 503 }
    );
  }
  if (isPlaceholderSupabaseUrl(supabaseUrl)) {
    return NextResponse.json(
      {
        error: 'Supabase URL still contains a placeholder (e.g. YOUR_PROJECT).',
        hint: 'Replace NEXT_PUBLIC_SUPABASE_URL with your real project URL, then restart the dev server.',
      },
      { status: 503 }
    );
  }
  try {
    const u = new URL(supabaseUrl);
    if (u.protocol !== 'https:') {
      return NextResponse.json(
        {
          error: 'NEXT_PUBLIC_SUPABASE_URL must use https',
          hint: 'Fix the URL in .env.local and restart the server.',
        },
        { status: 503 }
      );
    }
  } catch {
    return NextResponse.json(
      {
        error: 'NEXT_PUBLIC_SUPABASE_URL is not a valid URL',
        hint: 'Valid example: https://abcdefgh.supabase.co',
      },
      { status: 503 }
    );
  }

  if (!serviceKey || /YOUR_SERVICE_ROLE|changeme/i.test(serviceKey)) {
    return NextResponse.json(
      {
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set or still a placeholder.',
        hint: 'Supabase → Settings → API → copy the service_role secret (not anon) into .env.local and restart.',
      },
      { status: 503 }
    );
  }
  if (anonKey && serviceKey === anonKey) {
    return NextResponse.json(
      {
        error: 'SUPABASE_SERVICE_ROLE_KEY matches the anon key — this is a common mistake.',
        hint: 'Put the service_role key in SUPABASE_SERVICE_ROLE_KEY, and keep anon in NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      },
      { status: 503 }
    );
  }

  // SEC-01 FIX: store session in Supabase, not in-memory RAM
  const isDev = process.env.NODE_ENV === 'development';
  try {
    const { response } = await createSession({
      storeId: null,
      userId: null,
      userRole: null,
    });
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Admin session store failed:', msg);
    if (isLikelyNetworkFetchFailure(msg)) {
      return NextResponse.json(
        {
          error: 'Cannot connect to Supabase (network / request failed).',
          hint:
            '1) Make sure NEXT_PUBLIC_SUPABASE_URL matches your Project URL exactly. 2) Try opening the same URL in your browser. 3) Check your internet, VPN, and firewall. 4) Restart the dev server after any .env.local change.',
          ...(isDev ? { debug: msg } : {}),
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error: 'Unexpected error connecting to Supabase.',
        hint:
          'Check the terminal for the error message. Verify SUPABASE_SERVICE_ROLE_KEY and that the admin_sessions table exists.',
        ...(isDev ? { debug: msg } : {}),
      },
      { status: 503 }
    );
  }
}
