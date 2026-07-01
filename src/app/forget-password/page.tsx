// src/app/forgot-password/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    try {
      // UPDATED: Changed from /api/auth/forgot-password to /api/forgot-password
      const response = await fetch('/api/forget-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">🔐 Forgot Password</h1>
            <p className="text-sm text-slate-400 mt-1">
              Enter your email to receive a reset link
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
              ⚠️ {error}
            </div>
          )}

          {success ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-6 text-center">
              <p className="text-green-400 text-lg">✅ Reset link sent!</p>
              <p className="text-slate-400 text-sm mt-2">
                Check your email for a password reset link.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                    Sending Reset Link…
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          <div className="text-center mt-4">
            <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}