'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setLoading(true)

    try {
      const result = await signIn(
        'credentials',
        {
          email,
          password,
          redirect: false,
        }
      )

      if (result?.error) {
        alert(
          'Invalid email or password'
        )
        setLoading(false)
        return
      }

      router.push(
        '/citizendashboard'
      )

      router.refresh()
    } catch (error) {
      console.error(
        'Login Error:',
        error
      )

      alert(
        'Something went wrong'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubLogin =
    async () => {
      await signIn('github', {
        callbackUrl:
          '/citizendashboard',
      })
    }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/40 border border-slate-700 rounded-2xl p-8">

        <h1 className="text-3xl font-bold mb-6 text-center">
          Login
        </h1>

        <form
          onSubmit={handleSignIn}
          className="space-y-4"
        >

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            required
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 p-3 rounded-lg font-semibold"
          >
            {loading
              ? 'Signing In...'
              : 'Sign In'}
          </button>

        </form>

        <button
          onClick={
            handleGitHubLogin
          }
          className="w-full mt-4 border border-slate-700 p-3 rounded-lg hover:bg-slate-800"
        >
          Continue with GitHub
        </button>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link
            href="/register"
            className="text-blue-400"
          >
            Register
          </Link>
        </p>

      </div>
    </div>
  )
}