import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';
import { log, newCorrelationId } from '@/lib/logger';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

export async function POST(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();

  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const rlAllowed = await checkRateLimit(ip, 'upload_review_image', 10, 3600000);
  if (!rlAllowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large. Max 2MB.' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, WebP, and GIF images are allowed' }, { status: 400 });
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) return NextResponse.json({ error: 'SVG files are not allowed' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    const isJPEG = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPNG  = buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isGIF  = buffer.length >= 6 && (buffer.slice(0, 6).toString() === 'GIF87a' || buffer.slice(0, 6).toString() === 'GIF89a');
    const isWEBP = buffer.length >= 12 && buffer.slice(8, 12).toString() === 'WEBP';

    if (!isJPEG && !isPNG && !isGIF && !isWEBP) {
      return NextResponse.json({ error: 'Invalid file signature' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeExt = ALLOWED_EXTS.includes(ext) ? ext : 'jpg';
    const fileName = `review-${crypto.randomUUID()}.${safeExt}`;

    const { error } = await supabaseAdmin.storage
      .from('review-images')
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (error) {
      log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/upload/review', method: 'POST', statusCode: 500, level: 'error', message: 'Review image storage error', error: error.message });
      console.error('Review image upload error:', error.message);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('review-images').getPublicUrl(fileName);
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/upload/review', method: 'POST', statusCode: 200, level: 'info', message: 'Review image uploaded', metadata: { fileName, fileSize: file.size } });
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/upload/review', method: 'POST', statusCode: 500, level: 'error', message: 'Review image upload failed', error: msg });
    console.error('Upload review image error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
