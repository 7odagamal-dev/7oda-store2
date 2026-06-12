/**
 * Admin Image Upload API — POST /api/admin/upload
 *
 * Security: Routes upload through server so we use the service-role key
 * (not the anon key) and verify the admin session first.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { requireRole } from '@/lib/admin-guards';
import { csrfGuard, safeJson } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Magic bytes for image validation (first bytes of the file)
const MAGIC_BYTES: Record<string, Uint8Array> = {
  'image/jpeg': new Uint8Array([0xFF, 0xD8, 0xFF]),
  'image/png':  new Uint8Array([0x89, 0x50, 0x4E, 0x47]),
  'image/gif':  new Uint8Array([0x47, 0x49, 0x46, 0x38]), // GIF89a or GIF87a
};

function checkMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const header = new Uint8Array(buffer.slice(0, 12));
  const magic = MAGIC_BYTES[mimeType];
  if (magic) {
    for (let i = 0; i < magic.length; i++) {
      if (header[i] !== magic[i]) return false;
    }
    return true;
  }
  // WebP detection: RIFF + WEBP
  if (mimeType === 'image/webp') {
    return (
      header[0] === 0x52 && header[1] === 0x49 && // R
      header[2] === 0x46 && header[3] === 0x46 && // IFF
      header[8] === 0x57 && header[9] === 0x45 && // W
      header[10] === 0x42 && header[11] === 0x50   // EBP
    );
  }
  return false;
}

// Blocked MIME types (SVG, HTML, XML, etc.)
const BLOCKED_MAGIC: Uint8Array[] = [
  new Uint8Array([0x3C, 0x73, 0x76, 0x67]), // <svg
  new Uint8Array([0x3C, 0x3F, 0x78, 0x6D]), // <?xm
  new Uint8Array([0x3C, 0x21, 0x44, 0x4F]), // <!DO
  new Uint8Array([0x3C, 0x48, 0x54, 0x4D]), // <HTM
  new Uint8Array([0x3C, 0x68, 0x74, 0x6D]), // <htm
];

function isBlockedFormat(buffer: ArrayBuffer): boolean {
  const header = new Uint8Array(buffer.slice(0, 4));
  for (const blocked of BLOCKED_MAGIC) {
    let match = true;
    for (let i = 0; i < blocked.length; i++) {
      if (header[i] !== blocked[i]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;
  void getAdminSession(req);

  const correlationId = newCorrelationId();
  const startMs = Date.now();

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_upload', 10, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file size first (before reading bytes)
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'Image size must be less than 5MB' },
      { status: 400 }
    );
  }

  // Read file bytes for magic byte validation
  const arrayBuffer = await file.arrayBuffer();

  // Block SVG, HTML, XML disguised as images
  if (isBlockedFormat(arrayBuffer)) {
    return NextResponse.json(
      { error: 'SVG, HTML, and XML files are not allowed' },
      { status: 400 }
    );
  }

  // Validate MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Allowed: JPG, PNG, WebP, GIF' },
      { status: 400 }
    );
  }

  // Validate magic bytes (defense against MIME spoofing)
  if (!checkMagicBytes(arrayBuffer, file.type)) {
    return NextResponse.json(
      { error: 'File content does not match its declared type' },
      { status: 400 }
    );
  }

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
    const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

    // Ensure bucket exists (idempotent — no-op if already present)
    const { data: existingBucket } = await supabaseAdmin.storage.getBucket('product-images');
    if (!existingBucket) {
      await supabaseAdmin.storage.createBucket('product-images', { public: true });
    }

    const buffer = Buffer.from(arrayBuffer);

    // Use service-role key (supabaseAdmin) — not anon key
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/upload', method: 'POST', statusCode: 500, level: 'error', message: 'Storage upload error', error: uploadError.message });
      console.error('[Admin Upload] Storage error:', uploadError.message);
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);

    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/upload', method: 'POST', statusCode: 201, level: 'info', message: 'Upload successful', metadata: { fileName: uploadData.path, fileSize: file.size, mimeType: file.type } });
    return safeJson({ url: urlData.publicUrl }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/upload', method: 'POST', statusCode: 500, level: 'error', message: 'Upload failed', error: message });
    console.error('[Admin Upload] Unexpected error:', message);
    return NextResponse.json({ error: 'Server error during upload' }, { status: 500 });
  }
}
