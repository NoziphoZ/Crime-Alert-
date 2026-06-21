'use client';

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CrimeReport, ReportStats } from "./page";

type Props = {
  reports: CrimeReport[];
  stats: ReportStats;
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  currentCrimeType: string;
  currentStatus: string;
  currentDateRange: string;
  currentSearch: string;
  officerName: string;
};

type Toast = { message: string; ok: boolean } | null;

const STATUS_OPTIONS = [
  { value: "Submitted", label: "📨 Submitted", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  { value: "Under Investigation", label: "🔍 Under Investigation", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  { value: "Dispatched", label: "🚗 Dispatched", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  { value: "Resolved", label: "✅ Resolved", color: "bg-slate-500/20 text-slate-400 border-slate-500/40" },
];

const CRIME_TYPES = [
  { value: "", label: "All Crime Types" },
  { value: "Theft", label: "Theft" },
  { value: "Vandalism", label: "Vandalism" },
  { value: "Assault", label: "Assault" },
  { value: "Burglary", label: "Burglary" },
  { value: "Fraud", label: "Fraud" },
  { value: "Suspicious Activity", label: "Suspicious Activity" },
  { value: "Other", label: "Other" },
];

const DATE_RANGES = ["Today", "Yesterday", "Last7Days", "Last30Days", "All"];

const priorityBadge: Record<string, string> = {
  Critical: "bg-red-500/20 text-red-400 border-red-500/40",
  High: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  Low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
};

export default function ProcessReportsClient({
  reports,
  stats,
  totalRecords,
  totalPages,
  currentPage,
  currentCrimeType,
  currentStatus,
  currentDateRange,
  currentSearch,
  officerName,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [crimeType, setCrimeType] = useState(currentCrimeType);
  const [status, setStatus] = useState(currentStatus);
  const [dateRange, setDateRange] = useState(currentDateRange);
  const [search, setSearch] = useState(currentSearch);

  // Modal state
  const [selectedReport, setSelectedReport] = useState<CrimeReport | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [investigationNotes, setInvestigationNotes] = useState("");
  const [viewingReport, setViewingReport] = useState<CrimeReport | null>(null);

  // Loading / feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const navigate = useCallback((overrides: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const merged = {
      crimeType: crimeType,
      status: status,
      dateRange: dateRange,
      search: search,
      page: String(currentPage),
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    };
    Object.entries(merged).forEach(([k, v]) => { if (v && v !== "") params.set(k, String(v)); });
    startTransition(() => router.push(`/process-reports?${params.toString()}`));
  }, [crimeType, status, dateRange, search, currentPage, router]);

  const showToast = (message: string, ok: boolean) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 4500);
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport || !newStatus) return;
    setActionLoading(true);
    try {
      // Updated to use the correct API path
      const res = await fetch("/api/update-crime-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedReport.id,
          status: newStatus,
          notes: investigationNotes,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Update failed — server returned status ${res.status}. The API route may be missing or the server needs a restart.`);
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");

      showToast(`✅ Report #${selectedReport.id.slice(0, 8)} updated to "${newStatus}"`, true);
      setSelectedReport(null);
      setNewStatus("");
      setInvestigationNotes("");
      startTransition(() => router.refresh());
    } catch (err: any) {
      console.error("Update error:", err);
      showToast(`❌ ${err.message ?? "Something went wrong"}`, false);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return option?.color || "bg-slate-500/20 text-slate-400 border-slate-500/40";
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getCrimeTypeLabel = (type: string) => {
    const found = CRIME_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const pageButtons = (() => {
    const range: (number | "...")[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    if (start > 1) { range.push(1); if (start > 2) range.push("..."); }
    for (let i = start; i <= end; i++) range.push(i);
    if (end < totalPages) { if (end < totalPages - 1) range.push("..."); range.push(totalPages); }
    return range;
  })();

  const startRecord = totalRecords > 0 ? (currentPage - 1) * 10 + 1 : 0;
  const endRecord = Math.min(currentPage * 10, totalRecords);

  return (
    <>
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6
                         bg-gradient-to-r from-blue-800 to-blue-900 p-6 rounded-2xl border-b-4 border-blue-500 shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">📁 Process Crime Reports</h1>
          <p className="text-sm text-blue-200 mt-1">Review, investigate, and manage crime reports</p>
        </div>
        <div className="flex items-center gap-4 text-blue-100 text-sm font-medium">
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </div>
          <span>{officerName}</span>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] max-w-sm px-4 py-3 rounded-xl text-sm border-2 shadow-2xl flex items-center gap-2 font-medium ${
          toast.ok
            ? "bg-emerald-900/95 border-emerald-500 text-emerald-200"
            : "bg-red-900/95 border-red-500 text-red-200"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Today", value: stats.totalToday, color: "text-blue-400" },
          { label: "Active Cases", value: stats.active, color: "text-red-400" },
          { label: "Investigating", value: stats.underInvestigation, color: "text-amber-400" },
          { label: "Dispatched", value: stats.dispatched, color: "text-emerald-400" },
          { label: "Resolved", value: stats.resolved, color: "text-slate-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gradient-to-br from-slate-800 to-slate-900 border-t-4 border-blue-600 rounded-2xl p-4 shadow-lg text-center">
            <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
            <div className="text-slate-400 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-t-4 border-blue-600 rounded-2xl p-6 shadow-lg mb-6">
        <h3 className="text-lg font-bold text-blue-400 mb-5 flex items-center gap-2">🔍 Filters & Search</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Crime Type</label>
            <select
              value={crimeType}
              onChange={(e) => { setCrimeType(e.target.value); navigate({ crimeType: e.target.value, page: 1 }); }}
              className="bg-slate-900/80 border-2 border-blue-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
            >
              {CRIME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); navigate({ status: e.target.value, page: 1 }); }}
              className="bg-slate-900/80 border-2 border-blue-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); navigate({ dateRange: e.target.value, page: 1 }); }}
              className="bg-slate-900/80 border-2 border-blue-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
            >
              {DATE_RANGES.map(d => <option key={d} value={d}>{d === "All" ? "All Time" : d}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Search</label>
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") navigate({ search: search, page: 1 }); }}
              onBlur={() => navigate({ search: search, page: 1 })}
              className="bg-slate-900/80 border-2 border-blue-700 text-white placeholder-slate-500 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => startTransition(() => router.refresh())}
            className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold border border-blue-600 transition flex items-center gap-2"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-t-4 border-blue-600 rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">📋 Reports</h3>
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
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-slate-300 font-semibold">No reports match the current filters.</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting filters or changing the date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-900 to-blue-950 text-blue-300 uppercase text-xs tracking-widest">
                  <th className="px-4 py-3 text-left font-bold">Type</th>
                  <th className="px-4 py-3 text-left font-bold">Status</th>
                  <th className="px-4 py-3 text-left font-bold">Time</th>
                  <th className="px-4 py-3 text-left font-bold">Location</th>
                  <th className="px-4 py-3 text-left font-bold">Description</th>
                  <th className="px-4 py-3 text-left font-bold">Reporter</th>
                  <th className="px-4 py-3 text-left font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {reports.map((report) => {
                  const reporterName = report.isAnonymous
                    ? "Anonymous"
                    : report.fullName || `${report.user?.firstName || ""} ${report.user?.lastName || ""}`.trim() || "Unknown";
                  const contactInfo = report.isAnonymous ? "" : report.contactInfo || report.user?.email || "";

                  return (
                    <tr key={report.id} className="bg-slate-800/40 hover:bg-slate-800 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{getCrimeTypeLabel(report.typeOfIncident)}</div>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${priorityBadge[report.priority] || ""}`}>
                          {report.priority}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-xs">
                        {formatTimeAgo(report.createdAt)}
                      </td>

                      <td className="px-4 py-3 max-w-[150px]">
                        <div className="text-slate-300 truncate">{report.location}</div>
                      </td>

                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="text-slate-300 truncate">{report.description}</div>
                        <button
                          onClick={() => setViewingReport(report)}
                          className="text-blue-400 hover:text-blue-300 text-xs mt-1"
                        >
                          View Full Details
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-slate-300">{reporterName}</div>
                        {contactInfo && (
                          <div className="text-slate-500 text-xs">{contactInfo}</div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setNewStatus(report.status);
                            setInvestigationNotes("");
                          }}
                          className="text-xs bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold border border-blue-600 transition flex items-center gap-1"
                        >
                          📝 Update
                        </button>
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

      {/* Update Status Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-600 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-blue-400 text-center mb-6">Update Report Status</h2>
            <p className="text-slate-400 text-xs text-center mb-4">
              Report #{selectedReport.id.slice(0, 8)} — {getCrimeTypeLabel(selectedReport.typeOfIncident)}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-900/80 border-2 border-blue-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Investigation Notes
                </label>
                <textarea
                  value={investigationNotes}
                  onChange={(e) => setInvestigationNotes(e.target.value)}
                  placeholder="Add investigation notes, findings, actions taken..."
                  className="w-full bg-slate-900/80 border-2 border-blue-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition resize-y min-h-[100px]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdateStatus}
                  disabled={actionLoading}
                  className="flex-1 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {actionLoading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : "Update Report"}
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-xl font-semibold border border-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Report Details Modal */}
      {viewingReport && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewingReport(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-600 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-blue-400">Report Details</h2>
              <button
                onClick={() => setViewingReport(null)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400">Report ID</span>
                  <div className="text-white font-semibold">#{viewingReport.id.slice(0, 8)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Crime Type</span>
                  <div className="text-white font-semibold">{getCrimeTypeLabel(viewingReport.typeOfIncident)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Priority</span>
                  <div className={`font-semibold ${priorityBadge[viewingReport.priority] || "text-white"}`}>
                    {viewingReport.priority}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Status</span>
                  <div className={`font-semibold ${getStatusColor(viewingReport.status)}`}>
                    {viewingReport.status}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-400">Location</span>
                <div className="text-white">{viewingReport.location}</div>
              </div>

              <div>
                <span className="text-slate-400">Incident Date/Time</span>
                <div className="text-white">{new Date(viewingReport.incidentDateTime).toLocaleString()}</div>
              </div>

              <div>
                <span className="text-slate-400">Description</span>
                <div className="text-white bg-slate-900/50 p-3 rounded-lg">{viewingReport.description}</div>
              </div>

              {viewingReport.witnesses && (
                <div>
                  <span className="text-slate-400">Witnesses</span>
                  <div className="text-white">{viewingReport.witnesses}</div>
                </div>
              )}

              {viewingReport.additionalInformation && (
                <div>
                  <span className="text-slate-400">Additional Information</span>
                  <div className="text-white bg-slate-900/50 p-3 rounded-lg">{viewingReport.additionalInformation}</div>
                </div>
              )}

              {viewingReport.evidenceUrl && (
                <div>
                  <span className="text-slate-400">Evidence</span>
                  <div>
                    <a
                      href={viewingReport.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      View Evidence 📎
                    </a>
                  </div>
                </div>
              )}

              <div>
                <span className="text-slate-400">Reporter</span>
                <div className="text-white">
                  {viewingReport.isAnonymous
                    ? "Anonymous"
                    : viewingReport.fullName || `${viewingReport.user?.firstName || ""} ${viewingReport.user?.lastName || ""}`.trim() || "Unknown"}
                </div>
                {viewingReport.contactInfo && (
                  <div className="text-slate-400 text-xs">{viewingReport.contactInfo}</div>
                )}
              </div>

              <div>
                <span className="text-slate-400">Reported</span>
                <div className="text-white">{new Date(viewingReport.createdAt).toLocaleString()}</div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setSelectedReport(viewingReport);
                    setNewStatus(viewingReport.status);
                    setInvestigationNotes("");
                    setViewingReport(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 rounded-xl font-semibold transition"
                >
                  📝 Update Status
                </button>
                <button
                  onClick={() => setViewingReport(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl font-semibold border border-slate-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}