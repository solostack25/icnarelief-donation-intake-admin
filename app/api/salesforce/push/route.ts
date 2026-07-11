import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { pushSessionToSalesforce } from "@/lib/salesforce";

export async function POST(req: Request) {
  const { sessionId } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const [{ data: session, error: sessionError }, { data: donor }, { data: donations }] =
    await Promise.all([
      supabase.from("sessions").select("*").eq("id", sessionId).single(),
      supabase.from("donors").select("*").eq("session_id", sessionId).maybeSingle(),
      supabase.from("donations").select("category, qty").eq("session_id", sessionId),
    ]);

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message ?? "Session not found" }, { status: 404 });
  }

  const result = await pushSessionToSalesforce(session, donor ?? null, donations ?? []);

  if (result.success) {
    await supabase
      .from("sessions")
      .update({
        synced_to_salesforce: true,
        salesforce_record_id: result.salesforceId ?? null,
        synced_at: new Date().toISOString(),
        sync_error: result.error ?? null, // partial-success line-item warnings, if any
      })
      .eq("id", sessionId);
  } else {
    await supabase
      .from("sessions")
      .update({ sync_error: result.error ?? "Unknown error" })
      .eq("id", sessionId);
  }

  return NextResponse.json(result);
}
