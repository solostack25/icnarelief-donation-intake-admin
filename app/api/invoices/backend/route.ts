import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { buildBackendInvoices } from "@/lib/invoices";
import { renderBackendInvoicesPdf } from "@/lib/renderInvoicePdf";
import type { DonationRow } from "@/lib/fetchSessions";

// Same as the donor route — must never be cached, always reflect the
// current donations for this session.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const programFilter = searchParams.get("program"); // optional — download just this one program's invoice
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

  let invoices = buildBackendInvoices(session, donor ?? null, (donations ?? []) as DonationRow[]);
  if (programFilter) {
    invoices = invoices.filter((inv) => inv.program === programFilter);
  }
  if (invoices.length === 0) {
    return NextResponse.json({ error: "No donation lines for this session/program" }, { status: 404 });
  }

  const pdfBytes = await renderBackendInvoicesPdf(invoices);
  const filenameBase = programFilter ? invoices[0].invoiceNumber : session.invoice_id ?? session.id.slice(0, 8);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filenameBase}-backend.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
