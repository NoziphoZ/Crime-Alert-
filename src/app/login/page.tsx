'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] =
    useState('')
  const [rememberMe, setRememberMe] =
    useState(false)

  const handleSignIn = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    try {
      const res = await fetch(
        '/api/login',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        alert(
          data.error ||
            'Invalid email or password'
        )
        return
      }

      alert('Login successful! 🎉')

      // Redirect to citizen dashboard
      router.push(
        '/citizendashboard'
      )
    } catch (error) {
      console.error(error)
      alert('Something went wrong')
    }
  }

  const handleGitHubLogin = () => {
    signIn('github', {
      callbackUrl:
        '/citizendashboard',
    })
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-gradient-to-b from-slate-800/40 to-slate-900/40 border border-slate-700/40 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">

        {/* LEFT PANEL */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-600 to-sky-600 p-8 flex flex-col justify-center items-center text-center space-y-4">
          <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm shadow-inner text-4xl">
            🔐
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome Back
          </h2>

          <p className="text-blue-100 text-sm max-w-xs font-light leading-relaxed">
            Sign in to your Crime Alert
            account to access safety
            alerts and community
            features.
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <h3 className="text-2xl font-bold tracking-tight text-slate-100 mb-6">
            Sign In
          </h3>

          <form
            onSubmit={handleSignIn}
            className="space-y-5"
          >
            {/* EMAIL */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email Address
              </label>

              <input
                type="email"
                required
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>

              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* REMEMBER ME */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) =>
                  setRememberMe(
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border-slate-700/60 bg-slate-900/60 text-blue-600 cursor-pointer"
              />

              <label
                htmlFor="remember-me"
                className="ml-2 text-sm text-slate-400 cursor-pointer"
              >
                Remember Me
              </label>
            </div>

            {/* EMAIL LOGIN BUTTON */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
            >
              Sign In
            </button>

            {/* GITHUB LOGIN */}
            <button
              type="button"
              onClick={
                handleGitHubLogin
              }
              className="w-full border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all"
            >
              Continue with GitHub
            </button>
          </form>

          {/* REGISTER */}
          <div className="mt-6 text-center">
            <Link
              href="/register"
              className="text-xs text-slate-400 hover:text-slate-300"
            >
              Don't have an account?{' '}
              <span className="text-blue-400 hover:underline font-medium">
                Register
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}