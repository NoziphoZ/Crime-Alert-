'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [role, setRole] = useState('')

  const roles = [
    { label: 'Citizen', value: 'citizen' },
    { label: 'Law Enforcement', value: 'law_enforcement' }
  ]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!role) {
      alert('Please select a role!')
      return
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Registration failed')
        return
      }

      alert('Account created successfully! 🎉')

      // optional reset
      setFirstName('')
      setLastName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setRole('')
      setAcceptTerms(false)

      // Redirect to login page
      router.push('/login')

    } catch (error) {
      console.error(error)
      alert('Something went wrong')
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center p-4">

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-slate-900/40 border border-slate-700 rounded-3xl overflow-hidden">

        {/* LEFT */}
        <div className="md:col-span-5 bg-blue-600 p-8 flex flex-col justify-center items-center text-center">
          <h2 className="text-3xl font-bold">Join CrimeAlert</h2>
          <p className="text-blue-100 mt-2">
            Create your account to continue
          </p>
        </div>

        {/* RIGHT */}
        <div className="md:col-span-7 p-8">

          <h3 className="text-2xl font-bold mb-6">
            Create Account
          </h3>

          <form
            onSubmit={handleRegister}
            className="space-y-4"
          >

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) =>
                  setFirstName(e.target.value)
                }
                className="input"
                required
              />

              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) =>
                  setLastName(e.target.value)
                }
                className="input"
                required
              />
            </div>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="input"
              required
            />

            {/* ROLE */}
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value)
              }
              className="input"
              required
            >
              <option value="">
                Select Role
              </option>

              {roles.map((r) => (
                <option
                  key={r.value}
                  value={r.value}
                >
                  {r.label}
                </option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="input"
              required
            />

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              className="input"
              required
            />

            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) =>
                  setAcceptTerms(
                    e.target.checked
                  )
                }
                required
              />

              <label>
                I accept terms & conditions
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 py-3 rounded-xl font-semibold"
            >
              Create Account
            </button>

          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-blue-400"
            >
              Login
            </Link>
          </div>

        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 10px;
          border-radius: 10px;
          background: #0f172a;
          border: 1px solid #334155;
          color: white;
        }
      `}</style>

    </div>
  )
}