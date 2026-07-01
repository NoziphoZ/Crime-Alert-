'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()

  const plan = searchParams.get('plan') || 'Premium'
  const isTrial = searchParams.get('trial') === 'true'

  const [fullName, setFullName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [securityCode, setSecurityCode] = useState('')
  const [taxId, setTaxId] = useState('')
  const [termsChecked, setTermsChecked] = useState(false)

  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)

  /* ── Auth + existing-subscription guard ── */
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      const checkExisting = async () => {
        try {
          const res = await fetch('/api/payment')
          const data = await res.json()
          if (data.alreadySubscribed) {
            router.push('/citizendashboard?message=already_subscribed')
            return
          }
        } catch {
          // fail open — let them attempt payment, the POST route re-checks anyway
        } finally {
          setCheckingAccess(false)
        }
      }
      checkExisting()
    }
  }, [status, router])

  /* ── Formatting handlers ── */
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '')
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits
    if (digits.length <= 16) setCardNumber(formatted)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length >= 2) {
      value = value.substring(0, 2) + ' / ' + value.substring(2, 4)
    }
    setExpiry(value)
  }

  const handleSecurityCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSecurityCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 4))
  }

  const handleTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, '')
    setTaxId(digits ? `South African VAT number    ${digits}` : '')
  }

  const markInvalid = (field: string, isInvalid: boolean) => {
    setInvalidFields((prev) => ({ ...prev, [field]: isInvalid }))
  }

  /* ── Submit ── */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!termsChecked) {
        setError('You must agree to the terms before proceeding.')
        return
      }

      if (!isTrial) {
        const fields: Record<string, string> = {
          fullName,
          cardNumber,
          expiry,
          securityCode,
        }
        let allValid = true
        const nextInvalid: Record<string, boolean> = {}
        for (const [key, val] of Object.entries(fields)) {
          if (!val.trim()) {
            nextInvalid[key] = true
            allValid = false
          }
        }
        setInvalidFields(nextInvalid)
        if (!allValid) {
          setError('Please fill in all required fields.')
          return
        }
      }

      setSubmitting(true)
      try {
        const res = await fetch('/api/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan,
            isTrial,
            fullName,
            taxId: taxId || null,
            // Note: in production, card details should go to a payment
            // processor (Stripe etc.) directly from the client, never to
            // your own API/DB. Sent here only to mirror legacy behavior.
          }),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Payment failed. Please try again.')
        }

        const message = isTrial ? 'trial_started' : 'payment_success'
        router.push(`/citizendashboard?message=${message}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      } finally {
        setSubmitting(false)
      }
    },
    [termsChecked, isTrial, fullName, cardNumber, expiry, securityCode, taxId, plan, router]
  )

  const handleStartTrial = () => {
    router.push('/payment?plan=Premium&trial=true')
  }

  if (status === 'loading' || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-[#e2e8f0]">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex justify-center px-5 py-10 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-[#e2e8f0]">
      <div className="w-full max-w-[640px] my-10">
        <div className="bg-[#0f172a]/95 backdrop-blur-xl rounded-[20px] p-8 sm:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-[#3b82f6]/10">
          <h1 className="text-2xl sm:text-[32px] font-bold text-white mb-9 text-center">
            Payment Method
          </h1>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isTrial && (
              <div
                className="rounded-xl mb-6 p-5 text-center"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <h3 className="text-white font-semibold mb-2.5">🎉 Start with 1 Month Free!</h3>
                <p className="text-white text-sm mb-4">
                  Experience all premium features for 1 month. No payment required upfront.
                </p>
                <button
                  type="button"
                  onClick={handleStartTrial}
                  className="bg-white text-[#059669] border-none px-6 py-3 rounded-lg font-bold cursor-pointer hover:bg-slate-100 hover:-translate-y-0.5 transition-all"
                >
                  Start Free Trial
                </button>
              </div>
            )}

            <div className="mb-7">
              <label className="block text-[#e2e8f0] mb-2.5 text-base font-medium" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => markInvalid('fullName', !fullName.trim())}
                placeholder="Thuledu"
                className={`w-full px-5 py-4 rounded-xl text-white text-base bg-[#1e293b]/80 border transition-all outline-none placeholder:text-slate-500 focus:border-[#3b82f6] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] ${
                  invalidFields.fullName ? 'border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]' : 'border-slate-700/80'
                }`}
              />
            </div>

            {!isTrial && (
              <>
                <div className="mb-7">
                  <label className="block text-[#e2e8f0] mb-2.5 text-base font-medium" htmlFor="cardNumber">
                    Card number
                  </label>
                  <div className="relative">
                    <input
                      id="cardNumber"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      onBlur={() => markInvalid('cardNumber', !cardNumber.trim())}
                      maxLength={19}
                      className={`w-full px-5 py-4 rounded-xl text-white text-base bg-[#1e293b]/80 border transition-all outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] ${
                        invalidFields.cardNumber ? 'border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]' : 'border-slate-700/80'
                      }`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1.5">
                      <span className="text-[10px] font-bold text-white bg-[#3b82f6] rounded px-1.5 py-0.5">VISA</span>
                      <span className="text-[10px] font-bold text-white bg-[#eb001b] rounded px-1.5 py-0.5">MC</span>
                      <span className="text-[10px] font-bold text-white bg-[#006fcf] rounded px-1.5 py-0.5">AMEX</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-7">
                  <div>
                    <label className="block text-[#e2e8f0] mb-2.5 text-base font-medium" htmlFor="expiry">
                      Expiration date
                    </label>
                    <input
                      id="expiry"
                      value={expiry}
                      onChange={handleExpiryChange}
                      onBlur={() => markInvalid('expiry', !expiry.trim())}
                      maxLength={7}
                      placeholder="MM / YY"
                      className={`w-full px-5 py-4 rounded-xl text-white text-base bg-[#1e293b]/80 border transition-all outline-none placeholder:text-slate-500 focus:border-[#3b82f6] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] ${
                        invalidFields.expiry ? 'border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]' : 'border-slate-700/80'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[#e2e8f0] mb-2.5 text-base font-medium" htmlFor="securityCode">
                      Security code
                    </label>
                    <div className="relative">
                      <input
                        id="securityCode"
                        value={securityCode}
                        onChange={handleSecurityCodeChange}
                        onBlur={() => markInvalid('securityCode', !securityCode.trim())}
                        maxLength={4}
                        className={`w-full px-5 py-4 rounded-xl text-white text-base bg-[#1e293b]/80 border transition-all outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] ${
                          invalidFields.securityCode ? 'border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]' : 'border-slate-700/80'
                        }`}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-500 bg-slate-700/80 px-2 py-1 rounded-md">
                        123
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-7">
                  <label className="block text-[#e2e8f0] mb-2.5 text-base font-medium" htmlFor="taxId">
                    Business tax ID (Optional)
                  </label>
                  <p className="text-sm text-slate-400 mb-1.5 leading-snug">
                    If you provide a tax ID, the &quot;Full name&quot; above should be your business&apos;s name.
                  </p>
                  <input
                    id="taxId"
                    value={taxId}
                    onChange={handleTaxIdChange}
                    className="w-full px-5 py-4 rounded-xl text-white text-base bg-[#1e293b]/80 border border-slate-700/80 transition-all outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                  />
                </div>
              </>
            )}

            <div className="flex items-start gap-4 my-8">
              <input
                type="checkbox"
                id="terms"
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-[#3b82f6] cursor-pointer"
              />
              <label htmlFor="terms" className="text-[15px] text-[#e2e8f0] leading-relaxed">
                You agree that CrimeAlert will charge your card in the amount above now and on a
                recurring annual basis until you cancel in accordance with our{' '}
                <a href="#" target="_blank" className="text-[#3b82f6] hover:text-[#60a5fa] hover:underline">
                  terms
                </a>
                . You can cancel at any time in your account settings.
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !termsChecked}
              className="w-full py-[18px] px-8 rounded-xl text-white font-semibold text-base mt-3 transition-all disabled:cursor-not-allowed disabled:bg-slate-600/80 disabled:shadow-none flex items-center justify-center gap-2.5 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(59,130,246,0.4)]"
              style={
                submitting || !termsChecked
                  ? undefined
                  : { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }
              }
            >
              {submitting && (
                <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isTrial ? 'Start 1-Month Free Trial' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}