import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEFAULT_STORE_ID } from '@/lib/store-context';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | 7H ',
  description: 'Style guides, fashion tips, and the latest trends from 7H .',
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  tags: string[];
  published_at: string | null;
}

async function getPosts(): Promise<BlogPost[]> {
  try {
    const { data } = await supabaseAdmin
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image, category, tags, published_at')
      .eq('store_id', DEFAULT_STORE_ID)
      .eq('published', true)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-10 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-playfair)] tracking-wide">The Journal</h1>
          <p className="text-[#6B7280] text-sm mt-3 max-w-lg mx-auto">Style guides, fashion insights, and curated stories from 7H .</p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#9CA3AF] text-sm">No posts yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="aspect-[16/10] bg-[#F3F5F8] overflow-hidden">
                  {post.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl font-bold text-[#E5E7EB] font-[family-name:var(--font-playfair)]">7H</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#8BA4B8] font-medium">{post.category}</span>
                    {post.published_at && (
                      <>
                        <span className="text-[#E5E7EB]">|</span>
                        <span className="text-[10px] text-[#9CA3AF]">{new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </>
                    )}
                  </div>
                  <h2 className="font-bold text-sm group-hover:text-[#8BA4B8] transition-colors">{post.title}</h2>
                  {post.excerpt && (
                    <p className="text-xs text-[#6B7280] mt-2 line-clamp-2">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
