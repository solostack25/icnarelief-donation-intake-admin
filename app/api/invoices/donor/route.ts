import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { buildDonorInvoice } from "@/lib/invoices";
import { renderDonorInvoicePdf } from "@/lib/renderInvoicePdf";
import type { DonationRow } from "@/lib/fetchSessions";

// This must never be cached/statically rendered — it has to reflect
// whatever's in the donations table at the moment it's requested, not
// whatever was there the first time this URL was hit.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const [{ data: session, error: sessionError }, { data: donor }, { data: donations }] =
    await Promise.all([
      supabase.from("sessions").select("*").eq("id", sessionId).single(),
      supabase.from("donors").select("*").eq("session_id", sessionId).maybeSingle(),
      supabase
        .from("donations")
        .select("item_code, item_name, condition, program, program_code, unit_price, is_manual_price, qty")
        .eq("session_id", sessionId),
    ]);

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message ?? "Session not found" }, { status: 404 });
  }

  const data = buildDonorInvoice(session, donor ?? null, (donations ?? []) as DonationRow[]);
  const pdfBytes = await renderDonorInvoicePdf(data);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.invoiceNumber}-donor.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
