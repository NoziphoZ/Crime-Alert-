'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  
  const plan   = searchParams.get('plan')      // 'trial' | '2month' | '3month'
  const price  = searchParams.get('price')     // '100' | '150' | null
  const months = searchParams.get('months')    // '2' | '3' | null

  const isTrial   = plan === 'trial'
  const isPaidPlan = plan && !isTrial

  const [firstName,       setFirstName]       = useState('')
  const [lastName,        setLastName]        = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms,     setAcceptTerms]     = useState(false)
  const [role,            setRole]            = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  const roles = [
    { label: 'Citizen',          value: 'citizen'          },
    { label: 'Law Enforcement',  value: 'law_enforcement'  },
  ]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!role) {
      setError('Please select a role.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, role }),
      })

      // Guard: if the server returned HTML (wrong path / 404), surface a clear error
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        setError('API route not found. Check that src/app/api/register/route.ts exists.')
        setLoading(false)
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed.')
        setLoading(false)
        return
      }

      // ── Redirect logic ────────────────────────────────────────────
      if (isTrial) {
        // Free trial: account created, go sign in — the login flow
        // will create the trial subscription via /api/payment on first
        // protected page visit (or you can POST to /api/payment here
        // after signing in automatically via signIn()).
        router.push('/login?message=registered_trial')
      } else if (isPaidPlan) {
        // Paid plan: take them straight to payment
        const params = new URLSearchParams()
        if (plan)   params.set('plan',   plan)
        if (price)  params.set('price',  price)
        if (months) params.set('months', months)
        router.push(`/payment?${params.toString()}`)
      } else {
        // No plan selected (direct /register visit)
        router.push('/login')
      }

    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-slate-900/40 border border-slate-700 rounded-3xl overflow-hidden">

        {/* LEFT */}
        <div className="md:col-span-5 bg-blue-600 p-8 flex flex-col justify-center items-center text-center gap-4">
          <h2 className="text-3xl font-bold">Join CrimeAlert</h2>
          <p className="text-blue-100">Create your account to continue</p>

          {/* Show selected plan summary if coming from pricing */}
          {plan && (
            <div className="mt-4 bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-sm w-full max-w-[220px]">
              {isTrial ? (
                <>
                  <p className="font-bold text-white text-base mb-1">🎉 Free Trial</p>
                  <p className="text-blue-100">1 month free — no card needed</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-white text-base mb-1">
                    R{price} / {months} months
                  </p>
                  <p className="text-blue-100">You&apos;ll be taken to payment after registering</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="md:col-span-7 p-8">
          <h3 className="text-2xl font-bold mb-6">Create Account</h3>

          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
              required
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white focus:outline-none focus:border-blue-500 transition"
              required
            >
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
              required
            />

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
              required
            />

            <div className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
                required
              />
              <label htmlFor="terms" className="text-slate-400">
                I accept the{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300">
                  terms &amp; conditions
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                isPaidPlan ? `Create Account & Continue to Payment` : 'Create Account'
              )}
            </button>

          </form>

          <div className="mt-5 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// useSearchParams requires Suspense in Next.js App Router
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d1527] flex items-center justify-center text-slate-400">
        <span className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin mr-3" />
        Loading…
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}