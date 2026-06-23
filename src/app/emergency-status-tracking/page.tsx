'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

type EmergencyStatus =
  | 'Received'
  | 'Location Verified'
  | 'Unit Dispatched'
  | 'Unit Arrived'
  | 'Case Resolved'
  | 'Cancelled'

interface HistoryItem {
  new_status: string
  citizen_message: string
  updated_at: string
  updated_by: string
}

interface EmergencyAlert {
  id: string
  user_id: string
  status: EmergencyStatus
  created_at: string
  updated_at: string
  is_active: boolean
  latitude: number | null
  longitude: number | null
  location: string | null
  priority: string | null
  location_source: string | null
}

/* ─────────────────────────────────────────────
   Status config
───────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  string,
  { step: number; progress: number; icon: string; title: string; message: string }
> = {
  Received: {
    step: 1,
    progress: 20,
    icon: '📨',
    title: 'Case Received',
    message:
      'Please stay calm. We have received your emergency report and are processing your location.',
  },
  'Location Verified': {
    step: 2,
    progress: 40,
    icon: '📍',
    title: 'Location Verified',
    message:
      'Your location has been confirmed. Emergency responders are being dispatched.',
  },
  'Unit Dispatched': {
    step: 3,
    progress: 60,
    icon: '🚗',
    title: 'Unit Dispatched',
    message:
      'Help is on the way. Please remain at your current location and stay calm.',
  },
  'Unit Arrived': {
    step: 4,
    progress: 80,
    icon: '🎯',
    title: 'Unit Arrived',
    message:
      'Emergency responders have arrived at your location. Please cooperate with officers.',
  },
  'Case Resolved': {
    step: 5,
    progress: 100,
    icon: '✅',
    title: 'Case Resolved',
    message:
      'Your emergency has been successfully handled. Thank you for using CrimeAlert.',
  },
  Cancelled: {
    step: 0,
    progress: 0,
    icon: '❌',
    title: 'Cancelled',
    message:
      'Your emergency request has been cancelled. Emergency services have been notified.',
  },
}

const STATUS_STEPS = [
  { key: 'Received',          label: 'Case Received',    description: 'Emergency reported and logged' },
  { key: 'Location Verified', label: 'Location Verified', description: 'Your location confirmed' },
  { key: 'Unit Dispatched',   label: 'Unit Dispatched',   description: 'Help is on the way' },
  { key: 'Unit Arrived',      label: 'Unit Arrived',      description: 'Responders on scene' },
  { key: 'Case Resolved',     label: 'Case Resolved',     description: 'Emergency handled' },
]

function getStatusIcon(status: string) {
  const icons: Record<string, string> = {
    received:           '📨',
    new:                '📨',
    'location verified':'📍',
    'unit dispatched':  '🚗',
    'unit arrived':     '🎯',
    'case resolved':    '✅',
    cancelled:          '❌',
  }
  return icons[status?.toLowerCase()] ?? '📨'
}

function normaliseStatus(raw: string | null): EmergencyStatus {
  if (!raw || raw.toLowerCase() === 'new') return 'Received'
  return raw as EmergencyStatus
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ─────────────────────────────────────────────
   Inline SVG icons (no extra deps)
───────────────────────────────────────────── */

const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.49 9a9 9 0 0 0-15.07-2.4L1 10M23 14l-4.42 3.6A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
    <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
  </svg>
)

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-5 h-5">
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" strokeLinejoin="round" />
    <path d="M9 12.2l2 2 4-4.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconMapPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0Z" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

/* ─────────────────────────────────────────────
   Cancel confirmation modal
───────────────────────────────────────────── */

function CancelModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f192e] border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-white">Cancel Emergency?</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white">
            <IconX />
          </button>
        </div>
        <p className="text-slate-300 text-sm mb-4">
          Your emergency is still active. Are you sure you want to cancel? Emergency services will be notified.
        </p>
        <ul className="text-sm text-slate-400 space-y-2 mb-6">
          <li>📋 Your emergency is still active</li>
          <li>🔄 This action cannot be undone</li>
          <li>🏠 You will be redirected to the dashboard</li>
        </ul>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Stay Here
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
          >
            {loading ? 'Cancelling…' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Toast
───────────────────────────────────────────── */

function Toast({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  const colours = {
    success: 'bg-emerald-700 border-emerald-500',
    error:   'bg-red-700 border-red-500',
    info:    'bg-blue-700 border-blue-500',
  }
  return (
    <div className={`fixed top-20 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-white text-sm font-medium shadow-xl ${colours[type]}`}>
      {message}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */

export default function EmergencyStatusTracking() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [alert, setAlert]               = useState<EmergencyAlert | null>(null)
  const [history, setHistory]           = useState<HistoryItem[]>([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [cancelling, setCancelling]     = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [toast, setToast]               = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [countdown, setCountdown]       = useState(30)

  /* ── helpers ── */

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  /* ── load history from emergency_status_history (optional table) ── */

  const loadHistory = useCallback(async (alertId: string) => {
    const { data } = await supabase
      .from('emergency_status_history')
      .select('new_status, citizen_message, updated_at, updated_by')
      .eq('emergency_alert_id', alertId)          // FK pointing to emergency_alerts.id
      .order('updated_at', { ascending: false })

    setHistory(data ?? [])
  }, [])

  /* ── load main emergency_alerts row ── */

  const loadAlert = useCallback(async () => {
    if (!session?.user) return
    const userId = (session.user as any)?.id
    if (!userId) return

    const { data, error } = await supabase
      .from('emergency_alerts')
      .select('id, user_id, status, created_at, updated_at, is_active, latitude, longitude, location, priority, location_source')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      // No emergency found — go back to dashboard
      router.push('/citizendashboard')
      return
    }

    let normStatus = normaliseStatus(data.status)

    // Persist Received if it was null/New
    if (!data.status || data.status.toLowerCase() === 'new') {
      await supabase
        .from('emergency_alerts')
        .update({ status: 'Received' })
        .eq('id', data.id)
    }

    // If row is deactivated but not yet marked resolved/cancelled
    if (!data.is_active && normStatus !== 'Case Resolved' && normStatus !== 'Cancelled') {
      normStatus = 'Cancelled'
    }

    setAlert({ ...data, status: normStatus })
    await loadHistory(data.id)
    setLoading(false)
  }, [session, router, loadHistory])

  /* ── refresh (poll) ── */

  const refreshStatus = useCallback(async () => {
    if (!alert) return
    setRefreshing(true)

    const { data } = await supabase
      .from('emergency_alerts')
      .select('status, is_active, updated_at')
      .eq('id', alert.id)
      .single()

    if (data) {
      let newStatus = normaliseStatus(data.status)
      if (!data.is_active && newStatus !== 'Case Resolved' && newStatus !== 'Cancelled') {
        newStatus = 'Cancelled'
      }

      if (newStatus !== alert.status) {
        setAlert((prev) => prev ? { ...prev, status: newStatus, updated_at: data.updated_at } : prev)
        showToast(`Status updated: ${STATUS_CONFIG[newStatus]?.title ?? newStatus}`, 'success')
      }

      await loadHistory(alert.id)
    }

    setRefreshing(false)
    setCountdown(30)
  }, [alert, loadHistory])

  /* ── cancel ── */

  const handleCancel = async () => {
    if (!alert) return

    if (alert.status === 'Case Resolved') {
      showToast('This emergency has already been resolved and cannot be cancelled.', 'info')
      setShowCancelModal(false)
      return
    }

    setCancelling(true)
    const userId = (session?.user as any)?.id

    const { error } = await supabase
      .from('emergency_alerts')
      .update({ is_active: false, status: 'Cancelled', updated_at: new Date().toISOString() })
      .eq('id', alert.id)

    if (error) {
      showToast('Failed to cancel emergency. Please try again.', 'error')
      setCancelling(false)
      return
    }

    // Insert history entry (graceful — if table doesn't exist yet, skip)
    await supabase.from('emergency_status_history').insert({
      emergency_alert_id: alert.id,
      user_id:            userId,
      old_status:         alert.status,
      new_status:         'Cancelled',
      citizen_message:    'Emergency request cancelled by citizen.',
      updated_by:         'Citizen',
      updated_at:         new Date().toISOString(),
      is_viewed:          false,
    })

    setAlert((prev) => prev ? { ...prev, status: 'Cancelled', is_active: false } : prev)
    setShowCancelModal(false)
    setCancelling(false)
    showToast('Emergency cancelled. Services have been notified.', 'success')
    setTimeout(() => router.push('/citizendashboard'), 2500)
  }

  /* ── effects ── */

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (session) loadAlert()
  }, [session, loadAlert])

  // Auto-refresh countdown
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { refreshStatus(); return 30 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [refreshStatus])

  /* ── derived ── */

  const config      = alert ? (STATUS_CONFIG[alert.status] ?? STATUS_CONFIG.Received) : STATUS_CONFIG.Received
  const isCancelled = alert?.status === 'Cancelled'
  const isResolved  = alert?.status === 'Case Resolved'

  /* ── loading ── */

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0d1527] flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          Loading emergency data…
        </div>
      </div>
    )
  }

  /* ── render ── */

  return (
    <div className="min-h-screen bg-[#0d1527] text-white">

      {toast && <Toast message={toast.message} type={toast.type} />}

      {showCancelModal && (
        <CancelModal
          onConfirm={handleCancel}
          onCancel={() => setShowCancelModal(false)}
          loading={cancelling}
        />
      )}

      {/* Header */}
      <header className="bg-[#0a0f1d] border-b border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-sky-400"><IconShield /></span>
          <h1 className="text-sky-400 text-xl font-bold tracking-tight">CrimeAlert</h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 text-slate-300 text-sm px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Refreshing in {countdown}s
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Title banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-sky-600 p-6 rounded-2xl">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <h2 className="text-2xl font-bold relative">Emergency Status Tracking</h2>
          <p className="text-sky-100/90 text-sm mt-1 relative">
            Track your emergency response in real-time.
          </p>
        </div>

        {/* Emergency info card */}
        <div className="bg-[#0f192e] border border-slate-800/80 rounded-2xl p-6">
          <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Emergency ID</p>
              <p className="text-sky-400 text-xl font-bold font-mono">
                #{alert?.id?.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Reported</p>
              <p className="text-slate-300 text-sm font-medium">
                {alert ? formatDate(alert.created_at) : '—'}
              </p>
            </div>
          </div>

          {/* Location + priority meta */}
          <div className="flex flex-wrap gap-3 mb-5">
            {alert?.location && (
              <div className="flex items-center gap-1.5 bg-slate-800/60 text-slate-300 text-xs px-3 py-1.5 rounded-lg">
                <IconMapPin />
                {alert.location}
              </div>
            )}
            {alert?.priority && (
              <div className={`text-xs px-3 py-1.5 rounded-lg font-semibold border
                ${alert.priority.toLowerCase() === 'high'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : alert.priority.toLowerCase() === 'medium'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                {alert.priority} Priority
              </div>
            )}
          </div>

          {/* Current status banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{config.icon}</span>
              <h3 className="text-lg font-bold text-slate-100">{config.title}</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed pl-10">{config.message}</p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="bg-[#0f192e] border border-slate-800/80 rounded-2xl p-6">
          <h3 className="text-sky-400 font-bold text-lg mb-6 text-center">Response Progress</h3>

          {isCancelled ? (
            <div className="text-center py-4">
              <span className="text-4xl">❌</span>
              <p className="text-slate-400 mt-3 text-sm">This emergency has been cancelled.</p>
            </div>
          ) : (
            <>
              {/* Bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full mb-8 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-1000"
                  style={{ width: `${config.progress}%` }}
                />
              </div>

              {/* Steps */}
              <div className="flex justify-between gap-1">
                {STATUS_STEPS.map((s, i) => {
                  const stepNum    = i + 1
                  const currentStep = config.step
                  const isCompleted = stepNum < currentStep
                  const isCurrent   = stepNum === currentStep

                  return (
                    <div key={s.key} className="flex flex-col items-center text-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2 border-2 transition-all duration-500
                        ${isCompleted
                          ? 'bg-gradient-to-br from-blue-600 to-sky-500 border-sky-400 text-white shadow-lg shadow-blue-900/40'
                          : isCurrent
                          ? 'bg-gradient-to-br from-amber-500 to-yellow-400 border-yellow-300 text-white animate-pulse'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}>
                        {isCompleted ? '✓' : stepNum}
                      </div>
                      <p className={`text-xs font-semibold mb-0.5 ${isCompleted ? 'text-sky-400' : isCurrent ? 'text-amber-400' : 'text-slate-500'}`}>
                        {s.label}
                      </p>
                      <p className="text-[11px] text-slate-600 hidden sm:block max-w-[80px]">
                        {s.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Status history */}
        <div className="bg-[#0f192e] border border-slate-800/80 rounded-2xl p-6">
          <h3 className="text-sky-400 font-bold text-lg mb-5">📋 Status History</h3>

          <div className="relative pl-8 space-y-4">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-800" />

            {/* Always show the initial / current row */}
            {history.length === 0 ? (
              <div className="relative bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 border-l-4 border-l-blue-500">
                <div className="absolute -left-[26px] top-4 w-3 h-3 rounded-full bg-blue-500 ring-2 ring-[#0f192e]" />
                <p className="text-xs text-slate-500 mb-1">{formatDate(alert?.created_at ?? '')}</p>
                <p className="text-slate-200 font-semibold">
                  {getStatusIcon(alert?.status ?? '')} {alert?.status}
                </p>
                <p className="text-slate-400 text-sm mt-1">{config.message}</p>
              </div>
            ) : (
              history.map((item, idx) => (
                <div key={idx} className="relative bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 border-l-4 border-l-blue-500">
                  <div className="absolute -left-[26px] top-4 w-3 h-3 rounded-full bg-blue-500 ring-2 ring-[#0f192e]" />
                  <p className="text-xs text-slate-500 mb-1">{formatDate(item.updated_at)}</p>
                  <p className="text-slate-200 font-semibold">
                    {getStatusIcon(item.new_status)} {item.new_status}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">{item.citizen_message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Emergency contacts */}
        <div className="bg-gradient-to-r from-red-950 to-rose-950 border border-red-800/60 rounded-2xl p-5 text-center">
          <h3 className="text-red-200 font-semibold mb-4">🚨 Need Immediate Help?</h3>
          <div className="flex justify-center flex-wrap gap-8">
            {[
              { number: '10111',        label: 'Police'     },
              { number: '10177',        label: 'Medical'    },
              { number: '080-033-3177', label: 'Crime Stop' },
            ].map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-red-100">{c.number}</span>
                <span className="text-xs text-red-300 font-medium">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="bg-[#0f192e] border border-slate-800/80 rounded-2xl p-5">
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={refreshStatus}
              disabled={refreshing}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-900/40 transition-all"
            >
              <span className={refreshing ? 'animate-spin' : ''}><IconRefresh /></span>
              {refreshing ? 'Refreshing…' : 'Refresh Status'}
            </button>

            <button
              onClick={() => router.push('/citizendashboard')}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <IconHome />
              Back to Dashboard
            </button>

            {!isResolved && !isCancelled && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-red-950/40 ring-1 ring-red-500/30 transition-all"
              >
                <IconX />
                Cancel Emergency
              </button>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}