import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "law_enforcement") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { alertId } = await req.json() as { alertId?: string };

  if (!alertId) {
    return NextResponse.json({ error: "Invalid alertId" }, { status: 400 });
  }

  const { error } = await supabase
    .from("emergency_alerts")
    .update({ 
      status: "Case Resolved",
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", alertId);

  if (error) {
    console.error("Supabase update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}