// The full 212-item InKind price list — same data/items.json as the
// intake app (donation-intake). Keep these two files in sync; this is
// the read-only side (admin dashboard doesn't scan items, just needs
// the price/program lookups for display + invoice generation).

import itemsData from "@/data/items.json";

export type InventoryItem = {
  code: string;
  name: string;
  program: string;
  programCode: string;
  newPrice: number | null;
  usedPrice: number | null;
  manualPrice: boolean;
};

export const ITEMS: InventoryItem[] = itemsData;

export function findItem(code: string): InventoryItem | undefined {
  return ITEMS.find((i) => i.code === code);
}
