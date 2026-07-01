// src/app/admin-dashboard/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';



interface DashboardStats {
  totalUsers: number;
  activeReports: number;
  pendingReviews: number;
  satisfactionRating: number | null;
}

interface RecentActivity {
  id: string;
  report_number: string;
  type_of_incident: string;
  location_text: string;
  status: string;
  incident_date_time: string;
  priority: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Auth Check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // ── Admin Role Check ──────────────────────────────────────────────────────
  useEffect(() => {
    if (session?.user) {
      const userRole = (session.user as any)?.role;
      if (userRole?.toLowerCase() !== 'admin') {
        router.push('/citizendashboard');
      }
    }
  }, [session, router]);

  // ── Fetch Dashboard Data ──────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin-dashboard');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load dashboard data');
      }

      setStats(data.stats);
      setRecentActivities(data.recentActivities || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle Sidebar ────────────────────────────────────────────────────────
  const toggleSidebar = () => {
    setSidebarMinimized(!sidebarMinimized);
  };

  // ── Loading State ──────────────────────────────────────────────────────────
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center max-w-md">
          <p className="text-red-400 text-lg mb-4">❌ {error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      
      {/* ========== SIDEBAR ========== */}
      <aside
        className={`
          ${sidebarMinimized ? 'w-20' : 'w-64'}
          bg-gradient-to-b from-slate-800 to-slate-900
          border-r-2 border-blue-600
          shadow-2xl
          transition-all duration-300
          flex flex-col
          sticky top-0 h-screen
          overflow-y-auto
        `}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={`
            m-3 p-3
            bg-blue-900/50 hover:bg-blue-800
            border-2 border-blue-500
            rounded-xl
            text-white font-bold
            transition-all duration-300
            hover:scale-105
            ${sidebarMinimized ? 'text-center' : 'text-left'}
          `}
        >
          {sidebarMinimized ? '☰' : '☰ Menu'}
        </button>

        {/* Admin Badge */}
        <div
          className={`
            mx-3 mb-4
            bg-gradient-to-r from-blue-600 to-blue-800
            rounded-xl p-3
            text-center font-bold text-white
            border-2 border-blue-400
            shadow-lg
            ${sidebarMinimized ? 'text-xs' : 'text-sm'}
          `}
        >
          {sidebarMinimized ? '🛡️' : '🛡️ ADMIN CONTROL'}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {[
            { href: '/admin-dashboard', icon: '📊', label: 'Dashboard' },
            { href: '/admin-reports', icon: '📄', label: 'Reports' },
            { href: '/admin-feedback', icon: '💬', label: 'Feedback' },
            { href: '/manager-users', icon: '👥', label: 'Users' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3
                px-4 py-3
                rounded-xl
                text-slate-300 hover:text-white
                hover:bg-blue-900/50
                transition-all duration-300
                ${item.href === '/admin-dashboard' ? 'bg-blue-600/30 border border-blue-500 text-white shadow-lg' : ''}
                ${sidebarMinimized ? 'justify-center' : ''}
              `}
            >
              <span className="text-xl">{item.icon}</span>
              {!sidebarMinimized && (
                <span className="font-semibold text-sm">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={`
              w-full
              flex items-center gap-3
              px-4 py-3
              rounded-xl
              text-slate-300 hover:text-white
              hover:bg-red-900/30
              transition-all duration-300
              ${sidebarMinimized ? 'justify-center' : ''}
            `}
          >
            <span className="text-xl">🚪</span>
            {!sidebarMinimized && (
              <span className="font-semibold text-sm">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-8 mb-8 border-2 border-blue-500 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              🎯 Admin Dashboard
            </h1>
            <p className="text-blue-200 text-lg">
              Monitor and control your crime alert system
            </p>
          </div>
        </div>

        {/* ========== STATISTICS GRID ========== */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">📊 Key Metrics</h2>
          <p className="text-slate-400 mb-6">Real-time overview of system performance</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Users */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-600/50 rounded-2xl p-6 shadow-xl hover:transform hover:-translate-y-1 transition-all duration-300 hover:shadow-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Users</h3>
                <span className="text-3xl">👥</span>
              </div>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {stats?.totalUsers.toLocaleString() || '0'}
              </div>
              <p className="text-sm text-slate-500 font-medium">Registered users in the system</p>
            </div>

            {/* Active Reports */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-600/50 rounded-2xl p-6 shadow-xl hover:transform hover:-translate-y-1 transition-all duration-300 hover:shadow-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Active Reports</h3>
                <span className="text-3xl">📊</span>
              </div>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {stats?.activeReports.toLocaleString() || '0'}
              </div>
              <p className="text-sm text-slate-500 font-medium">Currently active crime reports</p>
            </div>

            {/* Pending Reviews */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-600/50 rounded-2xl p-6 shadow-xl hover:transform hover:-translate-y-1 transition-all duration-300 hover:shadow-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Pending Reviews</h3>
                <span className="text-3xl">⏳</span>
              </div>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {stats?.pendingReviews.toLocaleString() || '0'}
              </div>
              <p className="text-sm text-slate-500 font-medium">Reports awaiting review</p>
            </div>

            {/* Satisfaction */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-600/50 rounded-2xl p-6 shadow-xl hover:transform hover:-translate-y-1 transition-all duration-300 hover:shadow-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Satisfaction</h3>
                <span className="text-3xl">⭐</span>
              </div>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {stats?.satisfactionRating ? `${stats.satisfactionRating.toFixed(1)}/5` : 'N/A'}
              </div>
              <p className="text-sm text-slate-500 font-medium">User satisfaction rating</p>
            </div>
          </div>
        </div>

        {/* ========== RECENT ACTIVITY ========== */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">📋 Recent Activity</h2>
          <p className="text-slate-400 mb-6">Latest crime reports and updates</p>
          
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            {recentActivities.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No recent activity to display
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {recentActivities.map((activity) => {
                  const getStatusColor = (status: string) => {
                    const map: Record<string, string> = {
                      'Submitted': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                      'Under Investigation': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                      'Dispatched': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                      'Resolved': 'bg-green-500/20 text-green-400 border-green-500/30'
                    };
                    return map[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                  };

                  const getPriorityColor = (priority: string) => {
                    const map: Record<string, string> = {
                      'Critical': 'text-red-400',
                      'High': 'text-orange-400',
                      'Medium': 'text-yellow-400',
                      'Low': 'text-green-400'
                    };
                    return map[priority] || 'text-slate-400';
                  };

                  const formatDate = (dateString: string) => {
                    try {
                      const date = new Date(dateString);
                      return date.toLocaleString('en-ZA', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    } catch {
                      return dateString;
                    }
                  };

                  return (
                    <div key={activity.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-white">
                              {activity.type_of_incident}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(activity.status)}`}>
                              {activity.status}
                            </span>
                            <span className={`text-xs font-bold ${getPriorityColor(activity.priority)}`}>
                              {activity.priority}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 truncate">
                            📍 {activity.location_text}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">
                              🕒 {formatDate(activity.incident_date_time)}
                            </span>
                            <span className="text-xs text-slate-600">
                              #{activity.report_number}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========== QUICK ACTIONS ========== */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">⚡ Quick Actions</h2>
          <p className="text-slate-400 mb-6">Access frequently used features</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/admin-users"
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-600/50 rounded-2xl p-8 text-center hover:transform hover:-translate-y-2 transition-all duration-300 hover:shadow-blue-500/30 hover:border-blue-400 group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👥</div>
              <h3 className="text-lg font-bold text-white mb-2">Manage Users</h3>
              <p className="text-sm text-slate-400">View and manage all officers</p>
            </Link>

            <Link
              href="/admin-reports"
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-600/50 rounded-2xl p-8 text-center hover:transform hover:-translate-y-2 transition-all duration-300 hover:shadow-blue-500/30 hover:border-blue-400 group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📄</div>
              <h3 className="text-lg font-bold text-white mb-2">View Reports</h3>
              <p className="text-sm text-slate-400">Review crime reports</p>
            </Link>

            <Link
              href="/admin-feedback"
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-600/50 rounded-2xl p-8 text-center hover:transform hover:-translate-y-2 transition-all duration-300 hover:shadow-blue-500/30 hover:border-blue-400 group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">💬</div>
              <h3 className="text-lg font-bold text-white mb-2">User Feedback</h3>
              <p className="text-sm text-slate-400">Read user feedback</p>
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}