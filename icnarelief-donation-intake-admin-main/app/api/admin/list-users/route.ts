import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const users = data.users
    .map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ users });
}
