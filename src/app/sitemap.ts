import { MetadataRoute } from 'next';
import { normalizeSupabaseProjectUrl } from '@/lib/supabase-project-url';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_STORE_ID } from '@/lib/store-context';

const STATIC_ROUTES = [
  '', '/about', '/blog', '/cart', '/checkout', '/contact', '/faq',
  '/order-success', '/privacy', '/returns', '/shipping-policy', '/shop',
  '/size-guide', '/terms', '/track', '/wishlist', '/auth/login',
  '/auth/register', '/auth/forgot-password', '/profile',
];

function getServerSupabase() {
  const url = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7h-store.life';

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' || route === '/shop' ? 'weekly' : 'monthly' as const,
    priority: route === '' ? 1.0 : route === '/shop' ? 0.9 : 0.7,
  }));

  const client = getServerSupabase();
    if (client) {
      const { data: products } = await client
        .from('products')
        .select('id, category, updated_at')
        .eq('store_id', DEFAULT_STORE_ID)
        .limit(1000);

      if (products) {
        for (const p of products) {
          entries.push({
            url: `${baseUrl}/product/${encodeURIComponent(p.category || 'uncategorized')}/${p.id}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }

    const { data: posts } = await client
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('published', true)
      .eq('store_id', DEFAULT_STORE_ID)
      .limit(500);

    if (posts) {
      for (const post of posts) {
        entries.push({
          url: `${baseUrl}/blog/${post.slug}`,
          lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      }
    }
  }

  return entries;
}
