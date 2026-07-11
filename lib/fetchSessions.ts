import { createClient } from "./supabaseClient";
import { CATEGORIES } from "./categories";

export type DashboardSession = {
  id: string;
  invoice_id: string | null;
  completed_at: string | null;
  office: string | null;
  program: string | null;
  donor_kind: string | null;
  donor_org_name: string | null;
  synced_to_salesforce: boolean;
  sync_error: string | null;
  donor: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  categoryTally: Record<string, number>;
  totalItems: number;
};

export async function fetchCompletedSessions(
  start: Date,
  end: Date
): Promise<DashboardSession[]> {
  const supabase = createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, invoice_id, completed_at, office, program, donor_kind, donor_org_name, synced_to_salesforce, sync_error"
    )
    .eq("status", "completed")
    .gte("completed_at", start.toISOString())
    .lt("completed_at", end.toISOString())
    .order("completed_at", { ascending: false });

  if (!sessions || sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);

  const [{ data: donations }, { data: donors }] = await Promise.all([
    supabase.from("donations").select("session_id, category, qty").in("session_id", ids),
    supabase.from("donors").select("session_id, name, email, phone").in("session_id", ids),
  ]);

  return sessions.map((s) => {
    const categoryTally: Record<string, number> = {};
    let totalItems = 0;
    donations
      ?.filter((d) => d.session_id === s.id)
      .forEach((d) => {
        categoryTally[d.category] = d.qty;
        totalItems += d.qty;
      });
    const donor = donors?.find((d) => d.session_id === s.id) ?? null;

    return { ...s, donor, categoryTally, totalItems };
  });
}

export function emptyCategoryTotals(): Record<string, number> {
  const t: Record<string, number> = {};
  CATEGORIES.forEach((c) => (t[c.code] = 0));
  return t;
}

export function sumCategoryTotals(sessions: DashboardSession[]): Record<string, number> {
  const totals = emptyCategoryTotals();
  sessions.forEach((s) => {
    Object.entries(s.categoryTally).forEach(([code, qty]) => {
      totals[code] = (totals[code] ?? 0) + qty;
    });
  });
  return totals;
}
