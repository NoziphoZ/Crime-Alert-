// src/app/reset-password/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate token exists
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate passwords
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center p-4">
        <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">❌ Invalid Reset Link</h1>
          <p className="text-slate-400 mb-6">This password reset link is invalid or has expired.</p>
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">🔑 Reset Password</h1>
            <p className="text-sm text-slate-400 mt-1">Enter your new password below</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
              ⚠️ {error}
            </div>
          )}

          {success ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-6 text-center">
              <p className="text-green-400 text-lg">✅ Password reset successful!</p>
              <p className="text-slate-400 text-sm mt-2">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                />
                <p className="text-[10px] text-slate-500">Password must be at least 6 characters</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Resetting Password…
                  </>
                ) : (
                  'Reset Password'
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