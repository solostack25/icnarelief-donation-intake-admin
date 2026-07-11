"use client";

import { useEffect, useState } from "react";
import {
  fetchCompletedSessions,
  sumCategoryTotals,
  type DashboardSession,
} from "@/lib/fetchSessions";
import CategoryTotals from "@/components/CategoryTotals";
import SessionsTable from "@/components/SessionsTable";

export default function TodayPage() {
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const data = await fetchCompletedSessions(start, end);
    setSessions(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function markSynced(sessionId: string) {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, synced_to_salesforce: true } : s))
    );
  }

  const totals = sumCategoryTotals(sessions);
  const totalItems = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Today</h1>
          <p className="text-gray-500 text-sm">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            {" · "}
            {sessions.length} donation{sessions.length === 1 ? "" : "s"} · {totalItems} items
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <>
          <CategoryTotals totals={totals} />
          <SessionsTable sessions={sessions} onSynced={markSynced} />
        </>
      )}
    </main>
  );
}
