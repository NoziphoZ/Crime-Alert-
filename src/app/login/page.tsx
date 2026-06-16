'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        alert(data.error || 'Invalid email or password')
        setLoading(false)
        return
      }

      // 🔥 IMPORTANT: small delay ensures route is ready
      setTimeout(() => {
        router.replace('/citizendashboard')
      }, 100)

    } catch (error) {
      console.error(error)
      alert('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubLogin = () => {
    signIn('github', {
      callbackUrl: '/citizendashboard',
    })
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center p-4">

      <div className="w-full max-w-md bg-slate-900/40 border border-slate-700 p-8 rounded-2xl">

        <h1 className="text-2xl font-bold mb-6">Login</h1>

        <form onSubmit={handleSignIn} className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700"
          />

          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 p-3 rounded font-semibold"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>

        </form>

        <button
          onClick={handleGitHubLogin}
          className="w-full mt-4 border border-slate-700 p-3 rounded"
        >
          Continue with GitHub
        </button>

        <p className="text-sm text-center mt-4 text-slate-400">
          No account? <Link href="/register" className="text-blue-400">Register</Link>
        </p>

      </div>

    </div>
  )
}