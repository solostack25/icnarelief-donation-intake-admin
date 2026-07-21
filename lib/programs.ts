// Program list + Salesforce/receipt codes — same data/programs.json as
// the intake app. This is the source of truth for the code appended to
// backend (per-program) invoice numbers, e.g. TXHOU-07202026-001-RCS.

import programsData from "@/data/programs.json";

export type Program = {
  name: string;
  code: string;
};

export const PROGRAMS: Program[] = programsData;

export function programCodeForName(name: string): string {
  return PROGRAMS.find((p) => p.name === name)?.code ?? "GEN";
}

// Only programs that actually have priced items (for tile ordering).
export function programsInUse(itemPrograms: string[]): Program[] {
  const set = new Set(itemPrograms);
  return PROGRAMS.filter((p) => set.has(p.name));
}
