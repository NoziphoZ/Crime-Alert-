'use client'

import React, { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ActivityItem {
  id: string
  type: string
  status: string
  time: string
}

/* ---------- Small inline icons (no extra dependencies) ---------- */

const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-5 h-5 shrink-0">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

const IconSiren = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-5 h-5 shrink-0">
    <path d="M12 2v2.2" strokeLinecap="round" />
    <path d="M5 21h14l-1-7a6 6 0 0 0-12 0l-1 7Z" strokeLinejoin="round" />
    <path d="M3 21h18" strokeLinecap="round" />
    <path d="M9 14h6" strokeLinecap="round" />
  </svg>
)

const IconDocument = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-5 h-5 shrink-0">
    <path d="M7 3h7l5 5v13H7z" strokeLinejoin="round" />
    <path d="M14 3v5h5" strokeLinejoin="round" />
    <path d="M9.5 13h5M9.5 16.5h5" strokeLinecap="round" />
  </svg>
)

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-5 h-5 shrink-0">
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c1.2-4 4.2-6 7-6s5.8 2 7 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconMap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-5 h-5 shrink-0">
    <path d="M9 3 4 5v16l5-2 6 2 5-2V3l-5 2-6-2Z" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M9 3v16M15 5v16" strokeLinecap="round" />
  </svg>
)

const IconShieldCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-5 h-5 shrink-0">
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" strokeLinejoin="round" />
    <path d="M9 12.2l2 2 4-4.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-5 h-5 shrink-0">
    <rect x="6" y="4" width="12" height="17" rx="1.5" />
    <rect x="9" y="2.3" width="6" height="3.2" rx="1" />
    <path d="M9 11h6M9 15h6" strokeLinecap="round" />
  </svg>
)

const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-5 h-5 shrink-0">
    <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" strokeLinejoin="round" />
    <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
  </svg>
)

const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-4 h-4 shrink-0">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconChevron = ({ direction }: { direction: 'left' | 'right' | 'up' | 'down' }) => {
  const rotation = { left: '0', right: '180', up: '90', down: '-90' }[direction]
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="w-4 h-4"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ---------- Helpers ---------- */

function statusBadgeClasses(status: string) {
  const s = (status || '').toLowerCase()
  if (s.includes('resolved') || s.includes('closed')) {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }
  if (s.includes('progress') || s.includes('review') || s.includes('investigat')) {
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  }
  if (s.includes('pending') || s.includes('open') || s.includes('submitted')) {
    return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
  }
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
}

function statusDotClasses(status: string) {
  const s = (status || '').toLowerCase()
  if (s.includes('resolved') || s.includes('closed')) return 'bg-emerald-400'
  if (s.includes('progress') || s.includes('review') || s.includes('investigat')) return 'bg-amber-400'
  if (s.includes('pending') || s.includes('open') || s.includes('submitted')) return 'bg-sky-400'
  return 'bg-slate-400'
}

export default function CitizenDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(false)

  const [isActivityExpanded, setIsActivityExpanded] =
    useState(true)

  const [activities, setActivities] = useState<ActivityItem[]>([])

  const [userName, setUserName] = useState('')

  const [totalReports, setTotalReports] = useState(0)

  const displayName = userName.trim() || session?.user?.name || 'Citizen'
  const avatarInitial = displayName.charAt(0).toUpperCase()

  // Protect page
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const loadDashboard = async () => {
      if (!session?.user) return

      const userId = (session.user as any)?.id

      if (!userId) {
        console.log('User ID missing from session')
        return
      }

      // USERS TABLE
      const { data: user } = await supabase
        .from('users')
        .select('first_name,last_name')
        .eq('id', userId)
        .single()

      if (user) {
        setUserName(
          `${user.first_name} ${user.last_name}`
        )
      }

      // CRIME REPORTS TABLE
      const { data: reports } = await supabase
        .from('crime_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {
          ascending: false,
        })

      if (reports) {
        setTotalReports(reports.length)

        setActivities(
          reports.map((report) => ({
            id: report.id,
            type: report.type_of_incident,
            status: report.status,
            time: new Date(
              report.created_at
            ).toLocaleDateString(),
          }))
        )
      }
    }

    loadDashboard()
  }, [session])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0d1527] flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          <span className="text-sm font-medium tracking-wide">Loading your dashboard…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex">

      {/* SIDEBAR */}
      <aside
        className={`${
          isSidebarCollapsed
            ? 'w-20'
            : 'w-64'
        } bg-[#0a0f1d] border-r border-slate-800/60 px-3 py-5 transition-all duration-300 flex flex-col shrink-0`}
      >
        {/* Brand lockup */}
        <div className={`flex items-center gap-2.5 px-2 mb-7 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            <IconShieldCheck />
          </span>
          {!isSidebarCollapsed && (
            <span className="text-[15px] font-bold tracking-tight text-white">CrimeAlert</span>
          )}
        </div>

        <button
          onClick={() =>
            setIsSidebarCollapsed(
              !isSidebarCollapsed
            )
          }
          className="w-full flex items-center justify-center gap-2 bg-slate-800/40 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 p-2 rounded-lg mb-6 transition-colors border border-slate-800/60"
        >
          <IconChevron direction={isSidebarCollapsed ? 'right' : 'left'} />
        </button>

        {!isSidebarCollapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Overview
          </p>
        )}

        <nav className="space-y-1">

          <button className="w-full flex items-center gap-3 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors">
            <IconGrid />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() =>
              router.push('/citizenreportform')
            }
            className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800/50 hover:text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <IconDocument />
            {!isSidebarCollapsed && <span>Report Incident</span>}
          </button>

          <button onClick={() =>
              router.push('/emergency-status-tracking')
            }
          className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800/50 hover:text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <IconUser />
            {!isSidebarCollapsed && <span>Emergency Status</span>}
          </button>

          <button onClick={() =>
              router.push('/crimemap')
            }
          className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800/50 hover:text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <IconMap />
            {!isSidebarCollapsed && <span>Crime Map</span>}
          </button>

          {!isSidebarCollapsed && (
            <p className="px-3 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Safety
            </p>
          )}
          {isSidebarCollapsed && <div className="pt-3" />}

          <button
            onClick={() =>
              router.push('/emergencybutton')
            }
            className="group relative w-full flex items-center gap-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 px-3 py-3 rounded-lg font-semibold text-sm shadow-lg shadow-red-950/40 ring-1 ring-red-400/30 transition-all"
          >
            <span className="relative flex shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping" />
              <span className="relative inline-flex">
                <IconSiren />
              </span>
            </span>
            {!isSidebarCollapsed && (
              <span className="flex flex-col items-start leading-tight">
                <span>Emergency Button</span>
                <span className="text-[11px] font-normal text-red-100/80">
                  Tap for immediate help
                </span>
              </span>
            )}
          </button>
        </nav>

        {/* PROFILE / SIGN OUT */}
        <div className="mt-auto pt-4 border-t border-slate-800/60">
          <div className={`flex items-center gap-3 px-2 py-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-sm font-bold shrink-0 ring-2 ring-slate-800/80">
              {avatarInitial}
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{displayName}</p>
                <p className="text-[10px] font-semibold tracking-[0.1em] text-sky-400/80 uppercase">
                  Citizen
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800/60 px-3 py-2.5 rounded-lg transition-colors"
          >
            <IconLogout />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0">

        <header className="bg-[#0a0f1d]/80 backdrop-blur-sm border-b border-slate-800/60 px-7 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Citizen Portal
            </p>
            <h1 className="text-white text-lg font-bold tracking-tight -mt-0.5">
              Dashboard
            </h1>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            System Online
          </span>
        </header>

        <main className="p-7 space-y-7 max-w-6xl">

          {/* Welcome */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 p-7 rounded-2xl">
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute right-10 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <p className="relative text-sky-100/80 text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5">
              Welcome back
            </p>
            <h2 className="text-[26px] leading-tight font-bold relative tracking-tight">
              {displayName}
            </h2>
            <p className="text-sky-100/90 text-sm mt-2 relative max-w-md">
              Here&apos;s what&apos;s happening in your community today.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="bg-[#0f192e] border border-slate-800/70 hover:border-emerald-500/30 p-5 rounded-2xl transition-colors">
              <div className="flex items-start justify-between mb-4">
                <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <IconShieldCheck />
                </span>
              </div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
                Community Safety
              </p>
              <h3 className="text-2xl font-bold mt-1 text-white">
                Safe
              </h3>
            </div>

            <div className="bg-[#0f192e] border border-slate-800/70 hover:border-sky-500/30 p-5 rounded-2xl transition-colors">
              <div className="flex items-start justify-between mb-4">
                <span className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
                  <IconClipboard />
                </span>
              </div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
                My Reports
              </p>
              <h3 className="text-2xl font-bold mt-1 text-white">
                {totalReports}
              </h3>
            </div>

            <div className="bg-[#0f192e] border border-slate-800/70 hover:border-amber-500/30 p-5 rounded-2xl transition-colors">
              <div className="flex items-start justify-between mb-4">
                <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <IconBell />
                </span>
              </div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
                Active Alerts
              </p>
              <h3 className="text-2xl font-bold mt-1 text-white">
                0
              </h3>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-[#0f192e] border border-slate-800/70 rounded-2xl overflow-hidden">

            <div className="px-5 py-4 flex justify-between items-center border-b border-slate-800/70">
              <div>
                <h3 className="font-bold text-white text-[15px]">
                  Recent Activity
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Your latest submitted reports</p>
              </div>

              <button
                onClick={() =>
                  setIsActivityExpanded(
                    !isActivityExpanded
                  )
                }
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 px-3 py-1.5 rounded-lg transition-colors border border-slate-800/60"
              >
                {isActivityExpanded
                  ? 'Minimize'
                  : 'Maximize'}
                <IconChevron direction={isActivityExpanded ? 'up' : 'down'} />
              </button>
            </div>

            {isActivityExpanded && (
              <div className="p-5">

                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 text-sm">No reports found.</p>
                    <p className="text-slate-600 text-xs mt-1">Reports you submit will show up here.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {activities.map(
                      (item, idx) => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3.5 py-3.5 ${
                            idx !== activities.length - 1 ? 'border-b border-slate-800/50' : ''
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${statusDotClasses(item.status)}`} />

                          <div className="flex-1 flex items-center justify-between min-w-0 gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-white text-sm truncate">
                                {item.type}
                              </p>
                              <span
                                className={`inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClasses(
                                  item.status
                                )}`}
                              >
                                {item.status}
                              </span>
                            </div>

                            <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                              {item.time}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}