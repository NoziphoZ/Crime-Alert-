'use client'

import React from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex flex-col justify-center items-center px-6 relative overflow-hidden">

      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">

        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">

          <div className="flex items-center justify-center lg:justify-start gap-3">
            <span className="text-3xl animate-pulse">🚨</span>
            <span className="text-2xl font-black tracking-wider text-sky-400 uppercase">
              CrimeAlert
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none">
            Protect Your <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Community
            </span>{' '}
            with <br />
            Smart Crime <br className="hidden sm:inline" />
            Prevention
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
            Join the revolution in community safety. Real-time crime reporting,
            instant emergency response, and threat detection — all in your pocket.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
            {/* ← only change: /register → /pricing */}
            <Link
              href="/pricing"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center"
            >
              Get Started
            </Link>

            <Link
              href="/login"
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-semibold px-8 py-4 rounded-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center backdrop-blur-sm"
            >
              Sign In to Account
            </Link>
          </div>

        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4 transform hover:scale-[1.01] transition-transform">

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-4">
              <span className="text-xl p-2 bg-red-500/10 text-red-400 rounded-xl">🚨</span>
              <div>
                <h3 className="font-semibold text-sm text-slate-200">Emergency Alert</h3>
                <p className="text-xs text-slate-400 mt-0.5">One-tap emergency response dispatcher activation.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-4">
              <span className="text-xl p-2 bg-sky-500/10 text-sky-400 rounded-xl">🗺️</span>
              <div>
                <h3 className="font-semibold text-sm text-slate-200">Live Crime Map</h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-time incident tracking maps and safety zones.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-4">
              <span className="text-xl p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">📝</span>
              <div>
                <h3 className="font-semibold text-sm text-slate-200">Quick Report</h3>
                <p className="text-xs text-slate-400 mt-0.5">Anonymous local reporting network systems.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}