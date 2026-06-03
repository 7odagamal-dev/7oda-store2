'use client';

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function RegisterPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      setSuccess('Account created! You can now log in.')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) router.push('/profile')
  }, [user, authLoading, router])

  if (authLoading || user) return null

  return (
    <div className="min-h-screen pt-28 pb-12 px-6 sm:px-8 lg:px-10 bg-[#F8F9FB] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <h1 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-1">Create Account</h1>
          <p className="text-sm text-[#6B7280] mb-8">Join OG Old Gold today</p>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-6 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs tracking-[0.1em] uppercase text-[#6B7280] mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8BA4B8] focus:border-transparent transition-all"
                  placeholder="Your name"
                />
              </div>
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

              <div>
                <label className="block text-xs tracking-[0.1em] uppercase text-[#6B7280] mb-2">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8BA4B8] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#1A1A1A] text-white text-sm tracking-[0.15em] uppercase font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-[#6B7280]">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[#8BA4B8] hover:text-[#6B8BA0] font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
