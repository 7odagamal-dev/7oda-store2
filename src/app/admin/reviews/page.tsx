'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Review {
  id: string;
  product_slug: string;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/admin/reviews');
      if (!res.ok) { setReviews([]); return; }
      const data = await res.json();
      setReviews(data || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review permanently?')) return;
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch {
      alert('Failed to delete review');
    }
  };

  const filteredReviews = reviews.filter(r =>
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.product_slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.comment?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStars = (count: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className={star <= count ? 'text-amber-400' : 'text-[#D1D5DB]'}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </span>
      ))}
    </div>
  );

  const averageRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-2">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A]">Reviews</h1>
        {!loading && reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-[#6B7280]">
            <span className="text-2xl font-bold text-amber-500">{averageRating}</span>
            {renderStars(Math.round(averageRating))}
            <span className="ml-1">({reviews.length} total)</span>
          </div>
        )}
      </div>

      <input type="text" placeholder="Search by name, product, or comment..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all mb-6" />

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (<div key={i} className="h-24 bg-[#F3F5F8] rounded-xl" />))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF]">
          <p className="font-[family-name:var(--font-playfair)]">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredReviews.map(review => (
              <motion.div key={review.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#8BA4B8] text-white flex items-center justify-center text-sm font-semibold">
                      {review.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">{review.name}</p>
                      <p className="text-xs text-[#8BA4B8] font-mono">{review.product_slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {renderStars(review.rating)}
                    <button onClick={() => deleteReview(review.id)}
                      className="p-2 bg-rose-50 text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                      title="Delete review">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-[#4B5563] text-sm leading-relaxed mb-2 border-l-2 border-[#E5E7EB] pl-4">{review.comment}</p>
                <p className="text-[#9CA3AF] text-xs">{new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
