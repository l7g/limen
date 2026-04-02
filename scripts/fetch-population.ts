/**
 * Fetch national population from ISTAT SDMX API.
 *
 * Dataflow: 22_289_DF_DCIS_POPRES1_24 v1.0 (Popolazione residente per comune)
 * Key: A..JAN.9.TOTAL.99
 *   A       = Annual frequency
 *   (empty) = All REF_AREA (wildcard — returns ~8000 areas)
 *   JAN     = Population at January 1st
 *   9       = Total sex
 *   TOTAL   = All ages
 *   99      = All marital statuses
 *
 * ONE API call returns all ~7,900 comuni + NUTS region/province aggregates.
 * We filter to 6-digit numeric REF_AREA codes (comuni only).
 *
 * Output: public/data/population/comuni-population.csv
 * Format: codice_comune,anno,popolazione
 *
 * Usage: npx tsx scripts/fetch-population.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fetchSdmxCsv, parseSdmxCsv } from "./lib/istat-sdmx";

const DATAFLOW = "22_289_DF_DCIS_POPRES1_24";
// Wildcard REF_AREA (empty between dots) fetches all ~8000 areas in one call
const KEY = "A..JAN.9.TOTAL.99";

const OUTPUT_DIR = resolve(process.cwd(), "public/data/population");
const OUTPUT_FILE = join(OUTPUT_DIR, "comuni-population.csv");

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Fetching national population from ISTAT SDMX API...");
  console.log(`  Dataflow: ${DATAFLOW}`);
  console.log(`  Key: ${KEY}`);

  const csv = await fetchSdmxCsv({
    dataflowId: DATAFLOW,
    key: KEY,
    startPeriod: "2025",
  });

  const rows = parseSdmxCsv(csv);
  console.log(`Received ${rows.length} total rows`);

  // Filter to 6-digit numeric codes (comuni only, not NUTS region/province codes like IT, ITG2, etc.)
  const comuni = rows.filter((r) => /^\d{6}$/.test(r.REF_AREA));
  console.log(`Filtered to ${comuni.length} comuni`);

  if (comuni.length === 0) {
    console.error("No comuni found in API response. Aborting.");
    process.exit(1);
  }

  // Build output CSV — include COD_PROV for cross-scale merging
  const header = "codice_comune,COD_PROV,anno,popolazione";
  const lines = comuni
    .map(
      (r) =>
        `${r.REF_AREA},${r.REF_AREA.slice(0, 3)},${r.TIME_PERIOD},${r.OBS_VALUE}`,
    )
    .sort();

  const output = [header, ...lines].join("\n");
  writeFileSync(OUTPUT_FILE, output, "utf-8");

  // Summary stats
  const totalPop = comuni.reduce(
    (sum, r) => sum + (parseInt(r.OBS_VALUE, 10) || 0),
    0,
  );
  const years = [...new Set(comuni.map((r) => r.TIME_PERIOD))];

  console.log(`\n✓ Wrote ${comuni.length} comuni to comuni-population.csv`);
  console.log(`  Year(s): ${years.join(", ")}`);
  console.log(`  Total population: ${totalPop.toLocaleString("it-IT")}`);
  console.log(`  File size: ${(output.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
