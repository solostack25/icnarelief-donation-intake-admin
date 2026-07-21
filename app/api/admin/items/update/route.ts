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
  const { id, name, program, programCode, manualPrice, requiresNote, newPrice, usedPrice, active } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (program !== undefined) updates.program = program;
  if (programCode !== undefined) updates.program_code = programCode;
  if (manualPrice !== undefined) updates.manual_price = !!manualPrice;
  if (requiresNote !== undefined) updates.requires_note = !!requiresNote;
  if (newPrice !== undefined) updates.new_price = manualPrice ? null : newPrice;
  if (usedPrice !== undefined) updates.used_price = manualPrice ? null : usedPrice;
  if (active !== undefined) updates.active = !!active;

  const admin = createAdminClient();
  const { data, error } = await admin.from("items").update(updates).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, item: data });
}
