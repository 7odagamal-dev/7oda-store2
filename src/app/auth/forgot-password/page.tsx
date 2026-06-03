'use client';

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-auth'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirect=/profile`,
    })

    if (resetError) {
      setError(resetError.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen pt-28 pb-12 px-6 sm:px-8 lg:px-10 bg-[#F8F9FB] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <h1 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-1">Reset Password</h1>
          <p className="text-sm text-[#6B7280] mb-8">Enter your email and we&apos;ll send you a reset link</p>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-6 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              Check your email for a password reset link.
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs tracking-[0.1em] uppercase text-[#6B7280] mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8BA4B8] focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#1A1A1A] text-white text-sm tracking-[0.15em] uppercase font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-[#6B7280]">
              <Link href="/auth/login" className="text-[#8BA4B8] hover:text-[#6B8BA0] font-medium">Back to Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
