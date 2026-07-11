import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  // Must be signed in to create another user — this app treats every
  // signed-in user as a trusted admin, so gate on "is anyone logged in."
  const supabase = createServerSupabase();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no confirmation email step — they can log in immediately
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
