import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const VALID_STATUSES = ["Received", "Location Verified", "Unit Dispatched", "Unit Arrived", "Case Resolved"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "law_enforcement") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { alertId, status } = await req.json() as { alertId?: string; status?: string };

  if (!alertId || !status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid alertId or status" }, { status: 400 });
  }

  const { error } = await supabase
    .from("EmergencyAlerts")
    .update({ Status: status })
    .eq("AlertID", alertId);

  if (error) {
    console.error("Supabase update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}