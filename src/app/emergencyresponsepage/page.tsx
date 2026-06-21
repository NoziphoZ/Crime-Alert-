// src/app/emergencyresponsepage/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import EmergencyResponseClient from "./emergencyresponseclient";
import Link from "next/link";

// Force this page to always run fresh — never cache stale filter results
export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

export type Alert = {
  AlertID: string;
  UserId: string;
  AlertTime: string;
  Location: string;
  Status: string;
  Priority: string;
  Latitude: number | null;
  Longitude: number | null;
  IsActive: boolean;
  Users: { FirstName: string; LastName: string; Phone: string } | null;
};

export type Stats = {
  totalToday: number;
  active: number;
  responding: number;
  resolved: number;
};

// ── Helpers (back to plain UTC date boundaries, like your original code) ───

function getDateFilter(range: string): { start: string; end?: string } | null {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (range) {
    case "Today":
      return { start: `${today}T00:00:00`, end: `${today}T23:59:59` };
    case "Yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      const date = d.toISOString().split("T")[0];
      return { start: `${date}T00:00:00`, end: `${date}T23:59:59` };
    }
    case "Last7Days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { start: d.toISOString() };
    }
    case "Last30Days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { start: d.toISOString() };
    }
    default:
      return null;
  }
}

// Active statuses for "Active" stat
const ACTIVE_STATUSES = ["Received", "Location Verified", "Unit Dispatched"];

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function EmergencyResponsePage({
  searchParams,
}: {
  // searchParams is a Promise in current Next.js — must be awaited.
  // (This was the actual bug: filters were silently ignored before.)
  searchParams: Promise<{
    search?: string;
    status?: string;
    priority?: string;
    dateRange?: string;
    pageSize?: string;
    page?: string;
  }>;
}) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!userData || (userData.role !== "Law Enforcement" && userData.role !== "law_enforcement")) {
    redirect("/citizen-dashboard");
  }

  // ── Read params (the fix: await the Promise) ────────────────────────────────
  const params = await searchParams;

  const searchTerm = params.search?.trim() ?? "";
  const statusFilter = params.status ?? "";
  const priorityFilter = params.priority ?? "";
  const dateRange = params.dateRange ?? "Today";
  const pageSize = Math.max(1, parseInt(params.pageSize ?? "25", 10));
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  // ── Stats query (today only, always) ──────────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: statsData, error: statsError } = await supabase
    .from("emergency_alerts")
    .select("status")
    .gte("created_at", `${todayStr}T00:00:00`)
    .lte("created_at", `${todayStr}T23:59:59`);

  if (statsError) {
    console.error("Stats error:", statsError);
  }

  const stats: Stats = {
    totalToday: statsData?.length ?? 0,
    active: statsData?.filter(r => ACTIVE_STATUSES.includes(r.status)).length ?? 0,
    responding: statsData?.filter(r => r.status === "Unit Dispatched").length ?? 0,
    resolved: statsData?.filter(r => r.status === "Case Resolved").length ?? 0,
  };

  // ── Main data query ────────────────────────────────────────────────────────
  let query = supabase
    .from("emergency_alerts")
    .select(`
      id,
      user_id,
      created_at,
      location,
      status,
      priority,
      latitude,
      longitude,
      is_active,
      users!left (
        first_name,
        last_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "") {
    query = query.eq("status", statusFilter);
  }

  if (priorityFilter && priorityFilter !== "") {
    query = query.eq("priority", priorityFilter);
  }

  if (dateRange && dateRange !== "All") {
    const dateFilter = getDateFilter(dateRange);
    if (dateFilter) {
      if (dateFilter.end) {
        query = query
          .gte("created_at", dateFilter.start)
          .lte("created_at", dateFilter.end);
      } else {
        query = query.gte("created_at", dateFilter.start);
      }
    }
  }

  const { data: allAlerts, error } = await query;

  if (error) {
    console.error("Supabase error:", error);
  }

  // Transform alerts to match expected format
  const transformedAlerts = (allAlerts ?? []).map((alert: any) => ({
    AlertID: alert.id,
    UserId: alert.user_id,
    AlertTime: alert.created_at,
    Location: alert.location || `${alert.latitude}, ${alert.longitude}`,
    Status: alert.status || "Received",
    Priority: alert.priority || "Medium",
    Latitude: alert.latitude ? parseFloat(alert.latitude) : null,
    Longitude: alert.longitude ? parseFloat(alert.longitude) : null,
    IsActive: alert.is_active ?? true,
    Users: alert.users ? {
      FirstName: alert.users.first_name || "Unknown",
      LastName: alert.users.last_name || "",
      Phone: alert.users.email || "Not provided",
    } : null,
  })) as Alert[];

  // Search filter (server-side, after fetch)
  const filtered = transformedAlerts.filter((alert) => {
    if (!searchTerm) return true;
    const name = `${alert.Users?.FirstName ?? ""} ${alert.Users?.LastName ?? ""}`.toLowerCase();
    const phone = (alert.Users?.Phone ?? "").toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm.toLowerCase());
  });

  // Pagination
  const totalRecords = filtered.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const start = (page - 1) * pageSize;
  const pagedAlerts = filtered.slice(start, start + pageSize);

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
            <Link
              href="/overviewdashboard"
              className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 rounded-lg transition"
            >
              🧮 Overview Dashboard
            </Link>
            <Link
              href="/law-enforcement-dashboard"
              className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 rounded-lg transition"
            >
              📊 Command Dashboard
            </Link>
            <Link
              href="/emergencyresponsepage"
              className="flex items-center space-x-3 p-2.5 bg-blue-600/20 text-blue-400 rounded-lg font-medium border-l-4 border-blue-500"
            >
              🚨 Emergency Response
            </Link>
            <Link
              href="/processreport"
              className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 rounded-lg transition"
            >
              📄 Process Report
            </Link>
            <Link
              href="/crimehotspots"
              className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 rounded-lg transition"
            >
              🔥 Crime Hotspots
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
          <Link
            href="/law-enforcement-dashboard"
            className="block text-center w-full bg-blue-700 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium border border-blue-600 transition"
          >
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