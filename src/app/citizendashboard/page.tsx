'use client'
import React, { useState } from 'react'

interface ActivityItem {
  id: string;
  type: string;
  status: string;
  time: string;
}

export default function CitizenDashboard() {
  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)
  
  // Minimize/Maximize state for Recent Activity panel
  const [isActivityExpanded, setIsActivityExpanded] = useState<boolean>(true)

  // Mock data matching image_88777c.png
  const [activities] = useState<ActivityItem[]>([
    { id: '1', type: 'theft Crime', status: 'Status: Submitted', time: '19 hours ago' },
    { id: '2', type: 'assault Crime', status: 'Status: Submitted', time: '19 hours ago' },
  ])

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex">
      
      {/* ================= SIDEBAR NAVIGATION ================= */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#0a0f1d] border-r border-slate-800/80 p-4 transition-all duration-300 flex flex-col shrink-0`}>
        {/* Toggle Button (=) */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="w-full bg-slate-800/60 hover:bg-slate-700 p-2.5 rounded-xl border border-slate-700/40 text-center font-bold transition-all text-sm mb-6"
        >
          {isSidebarCollapsed ? '☰' : '＝'}
        </button>

        {/* Sidebar Menu Items */}
        <div className="space-y-6 flex-1 text-xs uppercase tracking-wider text-slate-500 font-semibold">
          <div>
            {!isSidebarCollapsed && <span className="px-2 block mb-2 text-[10px]">Emergency</span>}
            <button className="w-full bg-red-600 hover:bg-red-500 text-white p-3 rounded-xl font-bold flex items-center gap-3 transition-all normal-case text-sm">
              🚨 <span>{!isSidebarCollapsed && 'Emergency Alert'}</span>
            </button>
          </div>

          <div className="space-y-1">
            {!isSidebarCollapsed && <span className="px-2 block mb-2 text-[10px]">Reporting</span>}
            <button className="w-full bg-blue-600 text-white p-3 rounded-xl flex items-center gap-3 font-medium normal-case text-sm">
              📊 <span>{!isSidebarCollapsed && 'Dashboard'}</span>
            </button>
            <button className="w-full hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 p-3 rounded-xl flex items-center gap-3 font-medium transition-all normal-case text-sm">
              📝 <span>{!isSidebarCollapsed && 'Report Incident'}</span>
            </button>
            <button className="w-full hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 p-3 rounded-xl flex items-center gap-3 font-medium transition-all normal-case text-sm">
              ⚡ <span>{!isSidebarCollapsed && 'Emergency Status'}</span>
            </button>
          </div>

          <div className="space-y-1">
            {!isSidebarCollapsed && <span className="px-2 block mb-2 text-[10px]">Account</span>}
            <button className="w-full hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 p-3 rounded-xl flex items-center gap-3 font-medium transition-all normal-case text-sm">
              👤 <span>{!isSidebarCollapsed && 'My Profile'}</span>
            </button>
            <button className="w-full hover:bg-red-950/20 text-red-400 p-3 rounded-xl flex items-center gap-3 font-medium transition-all normal-case text-sm">
              🚪 <span>{!isSidebarCollapsed && 'Logout'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP BAR / LOGO */}
        <header className="bg-[#0a0f1d]/40 border-b border-slate-800/50 px-6 sm:px-8 py-4 flex justify-between items-center backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="text-xl">🛡️</div>
            <span className="text-lg font-black tracking-wider text-sky-400 uppercase">CrimeAlert</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400 font-medium">
            <span className="hover:text-white cursor-pointer hidden md:inline">Home</span>
            <span className="hover:text-white cursor-pointer hidden md:inline">Features</span>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold transition-all">
              Login
            </button>
          </div>
        </header>

        {/* CONTAINER WORKSPACE */}
        <main className="p-6 sm:p-8 space-y-6 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {/* WELCOME BANNER */}
          <div className="bg-gradient-to-r from-blue-600 to-sky-600 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back, Thuledu Myeni</h2>
            <p className="text-blue-100 text-xs mt-1 font-light">Your community safety dashboard - Stay informed, stay safe</p>
          </div>

          {/* STAT CARDS ROW (CRD2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-[#0f192e] border border-slate-800/80 rounded-2xl p-5 flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400 font-medium block">Community Safety</span>
                <span className="text-2xl font-black block mt-2">Safe</span>
                <span className="text-[10px] text-slate-500 block mt-1">Based on recent local activity</span>
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
            </div>

            <div className="bg-[#0f192e] border border-slate-800/80 rounded-2xl p-5 flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400 font-medium block">My Reports</span>
                <span className="text-2xl font-black block mt-2">2</span>
                <span className="text-[10px] text-slate-500 block mt-1">Active reports submitted this month</span>
              </div>
              <span className="text-xl">📋</span>
            </div>

            <div className="bg-[#0f192e] border border-slate-800/80 rounded-2xl p-5 flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400 font-medium block">Total Reports</span>
                <span className="text-2xl font-black block mt-2">2</span>
                <span className="text-[10px] text-slate-500 block mt-1">All historical reports to date</span>
              </div>
              <span className="text-xl">📊</span>
            </div>

            <div className="bg-[#0f192e] border border-slate-800/80 rounded-2xl p-5 flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400 font-medium block">Active Alerts</span>
                <span className="text-2xl font-black block mt-2">0</span>
                <span className="text-[10px] text-slate-500 block mt-1">Emergency dispatch items open</span>
              </div>
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></span>
            </div>

          </div>

          {/* RECENT ACTIVITY BLOCK WITH MINIMIZE TOGGLE (CRD3) */}
          <div className="bg-[#0f192e] border border-slate-800/80 rounded-2xl overflow-hidden transition-all">
            
            {/* Header Control panel */}
            <div className="p-5 flex justify-between items-center border-b border-slate-800/50 bg-slate-900/20">
              <h3 className="font-bold text-sm tracking-tight text-slate-200">Recent Activity</h3>
              
              {/* Dynamic Minimize / Maximize Action Switcher */}
              <button 
                onClick={() => setIsActivityExpanded(!isActivityExpanded)}
                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700/60 px-3 py-1.5 rounded-lg text-slate-300 transition-colors font-medium flex items-center gap-1.5"
              >
                <span>{isActivityExpanded ? '➖ Minimize' : '➕ Maximize'}</span>
              </button>
            </div>

            {/* Collapsible Content Grid */}
            {isActivityExpanded && (
              <div className="p-4 space-y-3 divide-y divide-slate-800/40">
                {activities.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 text-red-400 rounded-xl font-bold">🚨</div>
                      <div>
                        <h4 className="font-semibold text-slate-200 capitalize">{item.type}</h4>
                        <p className="text-slate-500 text-[11px] mt-0.5">{item.status}</p>
                      </div>
                    </div>
                    <span className="text-slate-500 text-[11px]">{item.time}</span>
                  </div>
                ))}
              </div>
            )}
            
          </div>

        </main>
      </div>
    </div>
  )
}