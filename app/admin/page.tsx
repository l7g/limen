import { datasets } from "@/lib/datasets/catalog";
import {
  computeStatus,
  daysSinceUpdate,
  daysUntilUpdate,
} from "@/lib/datasets/freshness";
import FreshnessBadge from "@/components/data/FreshnessBadge";

export default function AdminPage() {
  const enriched = datasets.map((d) => ({
    ...d,
    computedStatus: computeStatus(d),
    age: daysSinceUpdate(d),
    untilNext: daysUntilUpdate(d),
  }));

  const staleCount = enriched.filter(
    (d) => d.computedStatus === "stale" || d.computedStatus === "error",
  ).length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-heading text-2xl font-bold text-gray-900">
        Admin — Freshness Dashboard
      </h1>
      <p className="mt-1 text-[13px] text-gray-500">
        {enriched.length} dataset monitorati ·{" "}
        {staleCount > 0 ? (
          <span className="text-red-600 font-medium">
            {staleCount} necessitano attenzione
          </span>
        ) : (
          <span className="text-emerald-600 font-medium">Tutti aggiornati</span>
        )}
      </p>

      <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-4 py-2.5 font-medium text-gray-500">Dataset</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Tier</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Stato</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">
                Età (giorni)
              </th>
              <th className="px-4 py-2.5 font-medium text-gray-500">
                Prossimo agg.
              </th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Fonte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enriched.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {d.name}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{d.tier}</td>
                <td className="px-4 py-2.5">
                  <FreshnessBadge status={d.computedStatus} />
                </td>
                <td className="px-4 py-2.5 text-gray-600">{d.age}</td>
                <td className="px-4 py-2.5 text-gray-600">
                  {d.untilNext !== null
                    ? d.untilNext > 0
                      ? `${d.untilNext}g`
                      : "Scaduto"
                    : "—"}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{d.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
