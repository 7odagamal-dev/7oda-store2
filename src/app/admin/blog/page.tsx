'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminFetch } from '@/lib/admin-fetch';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  tags: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
}

const emptyForm = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  cover_image: '',
  category: 'Style Guide',
  tags: '',
  published: false,
};

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/blog?all=true');
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt ?? '',
      cover_image: post.cover_image ?? '',
      category: post.category,
      tags: post.tags.join(', '),
      published: post.published,
    });
    setEditingId(post.id);
    setShowForm(true);
  };

  const handleNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      const res = await adminFetch('/api/admin/blog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setPosts(prev => prev.filter(p => p.id !== id));
    } catch {}
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      const res = await adminFetch('/api/admin/blog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, published: !post.published }),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p => p.id === post.id ? data.post : p));
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        content: form.content.trim(),
        excerpt: form.excerpt.trim() || null,
        cover_image: form.cover_image.trim() || null,
        category: form.category,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        published: form.published,
      };

      if (form.slug.trim()) body.slug = form.slug.trim();

      let res;
      if (editingId) {
        res = await adminFetch('/api/admin/blog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, id: editingId }),
        });
      } else {
        res = await adminFetch('/api/admin/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        await fetchPosts();
        setShowForm(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save post');
      }
    } catch {
      alert('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = () => {
    const slug = form.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setForm(prev => ({ ...prev, slug }));
  };

  const filtered = posts.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.excerpt?.toLowerCase() ?? '').includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' ? true :
      statusFilter === 'published' ? p.published : !p.published;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <button
          onClick={handleNew}
          className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all"
        >
          New Post
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search posts..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-4 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border border-[#E5E7EB] p-6 mb-6 overflow-hidden"
          >
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Post' : 'New Post'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Title <span className="text-rose-400">*</span></label>
                <input
                  type="text" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Slug</label>
                <div className="flex gap-2">
                  <input
                    type="text" value={form.slug}
                    onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                    placeholder="Auto-generated from title"
                    className="flex-1 px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                  />
                  <button onClick={generateSlug}
                    className="px-4 py-3 bg-[#F3F5F8] border border-[#E5E7EB] rounded-xl text-xs text-[#6B7280] hover:bg-[#E5E7EB] transition-all"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                  >
                    <option>Style Guide</option>
                    <option>Fashion</option>
                    <option>News</option>
                    <option>Tutorial</option>
                    <option>Trends</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Tags (comma separated)</label>
                  <input
                    type="text" value={form.tags}
                    onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                    placeholder="e.g. streetwear, casual, summer"
                    className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Excerpt</label>
                <textarea value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))} rows={2}
                  placeholder="Short description for preview cards..."
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Cover Image URL</label>
                <input
                  type="text" value={form.cover_image}
                  onChange={e => setForm(p => ({ ...p, cover_image: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Content <span className="text-rose-400">*</span></label>
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={12}
                  placeholder="Write your post content here... Supports basic HTML tags (<b>, <i>, <a>, <img>, etc.)"
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all resize-none font-mono"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => setForm(p => ({ ...p, published: e.target.checked }))}
                  className="w-4 h-4 rounded border-[#E5E7EB] text-[#8BA4B8] focus:ring-[#8BA4B8]"
                />
                <span className="text-sm font-medium">Publish immediately</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}
                  className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Post' : 'Create Post'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-[#F3F5F8] border border-[#E5E7EB] rounded-xl text-sm text-[#6B7280] hover:bg-[#E5E7EB] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#9CA3AF] text-sm">
            {searchTerm || statusFilter !== 'all' ? 'No posts match your filters.' : 'No blog posts yet. Create your first post!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-sm">{post.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${post.published ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-[#9CA3AF]">/{post.slug}</span>
                  <span className="text-xs text-[#8BA4B8]">{post.category}</span>
                  <span className="text-xs text-[#9CA3AF]">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleTogglePublish(post)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all ${post.published ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  {post.published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => handleEdit(post)}
                  className="px-3 py-1.5 text-xs bg-[#F3F5F8] text-[#6B7280] rounded-lg hover:bg-[#E5E7EB] transition-all"
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(post.id)}
                  className="px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
