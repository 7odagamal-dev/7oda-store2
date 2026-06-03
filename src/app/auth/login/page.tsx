'use client';

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-auth'
import { useAuth } from '@/context/AuthContext'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) router.push('/profile')
  }, [user, authLoading, router])

  if (authLoading || user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : signInError.message)
      setLoading(false)
      return
    }

    const redirect = searchParams.get('redirect') || '/profile'
    router.push(redirect)
  }

  return (
    <div className="min-h-screen pt-28 pb-12 px-6 sm:px-8 lg:px-10 bg-[#F8F9FB] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <h1 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-1">Welcome Back</h1>
          <p className="text-sm text-[#6B7280] mb-8">Sign in to your account</p>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

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

            <div>
              <label className="block text-xs tracking-[0.1em] uppercase text-[#6B7280] mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8BA4B8] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#1A1A1A] text-white text-sm tracking-[0.15em] uppercase font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-[#6B7280]">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-[#8BA4B8] hover:text-[#6B8BA0] font-medium">Create one</Link>
            </p>
            <p className="text-xs text-[#9CA3AF]">
              <Link href="/auth/forgot-password" className="hover:text-[#8BA4B8] transition-colors">Forgot password?</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
