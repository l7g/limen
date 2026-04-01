/**
 * Fetch demographic breakdowns from ISTAT SDMX API.
 *
 * Uses the same proven dataflow as fetch-population.ts:
 *   22_289_DF_DCIS_POPRES1_24 (All municipalities by age)
 *
 * Fetches 5 datasets in sequence (with 13s rate-limit between each):
 *   1. Population aged 0-14  (youth)
 *   2. Population aged 15-64 (working age)
 *   3. Population aged 65+   (elderly)
 *   4. Male population
 *   5. Female population
 *
 * Output: public/data/population/demographics-by-comune.csv
 * Format: codice_comune,pop_0_14,pop_15_64,pop_65_plus,pop_male,pop_female
 *
 * Total API calls: 5 (with 13s delay = ~65s runtime)
 *
 * Usage: npx tsx scripts/fetch-demographics.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fetchSdmxCsv, parseSdmxCsv } from "./lib/istat-sdmx";

const DATAFLOW = "22_289_DF_DCIS_POPRES1_24";
const START_PERIOD = "2024"; // ISTAT publishes Jan 1 population with ~1yr lag

const OUTPUT_DIR = resolve(process.cwd(), "public/data/population");
const OUTPUT_FILE = join(OUTPUT_DIR, "demographics-by-comune.csv");

interface DemoData {
  pop_0_14: number;
  pop_15_64: number;
  pop_65_plus: number;
  pop_male: number;
  pop_female: number;
}

/**
 * Queries to run in sequence. Each returns ~8000 rows (one per comune).
 * Key format: FREQ.REF_AREA.DATA_TYPE.SEX.AGE.MARITAL_STATUS
 *   A       = Annual
 *   (empty) = All areas (wildcard)
 *   JAN     = Population at January 1st
 *   9       = Both sexes / 1 = Male / 2 = Female
 *   {age}   = Y0-14, Y15-64, Y_GE65, or TOTAL
 *   99      = All marital statuses
 */
const QUERIES: { key: string; field: keyof DemoData }[] = [
  { key: "A..JAN.9.Y0-14.99", field: "pop_0_14" },
  { key: "A..JAN.9.Y15-64.99", field: "pop_15_64" },
  { key: "A..JAN.9.Y_GE65.99", field: "pop_65_plus" },
  { key: "A..JAN.1.TOTAL.99", field: "pop_male" },
  { key: "A..JAN.2.TOTAL.99", field: "pop_female" },
];

function isComuneCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Fetching demographic breakdowns from ISTAT SDMX API...");
  console.log(`  Dataflow: ${DATAFLOW}`);
  console.log(`  Queries: ${QUERIES.length} (with 13s delay between each)`);
  console.log("");

  // Accumulate data per comune
  const data = new Map<string, DemoData>();

  for (const { key, field } of QUERIES) {
    console.log(`→ Fetching ${field}: key=${key}`);
    const csv = await fetchSdmxCsv({
      dataflowId: DATAFLOW,
      key,
      startPeriod: START_PERIOD,
    });

    const rows = parseSdmxCsv(csv);
    const comuni = rows.filter((r) => isComuneCode(r.REF_AREA));
    console.log(`  Received ${rows.length} rows → ${comuni.length} comuni`);

    for (const row of comuni) {
      const code = row.REF_AREA;
      if (!data.has(code)) {
        data.set(code, {
          pop_0_14: 0,
          pop_15_64: 0,
          pop_65_plus: 0,
          pop_male: 0,
          pop_female: 0,
        });
      }
      data.get(code)![field] = parseInt(row.OBS_VALUE, 10) || 0;
    }
  }

  if (data.size === 0) {
    console.error("No data received. Aborting.");
    process.exit(1);
  }

  // Build CSV
  const header =
    "codice_comune,pop_0_14,pop_15_64,pop_65_plus,pop_male,pop_female";
  const lines: string[] = [];

  for (const [code, d] of [...data.entries()].sort()) {
    lines.push(
      `${code},${d.pop_0_14},${d.pop_15_64},${d.pop_65_plus},${d.pop_male},${d.pop_female}`,
    );
  }

  const output = [header, ...lines].join("\n");
  writeFileSync(OUTPUT_FILE, output, "utf-8");

  // Summary
  const totalYouth = [...data.values()].reduce((s, d) => s + d.pop_0_14, 0);
  const totalWorking = [...data.values()].reduce((s, d) => s + d.pop_15_64, 0);
  const totalElderly = [...data.values()].reduce(
    (s, d) => s + d.pop_65_plus,
    0,
  );
  const totalMale = [...data.values()].reduce((s, d) => s + d.pop_male, 0);
  const totalFemale = [...data.values()].reduce((s, d) => s + d.pop_female, 0);

  console.log(`\n✓ Wrote ${data.size} comuni to demographics-by-comune.csv`);
  console.log(`  Youth (0-14):      ${totalYouth.toLocaleString("it-IT")}`);
  console.log(`  Working (15-64):   ${totalWorking.toLocaleString("it-IT")}`);
  console.log(`  Elderly (65+):     ${totalElderly.toLocaleString("it-IT")}`);
  console.log(`  Male:              ${totalMale.toLocaleString("it-IT")}`);
  console.log(`  Female:            ${totalFemale.toLocaleString("it-IT")}`);
  console.log(`  File size: ${(output.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
