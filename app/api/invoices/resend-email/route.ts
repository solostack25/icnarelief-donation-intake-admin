import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

// Resends the donor receipt email — reuses the intake app's own
// /api/send-donor-email endpoint (same PDF-building + settings-driven
// template logic) rather than duplicating Resend/PDF code here. Just
// forwards the request server-side once we've confirmed the caller is
// a logged-in admin.
//
// Wrapped in a top-level try/catch so this ALWAYS returns valid JSON
// with a useful message, even if something upstream throws — an empty
// or non-JSON response here just shows up on the frontend as a cryptic
// "Unexpected end of JSON input," which isn't actionable.
export async function POST(req: Request) {
  try {
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
        { error: "INTAKE_APP_URL is not set in this app's environment variables — see README for setup" },
        { status: 500 }
      );
    }

    const targetUrl = `${intakeAppUrl.replace(/\/$/, "")}/api/send-donor-email`;
    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (fetchErr: any) {
      return NextResponse.json(
        { error: `Couldn't reach the intake app at ${targetUrl}: ${fetchErr.message ?? "network error"}` },
        { status: 502 }
      );
    }

    const rawBody = await res.text();
    let result: any;
    try {
      result = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          error: `Intake app returned a non-JSON response (HTTP ${res.status}): ${rawBody.slice(0, 200) || "(empty body)"}`,
        },
        { status: 502 }
      );
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    if (result.skipped) {
      return NextResponse.json({ error: result.reason ?? "Email was skipped" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unexpected server error" }, { status: 500 });
  }
}
