import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { generateBarcodeSheetPdf, type BarcodeSheetItem } from "@/lib/barcodeSheet";

// Always regenerate from the live catalog — never cached.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // rendering ~200+ barcodes can take a little while

export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("items")
    .select("code, name, program, new_price, used_price, manual_price")
    .eq("active", true)
    .order("program")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No active items to print" }, { status: 404 });
  }

  const items: BarcodeSheetItem[] = data.map((r) => ({
    code: r.code,
    name: r.name,
    program: r.program,
    newPrice: r.new_price,
    usedPrice: r.used_price,
    manualPrice: r.manual_price,
  }));

  const pdfBytes = await generateBarcodeSheetPdf(items);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="donation_barcode_sheet.pdf"`,
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
