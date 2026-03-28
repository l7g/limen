/**
 * Check freshness status of all datasets in the catalog.
 *
 * Prints a table of dataset statuses for CI/CD monitoring.
 * Used by the check-freshness.yml GitHub Actions workflow.
 *
 * Usage: npx tsx scripts/check-freshness.ts
 */

import { datasets } from "../lib/datasets/catalog";
import {
  computeStatus,
  daysUntilUpdate,
  daysSinceUpdate,
} from "../lib/datasets/freshness";

const now = new Date();

console.log(`Dataset Freshness Report — ${now.toISOString().split("T")[0]}`);
console.log("=".repeat(80));

const rows = datasets.map((d) => {
  const status = computeStatus(d, now);
  const age = daysSinceUpdate(d, now);
  const until = daysUntilUpdate(d, now);

  return {
    id: d.id,
    name: d.name,
    status: status.toUpperCase(),
    age: `${age}d ago`,
    until: until !== null ? `${until}d` : "—",
    coverage: d.coverage,
  };
});

// Print table
const pad = (s: string, n: number) => s.padEnd(n);

console.log(
  `${pad("STATUS", 10)} ${pad("NAME", 42)} ${pad("AGE", 10)} ${pad("UNTIL", 8)} ${pad("COVERAGE", 10)}`,
);
console.log("-".repeat(80));

for (const r of rows) {
  console.log(
    `${pad(r.status, 10)} ${pad(r.name, 42)} ${pad(r.age, 10)} ${pad(r.until, 8)} ${pad(r.coverage, 10)}`,
  );
}

// Summary
const counts = { current: 0, expiring: 0, stale: 0, error: 0 };
for (const r of rows) {
  const key = r.status.toLowerCase() as keyof typeof counts;
  if (key in counts) counts[key]++;
}

console.log("\n" + "=".repeat(80));
console.log(
  `Summary: ${counts.current} current, ${counts.expiring} expiring, ${counts.stale} stale, ${counts.error} error`,
);
console.log(`Total: ${rows.length} datasets`);
