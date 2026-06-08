import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { csrfGuard, safeJson } from '@/lib/csrf';
import sanitizeHtml from 'sanitize-html';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const { searchParams } = new URL(req.url);
    const includeUnpublished = searchParams.get('all') === 'true';

    let query = supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (!includeUnpublished) {
      query = query.eq('published', true);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Admin blog fetch error:', error.message);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Admin blog GET error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

function sanitizeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function sanitize(str: string, max = 5000): string {
  return str.trim().slice(0, max);
}

function sanitizeBlogContent(str: string): string {
  return sanitizeHtml(str, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'figcaption', 'hr']),
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      '*': ['class', 'id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    allowedSchemesByTag: { img: ['https', 'data'] },
  });
}

export async function POST(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const body = await req.json();

    const title = sanitize(body.title ?? '', 200);
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const content = sanitizeBlogContent(sanitize(body.content ?? '', 50000));
    if (!content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    let slug = body.slug ? sanitizeSlug(body.slug) : sanitizeSlug(title);
    if (!slug) slug = `post-${Date.now()}`;

    const excerpt = body.excerpt ? sanitize(body.excerpt, 500) : null;
    const coverImage = body.cover_image ? sanitize(body.cover_image, 500) : null;
    const category = body.category ? sanitize(body.category, 100) : 'Style Guide';
    const tags = Array.isArray(body.tags) ? body.tags.map((t: string) => sanitize(t, 50)).filter(Boolean) : [];
    const published = body.published === true;

    const { data: existing } = await supabaseAdmin
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('store_id', storeId)
      .maybeSingle();

    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const { data: post, error } = await supabaseAdmin
      .from('blog_posts')
      .insert([{
        store_id: storeId,
        title,
        slug,
        content,
        excerpt,
        cover_image: coverImage,
        category,
        tags,
        published,
        published_at: published ? new Date().toISOString() : null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Admin blog create error:', error.message);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    return safeJson({ post });
  } catch (error) {
    console.error('Admin blog POST error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = sanitize(body.title, 200);
    if (body.content !== undefined) updates.content = sanitizeBlogContent(sanitize(body.content, 50000));
    if (body.excerpt !== undefined) updates.excerpt = sanitize(body.excerpt, 500);
    if (body.cover_image !== undefined) updates.cover_image = sanitize(body.cover_image, 500);
    if (body.category !== undefined) updates.category = sanitize(body.category, 100);
    if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags.map((t: string) => sanitize(t, 50)).filter(Boolean) : [];

    if (body.slug !== undefined) {
      updates.slug = sanitizeSlug(body.slug) || `post-${Date.now()}`;
    }

    if (body.published !== undefined) {
      updates.published = body.published === true;
      if (updates.published) {
        const { data: existing } = await supabaseAdmin
          .from('blog_posts')
          .select('published_at')
          .eq('id', body.id)
          .single();
        if (!existing?.published_at) {
          updates.published_at = new Date().toISOString();
        }
      }
    }

    const { data: post, error } = await supabaseAdmin
      .from('blog_posts')
      .update(updates)
      .eq('id', body.id)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      console.error('Admin blog update error:', error.message);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    return safeJson({ post });
  } catch (error) {
    console.error('Admin blog PUT error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('blog_posts')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) {
      console.error('Admin blog delete error:', error.message);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    return safeJson({ success: true });
  } catch (error) {
    console.error('Admin blog DELETE error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
