import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import EmergencyResponseClient from "../EmergencyResponseClient/page";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDateFilter(range: string): string | null {
  const now = new Date();
  switch (range) {
    case "Today":
      return now.toISOString().split("T")[0];
    case "Yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    }
    case "Last7Days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case "Last30Days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    default:
      return null;
  }
}

// Active statuses = higher priority (mirrors C# IsActive logic)
const ACTIVE_STATUSES = ["Received", "Location Verified", "Unit Dispatched"];

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function EmergencyResponsePage({
  searchParams,
}: {
  searchParams: {
    search?:    string;
    status?:    string;
    priority?:  string;
    dateRange?: string;
    pageSize?:  string;
    page?:      string;
  };
}) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session || !session.user) redirect("/login");
  if ((session.user as any).role !== "law_enforcement") redirect("/citizendashboard");

  // ── Read params ────────────────────────────────────────────────────────────
  const searchTerm  = searchParams.search?.trim()  ?? "";
  const statusFilter  = searchParams.status         ?? "";
  const priorityFilter = searchParams.priority      ?? "";
  const dateRange   = searchParams.dateRange        ?? "Today";
  const pageSize    = Math.max(1, parseInt(searchParams.pageSize ?? "25", 10));
  const page        = Math.max(1, parseInt(searchParams.page     ?? "1",  10));

  // ── Stats query (today only, always) ──────────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: statsData } = await supabase
    .from("EmergencyAlerts")
    .select("Status")
    .gte("AlertTime", `${todayStr}T00:00:00`)
    .lte("AlertTime", `${todayStr}T23:59:59`);

  const stats: Stats = {
    totalToday: statsData?.length ?? 0,
    active:     statsData?.filter(r => ACTIVE_STATUSES.includes(r.Status)).length ?? 0,
    responding: statsData?.filter(r => r.Status === "Unit Dispatched").length     ?? 0,
    resolved:   statsData?.filter(r => r.Status === "Case Resolved").length       ?? 0,
  };

  // ── Main data query ────────────────────────────────────────────────────────
  let query = supabase
    .from("EmergencyAlerts")
    .select(`
      AlertID,
      UserId,
      AlertTime,
      Location,
      Status,
      Description,
      Latitude,
      Longitude,
      IsActive,
      Users (
        FirstName,
        LastName,
        Phone
      )
    `)
    .order("AlertTime", { ascending: false });

  // Status filter
  if (statusFilter) {
    query = query.eq("Status", statusFilter);
  }

  // Priority filter (mirrors C# IsActive logic)
  if (priorityFilter === "Critical" || priorityFilter === "High") {
    query = query.in("Status", ACTIVE_STATUSES);
  } else if (priorityFilter === "Medium" || priorityFilter === "Low") {
    query = query.eq("Status", "Case Resolved");
  }

  // Date range filter
  const dateFilter = getDateFilter(dateRange);
  if (dateFilter) {
    if (dateRange === "Today") {
      query = query
        .gte("AlertTime", `${dateFilter}T00:00:00`)
        .lte("AlertTime", `${dateFilter}T23:59:59`);
    } else if (dateRange === "Yesterday") {
      query = query
        .gte("AlertTime", `${dateFilter}T00:00:00`)
        .lte("AlertTime", `${dateFilter}T23:59:59`);
    } else {
      query = query.gte("AlertTime", dateFilter);
    }
  }

  const { data: allAlerts, error } = await query;
  if (error) console.error("Supabase error:", error.message);

  // Normalize alerts: convert Users array to single object
  const normalizedAlerts = (allAlerts ?? []).map((alert: any) => ({
    ...alert,
    Users: Array.isArray(alert.Users) && alert.Users.length > 0 ? alert.Users[0] : null,
  }));

  // Search filter (server-side, after fetch — mirrors C# approach)
  const filtered = normalizedAlerts.filter((alert: any) => {
    if (!searchTerm) return true;
    const name  = `${alert.Users?.FirstName ?? ""} ${alert.Users?.LastName ?? ""}`.toLowerCase();
    const phone = (alert.Users?.Phone ?? "").toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm.toLowerCase());
  }) as Alert[];

  // Pagination
  const totalRecords = filtered.length;
  const totalPages   = Math.ceil(totalRecords / pageSize);
  const start        = (page - 1) * pageSize;
  const pagedAlerts  = filtered.slice(start, start + pageSize);

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-slate-800 border-r border-slate-700 p-6 flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg text-white font-bold">🛡️</div>
            <span className="text-xl font-bold text-white">Crime Alert</span>
          </div>
          <nav className="space-y-2">
            <Link href="/law-enforcement-dashboard"
              className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 rounded-lg transition">
              📊 Command Dashboard
            </Link>
            <Link href="/law-enforcement/respond"
              className="flex items-center space-x-3 p-2.5 bg-blue-600/20 text-blue-400 rounded-lg font-medium border-l-4 border-blue-500">
              🚨 Emergency Response
            </Link>
            <Link href="/law-enforcement/process-reports"
              className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 rounded-lg transition">
              📁 Process Reports
            </Link>
            <Link href="/law-enforcement/map"
              className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 rounded-lg transition">
              🗺️ Crime Hotspots
            </Link>
          </nav>
        </div>
        <div className="border-t border-slate-700 pt-4 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-white uppercase">
              {session.user.name?.charAt(0) ?? "O"}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-white truncate">{session.user.name ?? "Officer"}</p>
              <p className="text-xs text-slate-400 uppercase tracking-tight">Law Enforcement</p>
            </div>
          </div>
          <Link href="/law-enforcement-dashboard"
            className="block text-center w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm font-medium border border-slate-600 transition">
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 overflow-y-auto">
        <EmergencyResponseClient
          alerts={pagedAlerts}
          stats={stats}
          totalRecords={totalRecords}
          totalPages={totalPages}
          currentPage={page}
          currentSearch={searchTerm}
          currentStatus={statusFilter}
          currentPriority={priorityFilter}
          currentDateRange={dateRange}
          currentPageSize={pageSize}
          officerName={session.user.name ?? "Officer"}
        />
      </main>
    </div>
  );
}

