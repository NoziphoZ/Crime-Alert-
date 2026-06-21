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
          Loading...
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
        } bg-[#0a0f1d] border-r border-slate-800/80 p-4 transition-all duration-300 flex flex-col`}
      >
        <button
          onClick={() =>
            setIsSidebarCollapsed(
              !isSidebarCollapsed
            )
          }
          className="w-full flex items-center justify-center bg-slate-800/60 hover:bg-slate-800 text-slate-300 p-2.5 rounded-xl mb-6 transition-colors"
        >
          <IconChevron direction={isSidebarCollapsed ? 'right' : 'left'} />
        </button>

        <nav className="space-y-1.5">

          <button className="w-full flex items-center gap-3 bg-gradient-to-r from-blue-600 to-sky-500 shadow-lg shadow-blue-900/40 p-3 rounded-xl font-medium">
            <IconGrid />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() =>
              router.push('/emergencybutton')
            }
            className="group relative w-full flex items-center gap-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 p-3 rounded-xl font-semibold shadow-lg shadow-red-950/50 ring-1 ring-red-400/30 transition-all"
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

          <button
            onClick={() =>
              router.push('/citizenreportform')
            }
            className="w-full flex items-center gap-3 text-slate-300 hover:bg-slate-800/70 hover:text-white p-3 rounded-xl transition-colors"
          >
            <IconDocument />
            {!isSidebarCollapsed && <span>Report Incident</span>}
          </button>

          <button className="w-full flex items-center gap-3 text-slate-300 hover:bg-slate-800/70 hover:text-white p-3 rounded-xl transition-colors">
            <IconUser />
            {!isSidebarCollapsed && <span>My Profile</span>}
          </button>
        </nav>

        {/* PROFILE / SIGN OUT */}
        <div className="mt-auto pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
              {avatarInitial}
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-[11px] font-semibold tracking-wide text-sky-400/90">
                  CITIZEN
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-2 w-full flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-3 py-2.5 rounded-xl transition-colors"
          >
            <IconLogout />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1">

        <header className="bg-[#0a0f1d] border-b border-slate-800/80 px-6 py-4 flex items-center gap-2">
          <span className="text-sky-400">
            <IconShieldCheck />
          </span>
          <h1 className="text-sky-400 text-xl font-bold tracking-tight">
            CrimeAlert
          </h1>
        </header>

        <main className="p-6 space-y-6">

          {/* Welcome */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-sky-600 p-6 rounded-2xl">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <h2 className="text-2xl font-bold relative">
              Welcome back, {session?.user?.name}
             </h2>
            <p className="text-sky-100/90 text-sm mt-1 relative">
              Here&apos;s what&apos;s happening in your community.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="group bg-[#0f192e] border border-slate-800/80 hover:border-emerald-500/30 p-5 rounded-2xl transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <IconShieldCheck />
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                Community Safety
              </p>
              <h3 className="text-2xl font-bold mt-0.5">
                Safe
              </h3>
            </div>

            <div className="group bg-[#0f192e] border border-slate-800/80 hover:border-sky-500/30 p-5 rounded-2xl transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <IconClipboard />
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                My Reports
              </p>
              <h3 className="text-2xl font-bold mt-0.5">
                {totalReports}
              </h3>
            </div>

            <div className="group bg-[#0f192e] border border-slate-800/80 hover:border-amber-500/30 p-5 rounded-2xl transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <IconBell />
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                Active Alerts
              </p>
              <h3 className="text-2xl font-bold mt-0.5">
                0
              </h3>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-[#0f192e] border border-slate-800/80 rounded-2xl overflow-hidden">

            <div className="p-4 flex justify-between items-center border-b border-slate-800/80">
              <h3 className="font-bold">
                Recent Activity
              </h3>

              <button
                onClick={() =>
                  setIsActivityExpanded(
                    !isActivityExpanded
                  )
                }
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
              >
                {isActivityExpanded
                  ? 'Minimize'
                  : 'Maximize'}
                <IconChevron direction={isActivityExpanded ? 'up' : 'down'} />
              </button>
            </div>

            {isActivityExpanded && (
              <div className="p-4 space-y-3">

                {activities.length === 0 ? (
                  <p className="text-slate-500 text-sm py-2">No reports found.</p>
                ) : (
                  activities.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center border-b border-slate-800/60 last:border-b-0 pb-3 last:pb-0"
                      >
                        <div>
                          <p className="font-semibold">
                            {item.type}
                          </p>

                          <span
                            className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${statusBadgeClasses(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <span className="text-sm text-slate-500">
                          {item.time}
                        </span>
                      </div>
                    )
                  )
                )}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}