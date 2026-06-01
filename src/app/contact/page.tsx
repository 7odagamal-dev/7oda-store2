'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.status === 429) {
        setError('Too many messages. Please try again later.');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send message. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError('');
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[#F8F9FB]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto px-6"
      >
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-[#1A1A1A] mb-3">
            Contact Us
          </h1>
          <p className="text-[#6B7280] text-sm">We&apos;d love to hear from you. Send us a message.</p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-sm"
          >
            <div className="w-16 h-16 bg-[#8BA4B8] rounded-full flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Thank You!</h2>
            <p className="text-[#6B7280]">We&apos;ll get back to you shortly.</p>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleSubmit}
            className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Name</label>
              <input
                type="text"
                name="name"
                required
                maxLength={200}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                maxLength={200}
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Message</label>
              <textarea
                name="message"
                required
                maxLength={2000}
                value={formData.message}
                onChange={handleChange}
                rows={5}
                className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none resize-none text-sm transition-all"
                placeholder="Your message..."
              />
            </div>

            {error && (
              <p className="text-rose-500 text-sm text-center bg-rose-50 py-2 rounded-lg">{error}</p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-[#8BA4B8] text-white font-semibold tracking-wider text-sm uppercase rounded-xl hover:bg-[#6B8BA0] transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </motion.button>
          </motion.form>
        )}

        {/* Contact Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { title: 'Email', value: 'info@ogoldstore.com', icon: '✉️' },
            { title: 'Phone', value: '+20 100 000 0000', icon: '📞' },
            { title: 'Location', value: 'Cairo, Egypt', icon: '📍' },
          ].map((item) => (
            <div key={item.title} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="font-semibold text-[#1A1A1A] mb-1">{item.title}</h3>
              <p className="text-sm text-[#6B7280]">{item.value}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}