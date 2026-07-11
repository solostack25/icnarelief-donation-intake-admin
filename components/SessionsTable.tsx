"use client";

import { useState } from "react";
import type { DashboardSession } from "@/lib/fetchSessions";

export default function SessionsTable({
  sessions,
  onSynced,
}: {
  sessions: DashboardSession[];
  onSynced: (sessionId: string) => void;
}) {
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [errorForId, setErrorForId] = useState<Record<string, string>>({});

  async function pushToSalesforce(sessionId: string) {
    setPushingId(sessionId);
    setErrorForId((prev) => ({ ...prev, [sessionId]: "" }));
    try {
      const res = await fetch("/api/salesforce/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const result = await res.json();
      if (result.success) {
        onSynced(sessionId);
      } else {
        setErrorForId((prev) => ({ ...prev, [sessionId]: result.error ?? "Push failed" }));
      }
    } catch (err: any) {
      setErrorForId((prev) => ({ ...prev, [sessionId]: err.message ?? "Push failed" }));
    } finally {
      setPushingId(null);
    }
  }

  if (sessions.length === 0) {
    return <p className="text-gray-400 text-sm py-8 text-center">No completed donations in this period yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="p-3">Invoice #</th>
            <th className="p-3">Time</th>
            <th className="p-3">Donor</th>
            <th className="p-3">Office / Program</th>
            <th className="p-3">Items</th>
            <th className="p-3">Salesforce</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sessions.map((s) => (
            <tr key={s.id}>
              <td className="p-3 whitespace-nowrap font-mono text-xs text-brand-dark font-semibold">
                {s.invoice_id ?? "—"}
              </td>
              <td className="p-3 whitespace-nowrap">
                {s.completed_at ? new Date(s.completed_at).toLocaleString() : "—"}
              </td>
              <td className="p-3">
                {s.donor?.name || s.donor_org_name || <span className="text-gray-400">Anonymous</span>}
              </td>
              <td className="p-3 text-gray-500">
                {s.office ?? "—"} {s.program ? `· ${s.program}` : ""}
              </td>
              <td className="p-3 font-semibold">{s.totalItems}</td>
              <td className="p-3">
                {s.synced_to_salesforce ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-brand-light text-brand-dark font-medium">
                    Synced
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                    Not synced
                  </span>
                )}
              </td>
              <td className="p-3">
                {!s.synced_to_salesforce && (
                  <button
                    onClick={() => pushToSalesforce(s.id)}
                    disabled={pushingId === s.id}
                    className="text-xs rounded-lg bg-brand px-3 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    {pushingId === s.id ? "Pushing..." : "Push to Salesforce"}
                  </button>
                )}
                {errorForId[s.id] && (
                  <p className="text-xs text-red-600 mt-1 max-w-xs">{errorForId[s.id]}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
