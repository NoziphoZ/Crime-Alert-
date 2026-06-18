'use client'

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";

export type Alert = {
  AlertID:     string;
  UserId:      string;
  AlertTime:   string;
  Location:    string;
  Status:      string;
  Description: string;
  Latitude:    number | null;
  Longitude:   number | null;
  IsActive:    boolean;
  Users:       { FirstName: string; LastName: string; Phone: string } | null;
};

export type Stats = {
  totalToday:  number;
  active:      number;
  responding:  number;
  resolved:    number;
};

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "Received",          icon: "📨", label: "Case Received",     msg: "Please stay calm. We have received your emergency report and are processing your location." },
  { value: "Location Verified", icon: "📍", label: "Location Verified", msg: "Your location has been confirmed. Emergency responders are being dispatched." },
  { value: "Unit Dispatched",   icon: "🚗", label: "Unit Dispatched",   msg: "Help is on the way. Please remain at your current location and stay calm." },
  { value: "Unit Arrived",      icon: "🎯", label: "Unit Arrived",      msg: "Emergency responders have arrived at your location. Please cooperate with officers." },
  { value: "Case Resolved",     icon: "✅", label: "Case Resolved",     msg: "Your emergency has been successfully handled. Thank you for using CrimeAlert." },
];

const FILTER_STATUSES  = ["", "Received", "Location Verified", "Unit Dispatched", "Unit Arrived", "Case Resolved"];
const FILTER_PRIORITIES = ["", "Critical", "High", "Medium", "Low"];
const DATE_RANGES      = ["Today", "Yesterday", "Last7Days", "Last30Days", "All"];
const PAGE_SIZES       = [10, 25, 50, 100];

const statusBadge: Record<string, string> = {
  "Received":          "bg-red-500/20    text-red-400    border border-red-500/40",
  "Location Verified": "bg-amber-500/20  text-amber-400  border border-amber-500/40",
  "Unit Dispatched":   "bg-blue-500/20   text-blue-400   border border-blue-500/40",
  "Unit Arrived":      "bg-purple-500/20 text-purple-400 border border-purple-500/40",
  "Case Resolved":     "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
};

const priorityBadge: Record<string, string> = {
  Critical: "bg-red-500/20    text-red-400    border border-red-500/40",
  High:     "bg-amber-500/20  text-amber-400  border border-amber-500/40",
  Medium:   "bg-blue-500/20   text-blue-400   border border-blue-500/40",
  Low:      "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
};

function getPriority(alert: Alert): string {
  const active = ["Received", "Location Verified", "Unit Dispatched"];
  if (alert.Status === "Received") return "Critical";
  if (active.includes(alert.Status)) return "High";
  if (alert.Status === "Unit Arrived") return "Medium";
  return "Low";
}

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
  alerts:          Alert[];
  stats:           Stats;
  totalRecords:    number;
  totalPages:      number;
  currentPage:     number;
  currentSearch:   string;
  currentStatus:   string;
  currentPriority: string;
  currentDateRange: string;
  currentPageSize: number;
  officerName:     string;
};

type Toast = { message: string; ok: boolean } | null;

// ── Component ────────────────────────────────────────────────────────────────

export default function EmergencyResponseClient({
  alerts,
  stats,
  totalRecords,
  totalPages,
  currentPage,
  currentSearch,
  currentStatus,
  currentPriority,
  currentDateRange,
  currentPageSize,
  officerName,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [search,    setSearch]    = useState(currentSearch);
  const [status,    setStatus]    = useState(currentStatus);
  const [priority,  setPriority]  = useState(currentPriority);
  const [dateRange, setDateRange] = useState(currentDateRange);
  const [pageSize,  setPageSize]  = useState(currentPageSize);

  // Modal state
  const [modalAlert,      setModalAlert]      = useState<Alert | null>(null);
  const [selectedStatus,  setSelectedStatus]  = useState<string>("");
  const [dispatchAlert,   setDispatchAlert]   = useState<Alert | null>(null);

  // Loading / feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [toast,         setToast]         = useState<Toast>(null);

  // ── URL navigation ─────────────────────────────────────────────────────────

  const navigate = useCallback((overrides: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const merged = {
      search:    search,
      status:    status,
      priority:  priority,
      dateRange: dateRange,
      pageSize:  String(pageSize),
      page:      String(currentPage),
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v); });
    startTransition(() => router.push(`/law-enforcement/respond?${params.toString()}`));
  }, [search, status, priority, dateRange, pageSize, currentPage, router]);

  const showToast = (message: string, ok: boolean) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Status update ──────────────────────────────────────────────────────────

  const handleStatusUpdate = async () => {
    if (!modalAlert || !selectedStatus) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/law-enforcement/update-alert", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ alertId: modalAlert.AlertID, status: selectedStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      showToast(`✅ Case #${modalAlert.AlertID} updated to "${selectedStatus}"`, true);
      setModalAlert(null);
      setSelectedStatus("");
      startTransition(() => router.refresh());
    } catch (err: any) {
      showToast(`❌ ${err.message ?? "Something went wrong"}`, false);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Dispatch / complete ────────────────────────────────────────────────────

  const handleDispatch = async () => {
    if (!dispatchAlert) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/law-enforcement/complete-alert", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ alertId: dispatchAlert.AlertID }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Dispatch failed");
      const name = dispatchAlert.Users
        ? `${dispatchAlert.Users.FirstName} ${dispatchAlert.Users.LastName}`
        : "Unknown";
      showToast(`✅ Case #${dispatchAlert.AlertID} completed — Reporter: ${name}`, true);
      setDispatchAlert(null);
      startTransition(() => router.refresh());
    } catch (err: any) {
      showToast(`❌ ${err.message ?? "Something went wrong"}`, false);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Pagination range ───────────────────────────────────────────────────────

  const pageButtons = (() => {
    const range: (number | "...")[] = [];
    const start = Math.max(1, currentPage - 2);
    const end   = Math.min(totalPages, currentPage + 2);
    if (start > 1) { range.push(1); if (start > 2) range.push("..."); }
    for (let i = start; i <= end; i++) range.push(i);
    if (end < totalPages) { if (end < totalPages - 1) range.push("..."); range.push(totalPages); }
    return range;
  })();

  const startRecord = totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRecord   = Math.min(currentPage * pageSize, totalRecords);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6
                         bg-gradient-to-r from-blue-800 to-blue-900 p-6 rounded-2xl border-b-4 border-blue-500 shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">🚨 Emergency Response Management</h1>
          <p className="text-sm text-blue-200 mt-1">Dispatch assistance, monitor location feeds, and track emergency timelines.</p>
        </div>
        <div className="flex items-center gap-4 text-blue-100 text-sm font-medium">
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </div>
          <span>{officerName}</span>
        </div>
      </header>

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${
          toast.ok
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-red-500/10    border-red-500/30    text-red-300"
        }`}>
          {toast.message}
        </div>
      )}

      {/* ── Control section ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 mb-6">

        {/* Filters panel */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-t-4 border-blue-600 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-blue-400 mb-5 flex items-center gap-2">🔍 Filters & Search</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Filter</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); navigate({ status: e.target.value, page: 1 }); }}
                className="bg-slate-900/80 border-2 border-blue-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
              >
                <option value="">All Statuses</option>
                {FILTER_STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority Filter</label>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); navigate({ priority: e.target.value, page: 1 }); }}
                className="bg-slate-900/80 border-2 border-blue-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
              >
                <option value="">All Priorities</option>
                {FILTER_PRIORITIES.slice(1).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Page size */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Show Records</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); navigate({ pageSize: e.target.value, page: 1 }); }}
                className="bg-slate-900/80 border-2 border-blue-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
              >
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s} per page</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Search by Name / Phone</label>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") navigate({ search: search, page: 1 }); }}
                onBlur={() => navigate({ search: search, page: 1 })}
                className="bg-slate-900/80 border-2 border-blue-700 text-white placeholder-slate-500 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
              />
            </div>

            {/* Date range */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => { setDateRange(e.target.value); navigate({ dateRange: e.target.value, page: 1 }); }}
                className="bg-slate-900/80 border-2 border-blue-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Last7Days">Last 7 Days</option>
                <option value="Last30Days">Last 30 Days</option>
                <option value="All">All Time</option>
              </select>
            </div>

            {/* Refresh */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</label>
              <button
                onClick={() => startTransition(() => router.refresh())}
                className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold border border-blue-600 transition flex items-center justify-center gap-2"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats panel */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-t-4 border-blue-600 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-blue-400 mb-5 flex items-center gap-2">📊 Live Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Total Today", value: stats.totalToday, color: "text-blue-400" },
              { label: "Active",      value: stats.active,     color: "text-red-400"  },
              { label: "Responding",  value: stats.responding, color: "text-amber-400"},
              { label: "Resolved",    value: stats.resolved,   color: "text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gradient-to-br from-blue-900 to-blue-950 border-2 border-blue-700 rounded-xl p-4 text-center shadow">
                <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
                <div className="text-slate-300 text-sm font-medium mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Emergency list ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-t-4 border-blue-600 rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">📋 Emergency Cases</h3>
          <span className="text-slate-400 text-sm">
            {totalRecords > 0
              ? `Showing ${startRecord}–${endRecord} of ${totalRecords} records`
              : "No records found"}
          </span>
        </div>

        {isPending ? (
          <div className="text-center py-16 text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            Loading…
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🎉</p>
            <p className="text-slate-300 font-semibold">No emergency cases match the current filters.</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting filters or changing the date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-900 to-blue-950 text-blue-300 uppercase text-xs tracking-widest">
                  {["ID", "Reporter", "Contact", "Location", "Time", "Priority", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {alerts.map((alert) => {
                  const name     = alert.Users ? `${alert.Users.FirstName} ${alert.Users.LastName}` : "Unknown";
                  const phone    = alert.Users?.Phone ?? "—";
                  const priority = getPriority(alert);
                  return (
                    <tr key={alert.AlertID} className="bg-slate-800/40 hover:bg-slate-800 transition">
                      <td className="px-4 py-3 font-bold text-white">#{alert.AlertID}</td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-white whitespace-nowrap">{name}</div>
                        <div className="text-slate-400 text-xs">ID: {alert.UserId}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-slate-300">{phone}</div>
                      </td>

                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="text-slate-300 truncate">📍 {alert.Location || "—"}</div>
                        {alert.Latitude && (
                          <div className="text-slate-500 text-xs">
                            {alert.Latitude.toFixed(4)}, {alert.Longitude?.toFixed(4)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-slate-300">{new Date(alert.AlertTime).toLocaleDateString()}</div>
                        <div className="text-slate-500 text-xs">{new Date(alert.AlertTime).toLocaleTimeString()}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${priorityBadge[priority] ?? ""}`}>
                          {priority}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[alert.Status] ?? "bg-slate-700 text-slate-300"}`}>
                          {alert.Status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setModalAlert(alert); setSelectedStatus(""); }}
                            className="text-xs bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold border border-blue-600 transition flex items-center gap-1"
                          >
                            📝 Status
                          </button>
                          <button
                            onClick={() => setDispatchAlert(alert)}
                            className="text-xs bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white px-3 py-1.5 rounded-lg font-semibold border border-red-600 transition flex items-center gap-1"
                          >
                            🚨 Complete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            {currentPage > 1 && (
              <button onClick={() => navigate({ page: currentPage - 1 })}
                className="px-3 py-2 bg-slate-800 border-2 border-blue-700 text-slate-300 rounded-lg text-sm hover:bg-blue-800 hover:text-white transition">
                « Previous
              </button>
            )}
            {pageButtons.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-3 py-2 text-slate-500">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => navigate({ page: p })}
                  className={`px-3 py-2 rounded-lg text-sm border-2 transition font-semibold
                    ${p === currentPage
                      ? "bg-gradient-to-r from-blue-700 to-blue-800 border-blue-500 text-white shadow"
                      : "bg-slate-800 border-blue-700 text-slate-300 hover:bg-blue-800 hover:text-white"
                    }`}
                >
                  {p}
                </button>
              )
            )}
            {currentPage < totalPages && (
              <button onClick={() => navigate({ page: currentPage + 1 })}
                className="px-3 py-2 bg-slate-800 border-2 border-blue-700 text-slate-300 rounded-lg text-sm hover:bg-blue-800 hover:text-white transition">
                Next »
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Status Update Modal ──────────────────────────────────────────────── */}
      {modalAlert && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setModalAlert(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-600 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-blue-400 text-center mb-6">Update Emergency Status</h2>
            <p className="text-slate-400 text-xs text-center mb-4">Case #{modalAlert.AlertID} —
              {modalAlert.Users ? ` ${modalAlert.Users.FirstName} ${modalAlert.Users.LastName}` : " Unknown"}</p>

            <div className="space-y-2 mb-6">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedStatus(opt.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition text-sm
                    ${selectedStatus === opt.value
                      ? "border-blue-400 bg-blue-900/40 text-white"
                      : "border-blue-800 bg-slate-900/60 text-slate-300 hover:border-blue-500 hover:bg-blue-900/20"
                    }`}
                >
                  <span className="font-bold mr-2">{opt.icon} {opt.label}</span>
                  <span className="text-slate-400 text-xs block mt-1">"{opt.msg}"</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStatusUpdate}
                disabled={!selectedStatus || actionLoading}
                className="flex-1 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                {actionLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : "Update Status"}
              </button>
              <button
                onClick={() => setModalAlert(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-xl font-semibold border border-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dispatch Confirm Modal ───────────────────────────────────────────── */}
      {dispatchAlert && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDispatchAlert(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-red-600 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🚨</div>
              <h2 className="text-xl font-bold text-red-400">Dispatch Confirmation</h2>
              <p className="text-slate-400 text-sm mt-2">This will mark the case as <strong className="text-white">Case Resolved</strong>.</p>
            </div>

            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Case ID</span>
                <span className="text-white font-semibold">#{dispatchAlert.AlertID}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reporter</span>
                <span className="text-white">
                  {dispatchAlert.Users ? `${dispatchAlert.Users.FirstName} ${dispatchAlert.Users.LastName}` : "Unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone</span>
                <span className="text-white">{dispatchAlert.Users?.Phone ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location</span>
                <span className="text-white truncate max-w-[200px]">{dispatchAlert.Location || "—"}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDispatch}
                disabled={actionLoading}
                className="flex-1 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                {actionLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : "✅ Confirm Complete"}
              </button>
              <button
                onClick={() => setDispatchAlert(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-xl font-semibold border border-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}