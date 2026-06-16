'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface ActivityItem {
  id: string
  type: string
  status: string
  time: string
}

interface DashboardStats {
  totalReports: number
  activeAlerts: number
  safetyStatus: string
}

export default function CitizenDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(false)

  const [isActivityExpanded, setIsActivityExpanded] =
    useState(true)

  const [activities, setActivities] =
    useState<ActivityItem[]>([])

  const [stats, setStats] =
    useState<DashboardStats | null>(null)

  // Protect dashboard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch dashboard data
  useEffect(() => {
    if (!session?.user) return

    const userId =
      (session.user as any)?.id

    if (!userId) return

    const fetchDashboard =
      async () => {
        try {
          const res = await fetch(
            `/api/dashboard?userId=${userId}`
          )

          const data =
            await res.json()

          setActivities(
            data.activities || []
          )

          setStats(
            data.stats || null
          )
        } catch (error) {
          console.error(
            'Dashboard fetch error:',
            error
          )
        }
      }

    fetchDashboard()
  }, [session])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0d1527] text-white flex items-center justify-center">
        Loading dashboard...
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
        } bg-[#0a0f1d] border-r border-slate-800 p-4 transition-all duration-300 flex flex-col`}
      >
        <button
          onClick={() =>
            setIsSidebarCollapsed(
              !isSidebarCollapsed
            )
          }
          className="w-full bg-slate-800 hover:bg-slate-700 p-2 rounded-xl mb-6"
        >
          {isSidebarCollapsed
            ? '☰'
            : '＝'}
        </button>

        <div className="space-y-4">

          {/* Dashboard */}
          <button className="w-full bg-blue-600 p-3 rounded-xl flex gap-3">
            📊
            {!isSidebarCollapsed &&
              'Dashboard'}
          </button>

          {/* Report Incident */}
          <button
            onClick={() =>
              router.push(
                '/citizenreportform'
              )
            }
            className="w-full hover:bg-slate-800 p-3 rounded-xl flex gap-3"
          >
            📝
            {!isSidebarCollapsed &&
              'Report Incident'}
          </button>

          {/* Profile */}
          <button className="w-full hover:bg-slate-800 p-3 rounded-xl flex gap-3">
            👤
            {!isSidebarCollapsed &&
              'My Profile'}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1">

        {/* HEADER */}
        <header className="bg-[#0a0f1d] border-b border-slate-800 px-6 py-4">
          <h1 className="text-sky-400 font-bold text-xl">
            CrimeAlert
          </h1>
        </header>

        {/* CONTENT */}
        <main className="p-6 space-y-6">

          {/* Welcome */}
          <div className="bg-gradient-to-r from-blue-600 to-sky-600 p-6 rounded-2xl">
            <h2 className="text-2xl font-bold">
              Welcome back,
              {' '}
              {session?.user?.name ||
                'Citizen'}
            </h2>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="bg-[#0f192e] p-5 rounded-2xl">
              <p className="text-slate-400 text-sm">
                Community Safety
              </p>

              <h3 className="text-2xl font-bold">
                {stats?.safetyStatus ||
                  'Safe'}
              </h3>
            </div>

            <div className="bg-[#0f192e] p-5 rounded-2xl">
              <p className="text-slate-400 text-sm">
                My Reports
              </p>

              <h3 className="text-2xl font-bold">
                {stats?.totalReports ??
                  0}
              </h3>
            </div>

            <div className="bg-[#0f192e] p-5 rounded-2xl">
              <p className="text-slate-400 text-sm">
                Active Alerts
              </p>

              <h3 className="text-2xl font-bold">
                {stats?.activeAlerts ??
                  0}
              </h3>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#0f192e] rounded-2xl overflow-hidden">

            <div className="p-4 border-b border-slate-800 flex justify-between">
              <h3 className="font-bold">
                Recent Activity
              </h3>

              <button
                onClick={() =>
                  setIsActivityExpanded(
                    !isActivityExpanded
                  )
                }
              >
                {isActivityExpanded
                  ? 'Minimize'
                  : 'Maximize'}
              </button>
            </div>

            {isActivityExpanded && (
              <div className="p-4 space-y-4">

                {activities.length ===
                  0 && (
                  <p className="text-slate-400">
                    No activity found
                  </p>
                )}

                {activities.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex justify-between border-b border-slate-800 pb-2"
                    >
                      <div>
                        <p className="font-semibold">
                          {item.type}
                        </p>

                        <p className="text-sm text-slate-500">
                          {item.status}
                        </p>
                      </div>

                      <span className="text-sm text-slate-500">
                        {item.time}
                      </span>
                    </div>
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