import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

// Resends the donor receipt email — reuses the intake app's own
// /api/send-donor-email endpoint (same PDF-building + settings-driven
// template logic) rather than duplicating Resend/PDF code here. Just
// forwards the request server-side once we've confirmed the caller is
// a logged-in admin.
export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sessionId } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const intakeAppUrl = process.env.INTAKE_APP_URL;
  if (!intakeAppUrl) {
    return NextResponse.json(
      { error: "INTAKE_APP_URL is not configured — see README for setup" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${intakeAppUrl.replace(/\/$/, "")}/api/send-donor-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const result = await res.json();

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    if (result.skipped) {
      return NextResponse.json({ error: result.reason ?? "Email was skipped" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to reach the intake app" }, { status: 500 });
  }
}
