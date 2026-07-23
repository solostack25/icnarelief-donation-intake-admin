import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { invoiceDisclaimer, emailSubject, emailBody } = body;

  const updates: Record<string, unknown> = {};
  if (invoiceDisclaimer !== undefined) updates.invoice_disclaimer = invoiceDisclaimer;
  if (emailSubject !== undefined) updates.email_subject = emailSubject;
  if (emailBody !== undefined) updates.email_body = emailBody;

  const admin = createAdminClient();
  const { data, error } = await admin.from("settings").update(updates).eq("id", "global").select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, settings: data });
}
