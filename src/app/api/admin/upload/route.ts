/**
 * Admin Image Upload API — POST /api/admin/upload
 *
 * Security: Routes upload through server so we use the service-role key
 * (not the anon key) and verify the admin session first.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { csrfGuard, safeJson } from '@/lib/csrf';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Allowed: JPG, PNG, WebP, GIF' },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'Image size must be less than 5MB' },
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

    const arrayBuffer = await file.arrayBuffer();
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
      console.error('[Admin Upload] Storage error:', uploadError.message);
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);

    return safeJson({ url: urlData.publicUrl }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Upload] Unexpected error:', message);
    return NextResponse.json({ error: 'Server error during upload' }, { status: 500 });
  }
}
