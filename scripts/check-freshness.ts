/**
 * Check freshness status of all datasets in the catalog.
 *
 * Prints a table + optional JSON output for CI/CD monitoring.
 * Used by the check-freshness.yml GitHub Actions workflow.
 *
 * Flags:
 *   --json     Write freshness-report.json to data/ for machine consumption
 *   --strict   Exit 1 if any dataset is stale or error (for CI gating)
 *
 * Usage:
 *   npx tsx scripts/check-freshness.ts
 *   npx tsx scripts/check-freshness.ts --json --strict
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { datasets } from "../lib/datasets/catalog";
import {
  computeStatus,
  daysUntilUpdate,
  daysSinceUpdate,
} from "../lib/datasets/freshness";

const now = new Date();
const jsonFlag = process.argv.includes("--json");
const strictFlag = process.argv.includes("--strict");

console.log(`Dataset Freshness Report — ${now.toISOString().split("T")[0]}`);
console.log("=".repeat(80));

const rows = datasets.map((d) => {
  const status = computeStatus(d, now);
  const age = daysSinceUpdate(d, now);
  const until = daysUntilUpdate(d, now);

  return {
    id: d.id,
    name: d.name,
    tier: d.tier,
    status,
    ageDays: age,
    untilDays: until,
    coverage: d.coverage,
    cadence: d.cadence,
    lastUpdated: d.lastUpdated,
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
    `${pad(r.status.toUpperCase(), 10)} ${pad(r.name, 42)} ${pad(`${r.ageDays}d ago`, 10)} ${pad(r.untilDays !== null ? `${r.untilDays}d` : "—", 8)} ${pad(r.coverage, 10)}`,
  );
}

// Summary
const counts = { current: 0, expiring: 0, stale: 0, error: 0 };
for (const r of rows) {
  const key = r.status as keyof typeof counts;
  if (key in counts) counts[key]++;
}

console.log("\n" + "=".repeat(80));
console.log(
  `Summary: ${counts.current} current, ${counts.expiring} expiring, ${counts.stale} stale, ${counts.error} error`,
);
console.log(`Total: ${rows.length} datasets`);

// JSON output for CI (machine-readable)
if (jsonFlag) {
  const report = {
    generatedAt: now.toISOString(),
    summary: counts,
    total: rows.length,
    datasets: rows,
  };
  const outPath = resolve(process.cwd(), "data/freshness-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n→ JSON report written to ${outPath}`);
}

// Strict mode: exit 1 if stale or error (used by CI to gate deployments)
if (strictFlag && (counts.stale > 0 || counts.error > 0)) {
  const problems = rows.filter(
    (r) => r.status === "stale" || r.status === "error",
  );
  console.log(`\n✗ STRICT: ${problems.length} dataset(s) need attention:`);
  for (const p of problems) {
    console.log(`  - ${p.name} (${p.status}, ${p.ageDays}d old)`);
  }
  process.exit(1);
}
