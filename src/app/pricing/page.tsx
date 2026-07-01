'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const plans = [
  {
    id: 'trial',
    label: 'Free Trial',
    price: 'R0',
    duration: '1 month',
    durationMonths: 1,
    highlight: false,
    badge: null,
    description: 'Try everything free for 30 days. No card required.',
    features: [
      'Full access for 1 month',
      'Emergency button',
      'Crime map',
      'Incident reporting',
      'No credit card needed',
    ],
    cta: 'Start Free Trial',
    accent: 'emerald',
  },
  {
    id: '2month',
    label: 'Standard',
    price: 'R100',
    duration: '2 months',
    durationMonths: 2,
    highlight: false,
    badge: null,
    description: 'Two months of full access at an affordable rate.',
    features: [
      'Full access for 2 months',
      'Emergency button',
      'Crime map',
      'Incident reporting',
      'Priority support',
    ],
    cta: 'Get Started',
    accent: 'sky',
  },
  {
    id: '3month',
    label: 'Extended',
    price: 'R150',
    duration: '3 months',
    durationMonths: 3,
    highlight: true,
    badge: 'Best Value',
    description: 'Three months of full access — our most popular plan.',
    features: [
      'Full access for 3 months',
      'Emergency button',
      'Crime map',
      'Incident reporting',
      'Priority support',
      'Save 17% vs monthly',
    ],
    cta: 'Get Started',
    accent: 'blue',
  },
]

const accentClasses: Record<string, { ring: string; btn: string; badge: string; check: string }> = {
  emerald: {
    ring: 'border-emerald-500/40',
    btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    check: 'text-emerald-400',
  },
  sky: {
    ring: 'border-sky-500/40',
    btn: 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/40',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    check: 'text-sky-400',
  },
  blue: {
    ring: 'border-blue-500/60',
    btn: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    check: 'text-blue-400',
  },
}

export default function PricingPage() {
  const router = useRouter()

  const handleSelect = (plan: typeof plans[0]) => {
    if (plan.id === 'trial') {
      // Free trial goes straight to register; plan info carried in URL
      router.push('/register?plan=trial')
    } else {
      // Paid plans go to register first, then the registration flow
      // will redirect to payment with the selected plan
      router.push(`/register?plan=${plan.id}&price=${plan.price.replace('R', '')}&months=${plan.durationMonths}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex flex-col items-center px-5 py-16 relative overflow-hidden">

      {/* Background glow — same style as landing */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl">

        {/* Header */}
        <div className="text-center mb-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sky-400 font-black tracking-wider uppercase text-lg mb-8"
          >
            <span className="animate-pulse">🚨</span>
            CrimeAlert
          </Link>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Choose your plan
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-lg mx-auto font-light">
            Start free and upgrade when you&apos;re ready. All plans include full access to every feature.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const acc = accentClasses[plan.accent]
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col bg-[#0f192e] rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1 ${
                  plan.highlight
                    ? `${acc.ring} shadow-xl`
                    : 'border-slate-800/70'
                }`}
              >
                {/* Best value badge */}
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${acc.badge}`}>
                    {plan.badge}
                  </span>
                )}

                {/* Plan name + price */}
                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                    {plan.label}
                  </p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-slate-400 text-sm mb-1">
                      / {plan.duration}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mt-3 leading-snug">
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className={`mt-0.5 text-base leading-none ${acc.check}`}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSelect(plan)}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm text-white shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 ${acc.btn}`}
                >
                  {plan.cta}
                </button>

                {plan.id === 'trial' && (
                  <p className="text-center text-[11px] text-slate-500 mt-3">
                    No credit card required
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-500 text-sm mt-10">
          Already have an account?{' '}
          <Link href="/login" className="text-sky-400 hover:text-sky-300 font-semibold">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}