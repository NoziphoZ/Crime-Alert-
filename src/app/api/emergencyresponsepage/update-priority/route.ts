// src/app/api/law-enforcement/update-priority/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

const VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!userData || (userData.role !== "Law Enforcement" && userData.role !== "law_enforcement")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { alertId, priority } = await req.json();

    if (!alertId) {
      return NextResponse.json({ error: "Alert ID is required" }, { status: 400 });
    }

    if (!priority || !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("emergency_alerts")
      .update({ 
        priority: priority,
        updated_at: new Date().toISOString()
      })
      .eq("id", alertId)
      .select();

    if (error) {
      console.error("Supabase update error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Priority updated to ${priority}`,
      data: data[0]
    });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}