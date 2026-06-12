'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false)

  // ROLE STATE
  const [role, setRole] = useState<string>('')

  const roles = [
    'Citizen',
    'Law Enforcement'
  ]

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()

    if (!role) {
      alert("Please select a role!")
      return
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!")
      return
    }

    alert(
      `Account registration submitted for: ${firstName} ${lastName} (${email}) as ${role}`
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center p-4 sm:p-6">

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-gradient-to-b from-slate-800/40 to-slate-900/40 border border-slate-700/40 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">

        {/* LEFT PANEL */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-600 to-sky-600 p-8 flex flex-col justify-center items-center text-center space-y-4">
          <div className="bg-white/10 p-4 rounded-full text-4xl animate-pulse">
            🛡️
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Join CrimeAlert
          </h2>

          <p className="text-blue-100 text-sm max-w-xs">
            Create your profile to start monitoring safety alerts and community updates.
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">

          <h3 className="text-2xl font-bold mb-6">
            Create Account
          </h3>

          <form onSubmit={handleRegister} className="space-y-4">

            {/* NAME */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5"
              />

              <input
                type="text"
                required
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5"
              />
            </div>

            {/* EMAIL */}
            <input
              type="email"
              required
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5"
            />

            {/* ROLE SELECT FIXED */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Select Role
              </label>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-slate-200"
              >
                <option value="" disabled>
                  -- Choose your role --
                </option>

                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* PASSWORD */}
            <input
              type="password"
              required
              placeholder="Create Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5"
            />

            {/* CONFIRM PASSWORD */}
            <input
              type="password"
              required
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5"
            />

            {/* TERMS */}
            <div className="flex items-start pt-1">
              <input
                type="checkbox"
                required
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="h-4 w-4 mt-0.5"
              />

              <label className="ml-2 text-xs text-slate-400">
                I accept the CrimeAlert Terms and Conditions
              </label>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold"
            >
              Create My Account
            </button>
          </form>

          {/* LOGIN LINK (ADDED) */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?
            </p>

            <Link
              href="/login"
              className="text-blue-400 hover:underline font-medium text-sm"
            >
              Sign in here
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}