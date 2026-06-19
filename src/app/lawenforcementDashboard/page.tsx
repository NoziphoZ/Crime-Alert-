// app/law-enforcement-dashboard/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";

export default async function LawEnforcementDashboard() {
  // auth() is the v5 app-router server-side auth helper
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  if ((session.user as any).role !== 'law_enforcement') {
    redirect('/citizendashboard');
  }

  const metrics = {
    activeEmergencies: 3,
    pendingCrimeReports: 12,
    resolvedIncidentsToday: 8,
    averageResponseTime: "6.4 mins"
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans">
      
      {/* ==================== CDR1: SIDEBAR (QUICK NAVIGATION) ==================== */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg text-white font-bold">
              🛡️
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Crime Alert
            </span>
          </div>
          
          <nav className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
                Emergency Actions
              </p>
              <Link 
                href="/law-enforcement/respond" 
                className="flex items-center justify-center space-x-2 p-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
              >
                <span>🚨 Respond To Emergency</span>
              </Link>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
                Core Operations
              </p>
              <Link 
                href="/law-enforcement-dashboard" 
                className="flex items-center space-x-3 p-2.5 bg-blue-600/20 text-blue-400 rounded-lg font-medium border-l-4 border-blue-500"
              >
                <span>📊 Overview Dashboard</span>
              </Link>
              <Link 
                href="/law-enforcement/process-reports" 
                className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 rounded-lg transition"
              >
                <span>📁 Process Reports</span>
              </Link>
              <Link 
                href="/law-enforcement/map" 
                className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 rounded-lg transition"
              >
                <span>🗺️ Crime Hotspots</span>
              </Link>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
                Accountability
              </p>
              <Link 
                href="/law-enforcement/feedback" 
                className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 rounded-lg transition"
              >
                <span>✍️ Submit System Feedback</span>
              </Link>
            </div>
          </nav>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-9 w-9 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-white uppercase">
              {session.user.name ? session.user.name.charAt(0) : "O"}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-white truncate">
                {session.user.name || "Officer Duty"}
              </p>
              <p className="text-xs text-slate-400 uppercase tracking-tight">
                {(session.user as any).role || "Enforcement"}
              </p>
            </div>
          </div>
          
          <Link
            href="/api/auth/signout"
            className="block text-center w-full bg-slate-700 hover:bg-red-900/40 text-slate-300 hover:text-red-200 py-2 rounded-lg text-sm font-medium border border-slate-600 hover:border-red-900/50 transition duration-200"
          >
            End Shift / Sign Out
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-md">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Law Enforcement Command Center
            </h1>
            <p className="text-sm text-slate-400">
              Active Monitoring & Incident Processing Interface
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 text-xs uppercase font-bold tracking-wider rounded-md border border-emerald-500/20">
              Live Network Connected
            </span>
          </div>
        </header>

        {/* ==================== CDR2: STAT CARDS ==================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl relative overflow-hidden shadow-sm">
            <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Active Emergencies</p>
            <p className="text-4xl font-extrabold mt-2 text-red-500">{metrics.activeEmergencies}</p>
            <p className="text-xs text-slate-500 mt-2">Immediate dispatch deployments requested</p>
            <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500"></div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl relative overflow-hidden shadow-sm">
            <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Pending Crime Reports</p>
            <p className="text-4xl font-extrabold mt-2 text-amber-500">{metrics.pendingCrimeReports}</p>
            <p className="text-xs text-slate-500 mt-2">Citizen case files requiring validation</p>
            <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500"></div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl relative overflow-hidden shadow-sm">
            <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Resolved Cases Today</p>
            <p className="text-4xl font-extrabold mt-2 text-blue-400">{metrics.resolvedIncidentsToday}</p>
            <p className="text-xs text-slate-500 mt-2">Incidents safely handled and updated on map</p>
            <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500"></div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl relative overflow-hidden shadow-sm">
            <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Avg Dispatch Speed</p>
            <p className="text-4xl font-extrabold mt-2 text-purple-400">{metrics.averageResponseTime}</p>
            <p className="text-xs text-slate-500 mt-2">Average elapsed response-to-resolution window</p>
            <div className="absolute top-0 right-0 w-1.5 h-full bg-purple-500"></div>
          </div>

        </section>

        {/* ==================== CDR3: WELCOME PANEL ==================== */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center shadow-lg">
          <div className="max-w-xl mx-auto space-y-5">
            <div className="inline-flex bg-blue-500/10 p-4 rounded-full border border-blue-500/20 text-blue-400">
              <span className="text-2xl">⚡</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Welcome Back, {session.user.name || "Officer"}
            </h2>
            <p className="text-slate-400 leading-relaxed text-sm">
              Use this workspace portal to handle ongoing field operations. Here you can coordinate dispatches for incoming citizen emergency requests, review filed evidence materials, or update municipal hotspot definitions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <Link 
                href="/law-enforcement/respond" 
                className="bg-slate-900 border border-slate-700 hover:border-red-500/50 p-4 rounded-xl transition duration-200 text-center group"
              >
                <div className="text-lg mb-1 group-hover:scale-110 transition duration-150">🚨</div>
                <p className="text-xs font-bold text-slate-300 group-hover:text-red-400 uppercase tracking-wide">Emergency Desk</p>
                <p className="text-[11px] text-slate-500 mt-1">Review live panic calls</p>
              </Link>

              <Link 
                href="/law-enforcement/process-reports" 
                className="bg-slate-900 border border-slate-700 hover:border-blue-500/50 p-4 rounded-xl transition duration-200 text-center group"
              >
                <div className="text-lg mb-1 group-hover:scale-110 transition duration-150">📁</div>
                <p className="text-xs font-bold text-slate-300 group-hover:text-blue-400 uppercase tracking-wide">Process Logs</p>
                <p className="text-[11px] text-slate-500 mt-1">Audit citizen updates</p>
              </Link>

              <Link 
                href="/law-enforcement/map" 
                className="bg-slate-900 border border-slate-700 hover:border-emerald-500/50 p-4 rounded-xl transition duration-200 text-center group"
              >
                <div className="text-lg mb-1 group-hover:scale-110 transition duration-150">📍</div>
                <p className="text-xs font-bold text-slate-300 group-hover:text-emerald-400 uppercase tracking-wide">Geofence Map</p>
                <p className="text-[11px] text-slate-500 mt-1">Manage crime hotspots</p>
              </Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}