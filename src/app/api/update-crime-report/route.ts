// src/app/api/update-crime-report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

const VALID_STATUSES = ["Submitted", "Under Investigation", "Dispatched", "Resolved"];

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
      return NextResponse.json({ error: "Forbidden - Only law enforcement can update reports" }, { status: 403 });
    }

    const body = await req.json();
    const { reportId, status, notes } = body;

    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
      }, { status: 400 });
    }

    const { data: existingReport, error: fetchError } = await supabase
      .from("crime_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (fetchError || !existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const updateData: any = {
      status: status
    };

    if (notes && notes.trim() !== "") {
      const timestamp = new Date().toLocaleString();
      const existingNotes = existingReport.additional_information || "";
      const newNote = `\n[${timestamp}] ${notes.trim()}`;
      updateData.additional_information = existingNotes + newNote;
    }

    const { data, error } = await supabase
      .from("crime_reports")
      .update(updateData)
      .eq("id", reportId)
      .select();

    if (error) {
      console.error("Supabase update error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Report updated to ${status}`,
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