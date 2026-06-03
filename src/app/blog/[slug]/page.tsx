import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEFAULT_STORE_ID } from '@/lib/store-context';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  tags: string[];
  published_at: string | null;
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const { data } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('store_id', DEFAULT_STORE_ID)
      .eq('slug', slug)
      .eq('published', true)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post Not Found' };
  return {
    title: `${post.title} | OG Old Gold Blog`,
    description: post.excerpt ?? post.title,
    openGraph: post.cover_image ? { images: [{ url: post.cover_image }] } : undefined,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <article className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-10 py-16 sm:py-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs text-[#6B7280] hover:text-[#1A1A1A] transition-colors mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Journal
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs uppercase tracking-widest text-[#8BA4B8] font-medium">{post.category}</span>
            {post.published_at && (
              <>
                <span className="text-[#E5E7EB]">|</span>
                <span className="text-xs text-[#9CA3AF]">{new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-[family-name:var(--font-playfair)] leading-tight">{post.title}</h1>
          {post.excerpt && (
            <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">{post.excerpt}</p>
          )}
        </header>

        {post.cover_image && (
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-[#F3F5F8] mb-10">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${post.cover_image})` }}
            />
          </div>
        )}

        <div
          className="prose prose-sm max-w-none text-[#1A1A1A] prose-headings:font-bold prose-headings:font-[family-name:var(--font-playfair)] prose-a:text-[#8BA4B8] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-[#E5E7EB]">
            {post.tags.map(tag => (
              <span key={tag} className="px-3 py-1.5 bg-[#F3F5F8] text-[#6B7280] text-xs rounded-lg">{tag}</span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
