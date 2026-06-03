'use client';

import { useEffect, useState } from 'react';

interface Review {
  id: string;
  product_slug: string;
  name: string;
  rating: number;
  comment: string;
  image: string | null;
  created_at: string;
}

interface ReviewSectionProps {
  productSlug: string;
}

export default function ReviewSection({ productSlug }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/products/${productSlug}/reviews`)
      .then(res => res.json())
      .then(json => {
        setReviews(json.reviews || []);
        setAverageRating(json.averageRating || 0);
        setTotalReviews(json.totalReviews || 0);
      })
      .catch(() => setError('Failed to load reviews'))
      .finally(() => setLoading(false));
  }, [productSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim() || rating === 0) {
      setError('Please fill in all fields and select a rating.');
      return;
    }
    let finalImageUrl = imageUrl;
    if (imageFile) {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', imageFile);
      const uploadRes = await fetch('/api/upload/review', { method: 'POST', body: formData });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.url;
      }
      setUploadingImage(false);
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productSlug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), rating, comment: comment.trim(), image: finalImageUrl || null }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setSubmitted(true);
      setName('');
      setRating(0);
      setComment('');
      setImageUrl('');
      setImageFile(null);
      // Refresh reviews
      const json = await fetch(`/api/products/${productSlug}/reviews`).then(r => r.json());
      setReviews(json.reviews || []);
      setAverageRating(json.averageRating || 0);
      setTotalReviews(json.totalReviews || 0);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count: number, interactive = false) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type={interactive ? 'button' : undefined}
          onClick={interactive ? () => setRating(star) : undefined}
          disabled={!interactive}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform ${
            star <= count ? 'text-amber-400' : 'text-[#D1D5DB]'
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="mt-12 pt-12 border-t border-[#E5E7EB]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[#E5E7EB] rounded w-1/4" />
          <div className="h-4 bg-[#E5E7EB] rounded w-1/3" />
          <div className="h-20 bg-[#E5E7EB] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 pt-12 border-t border-[#E5E7EB]">
      <h2 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Reviews</h2>

      {totalReviews > 0 && (
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl font-semibold text-[#1A1A1A]">{averageRating}</span>
          <div className="flex flex-col gap-0.5">
            {renderStars(Math.round(averageRating))}
            <span className="text-xs text-[#6B7280]">Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</span>
          </div>
        </div>
      )}

      {/* Review List */}
      <div className="space-y-6 mb-10">
        {reviews.length === 0 ? (
          <p className="text-[#9CA3AF] text-sm">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="bg-[#F3F5F8] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#8BA4B8] text-white flex items-center justify-center text-sm font-semibold">
                    {review.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{review.name}</p>
                    <p className="text-xs text-[#9CA3AF]">
                      {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                {renderStars(review.rating)}
              </div>
              <p className="text-sm text-[#4B5563] leading-relaxed">{review.comment}</p>
              {review.image && (
                <div className="mt-3 rounded-xl overflow-hidden bg-white max-w-[200px]">
                  <img src={review.image} alt="Review photo" className="w-full h-auto object-cover" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Review Form */}
      {submitted ? (
        <div className="bg-[#F0F7F4] border border-[#C6DFD4] rounded-2xl p-6 text-center">
          <p className="text-[#1A1A1A] font-medium">Thank you for your review!</p>
          <button onClick={() => setSubmitted(false)} className="mt-3 text-sm text-[#8BA4B8] hover:underline">
            Write another review
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-[#F3F5F8] rounded-2xl p-6">
          <h3 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-4">Write a Review</h3>

          {error && (
            <p className="text-rose-500 text-sm mb-4">{error}</p>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium text-[#6B7280] tracking-wider uppercase mb-1.5">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-[#6B7280] tracking-wider uppercase mb-1.5">Rating</label>
            {renderStars(rating, true)}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-[#6B7280] tracking-wider uppercase mb-1.5">Photo (optional)</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#6B7280] hover:border-[#8BA4B8] transition-all">
                {imageFile ? imageFile.name : 'Choose image (max 2MB)'}
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
              {imageFile && (
                <button onClick={() => setImageFile(null)} className="text-xs text-rose-500 hover:underline">Remove</button>
              )}
            </div>
            {imageFile && (
              <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden bg-white border border-[#E5E7EB]">
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-[#6B7280] tracking-wider uppercase mb-1.5">Your Review</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share your thoughts about this product..."
              rows={4}
              className="w-full px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingImage ? 'Uploading image...' : submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}
    </div>
  );
}
