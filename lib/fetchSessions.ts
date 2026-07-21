import { createClient } from "./supabaseClient";
import { programsInUse } from "./programs";
import { ITEMS } from "./items";

export type DonationRow = {
  item_code: string;
  item_name: string;
  condition: "new" | "used" | "na";
  program: string;
  program_code: string;
  unit_price: number;
  is_manual_price: boolean;
  qty: number;
};

export type DashboardSession = {
  id: string;
  invoice_id: string | null;
  completed_at: string | null;
  office: string | null;
  donor_kind: string | null;
  donor_org_name: string | null;
  synced_to_salesforce: boolean;
  sync_error: string | null;
  donor: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  donations: DonationRow[];
  programs: string[]; // unique programs touched in this session
  totalItems: number;
  totalValue: number;
};

// unit_price is a per-unit price for fixed items (line total = unit_price *
// qty) but a running TOTAL for manual-price items (line total = unit_price).
// See supabase/schema.sql in the intake app for the full explanation.
export function lineTotal(row: DonationRow): number {
  return row.is_manual_price ? row.unit_price : row.unit_price * row.qty;
}

export async function fetchCompletedSessions(
  start: Date,
  end: Date
): Promise<DashboardSession[]> {
  const supabase = createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, invoice_id, completed_at, office, donor_kind, donor_org_name, synced_to_salesforce, sync_error"
    )
    .eq("status", "completed")
    .gte("completed_at", start.toISOString())
    .lt("completed_at", end.toISOString())
    .order("completed_at", { ascending: false });

  if (!sessions || sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);

  const [{ data: donations }, { data: donors }] = await Promise.all([
    supabase
      .from("donations")
      .select("session_id, item_code, item_name, condition, program, program_code, unit_price, is_manual_price, qty")
      .in("session_id", ids),
    supabase.from("donors").select("session_id, name, email, phone").in("session_id", ids),
  ]);

  return sessions.map((s) => {
    const rows = (donations ?? []).filter((d) => d.session_id === s.id) as (DonationRow & {
      session_id: string;
    })[];
    const totalItems = rows.reduce((a, r) => a + r.qty, 0);
    const totalValue = rows.reduce((a, r) => a + lineTotal(r), 0);
    const programs = Array.from(new Set(rows.map((r) => r.program)));
    const donor = donors?.find((d) => d.session_id === s.id) ?? null;

    return { ...s, donor, donations: rows, programs, totalItems, totalValue };
  });
}

export type ProgramTotal = { items: number; value: number };

const ALL_PROGRAMS = programsInUse(ITEMS.map((i) => i.program));

export function emptyProgramTotals(): Record<string, ProgramTotal> {
  const t: Record<string, ProgramTotal> = {};
  ALL_PROGRAMS.forEach((p) => (t[p.name] = { items: 0, value: 0 }));
  return t;
}

export function sumProgramTotals(sessions: DashboardSession[]): Record<string, ProgramTotal> {
  const totals = emptyProgramTotals();
  sessions.forEach((s) => {
    s.donations.forEach((d) => {
      if (!totals[d.program]) totals[d.program] = { items: 0, value: 0 };
      totals[d.program].items += d.qty;
      totals[d.program].value += lineTotal(d);
    });
  });
  return totals;
}
