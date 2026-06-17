'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ActivityItem {
  id: string
  type: string
  status: string
  time: string
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
        Loading...
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
        } bg-[#0a0f1d] border-r border-slate-800 p-4 transition-all`}
      >
        <button
          onClick={() =>
            setIsSidebarCollapsed(
              !isSidebarCollapsed
            )
          }
          className="w-full bg-slate-800 p-2 rounded-xl mb-6"
        >
          {isSidebarCollapsed ? '☰' : '＝'}
        </button>

        <div className="space-y-4">

          <button className="w-full bg-blue-600 p-3 rounded-xl">
            {!isSidebarCollapsed &&
              'Dashboard'}
          </button>

          <button
            onClick={() =>
              router.push('/citizenreportform')
            }
            className="w-full hover:bg-slate-800 p-3 rounded-xl"
          >
            {!isSidebarCollapsed &&
              'Report Incident'}
          </button>

          <button className="w-full hover:bg-slate-800 p-3 rounded-xl">
            {!isSidebarCollapsed &&
              'My Profile'}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1">

        <header className="bg-[#0a0f1d] border-b border-slate-800 px-6 py-4">
          <h1 className="text-sky-400 text-xl font-bold">
            CrimeAlert
          </h1>
        </header>

        <main className="p-6 space-y-6">

          {/* Welcome */}
          <div className="bg-gradient-to-r from-blue-600 to-sky-600 p-6 rounded-2xl">
            <h2 className="text-2xl font-bold">
              Welcome back, {session?.user?.name}
             </h2>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="bg-[#0f192e] p-5 rounded-2xl">
              <p className="text-slate-400">
                Community Safety
              </p>

              <h3 className="text-2xl font-bold">
                Safe
              </h3>
            </div>

            <div className="bg-[#0f192e] p-5 rounded-2xl">
              <p className="text-slate-400">
                My Reports
              </p>

              <h3 className="text-2xl font-bold">
                {totalReports}
              </h3>
            </div>

            <div className="bg-[#0f192e] p-5 rounded-2xl">
              <p className="text-slate-400">
                Active Alerts
              </p>

              <h3 className="text-2xl font-bold">
                0
              </h3>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-[#0f192e] rounded-2xl overflow-hidden">

            <div className="p-4 flex justify-between border-b border-slate-800">
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

                {activities.length === 0 ? (
                  <p>No reports found.</p>
                ) : (
                  activities.map(
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