'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  /* ── After credentials login, read role from session and redirect ── */
  const redirectByRole = (role: string | undefined) => {
    const target = role === 'law_enforcement' ? '/lawenforcementdashboard' : '/citizendashboard'
    // Hard navigation: guarantees the freshly-set session cookie is what
    // the next page reads, and sidesteps any App Router push/refresh race.
    window.location.href = target
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (!result || result.error) {
        setError('Invalid email or password. Please try again.')
        return
      }

      const session = await getSession()
      redirectByRole((session?.user as any)?.role)
    } catch (err) {
      console.error('Login error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── GitHub OAuth: redirect callback in auth.ts sends to /auth/role-redirect ── */
  const handleGitHubLogin = async () => {
    await signIn('github', { callbackUrl: '/auth/role-redirect' })
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-3xl mb-1">
              🛡️
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
            <p className="text-sm text-slate-400">Sign in to your CrimeAlert account</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                required
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[11px] text-blue-400 hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                required
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing In…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700/80" />
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-slate-700/80" />
          </div>

          <button
            onClick={handleGitHubLogin}
            className="w-full border border-slate-700 hover:bg-slate-800 hover:border-slate-600 px-4 py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2.5"
          >
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.165c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>

          <p className="text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
              Register
            </Link>
          </p>
        </div>

      
        
      </div>
    </div>
  )
}