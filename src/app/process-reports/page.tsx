// src/app/process-reports/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProcessReportsClient from "./processreportsclient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export type CrimeReport = {
  id: string;
  userId: string | null;
  isAnonymous: boolean;
  fullName: string | null;
  contactInfo: string | null;
  location: string;
  incidentDateTime: string;
  typeOfIncident: string;
  priority: string;
  description: string;
  witnesses: string | null;
  additionalInformation: string | null;
  evidenceUrl: string | null;
  status: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export type ReportStats = {
  totalToday: number;
  active: number;
  underInvestigation: number;
  dispatched: number;
  resolved: number;
  crimeTypeDistribution: Record<string, number>;
};

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

export default async function ProcessReportsPage({
  searchParams,
}: {
  // searchParams is a Promise in current Next.js — must be awaited.
  // This was the bug: filters were silently ignored without this.
  searchParams: Promise<{
    crimeType?: string;
    status?: string;
    dateRange?: string;
    search?: string;
    page?: string;
  }>;
}) {
  // Auth guard
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

  // Read params (the fix: await the Promise)
  const params = await searchParams;

  const crimeTypeFilter = params.crimeType ?? "";
  const statusFilter = params.status ?? "";
  const dateRange = params.dateRange ?? "Today";
  const searchTerm = params.search?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 10;

  // ── Stats Query ──
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: statsData } = await supabase
    .from("crime_reports")
    .select("status, type_of_incident")
    .gte("created_at", `${todayStr}T00:00:00`)
    .lte("created_at", `${todayStr}T23:59:59`);

  const stats: ReportStats = {
    totalToday: statsData?.length ?? 0,
    active: statsData?.filter(r => r.status !== "Resolved").length ?? 0,
    underInvestigation: statsData?.filter(r => r.status === "Under Investigation").length ?? 0,
    dispatched: statsData?.filter(r => r.status === "Dispatched").length ?? 0,
    resolved: statsData?.filter(r => r.status === "Resolved").length ?? 0,
    crimeTypeDistribution: {},
  };

  // ── Main Query ──
  let query = supabase
    .from("crime_reports")
    .select(`
      *,
      users!left (
        first_name,
        last_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (crimeTypeFilter && crimeTypeFilter !== "") {
    query = query.eq("type_of_incident", crimeTypeFilter);
  }

  if (statusFilter && statusFilter !== "") {
    query = query.eq("status", statusFilter);
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

  const { data: allReports, error } = await query;

  if (error) {
    console.error("Supabase error:", error);
  }

  // Transform reports
  const transformedReports = (allReports ?? []).map((report: any) => ({
    ...report,
    user: report.users ? {
      firstName: report.users.first_name,
      lastName: report.users.last_name,
      email: report.users.email,
    } : null,
  })) as CrimeReport[];

  // Search filter
  const filtered = transformedReports.filter((report) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const name = report.isAnonymous
      ? "anonymous"
      : `${report.fullName ?? ""} ${report.user?.firstName ?? ""} ${report.user?.lastName ?? ""}`.toLowerCase();
    const location = (report.location ?? "").toLowerCase();
    const description = (report.description ?? "").toLowerCase();
    return name.includes(searchLower) || location.includes(searchLower) || description.includes(searchLower);
  });

  // Pagination
  const totalRecords = filtered.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const start = (page - 1) * pageSize;
  const pagedReports = filtered.slice(start, start + pageSize);

  return (
    <div className="flex min-h-screen bg-[#0d1527] text-slate-100">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-800 border-r border-slate-700 p-6 flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg text-white font-bold shadow-md shadow-blue-900/40">🛡️</div>
            <span className="text-xl font-bold text-white tracking-tight">Crime Alert</span>
          </div>
          <nav className="space-y-1.5">
            <Link
              href="/law-enforcement-dashboard"
              className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              <span>📊</span>
              <span className="font-medium">Command Dashboard</span>
            </Link>
            <Link
              href="/emergencyresponsepage"
              className="flex items-center space-x-3 p-2.5 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              <span>🚨</span>
              <span className="font-medium">Emergency Response</span>
            </Link>
            <Link
              href="/process-reports"
              className="flex items-center space-x-3 p-2.5 bg-blue-600/20 text-blue-400 rounded-lg font-semibold border-l-4 border-blue-500"
            >
              <span>📁</span>
              <span>Process Reports</span>
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
            className="block text-center w-full bg-blue-700 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium border border-blue-600 transition shadow-md shadow-blue-900/30"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <ProcessReportsClient
          reports={pagedReports}
          stats={stats}
          totalRecords={totalRecords}
          totalPages={totalPages}
          currentPage={page}
          currentCrimeType={crimeTypeFilter}
          currentStatus={statusFilter}
          currentDateRange={dateRange}
          currentSearch={searchTerm}
          officerName={session.user.name ?? "Officer"}
        />
      </main>
    </div>
  );
}