/**
 * Fetch demographic breakdowns from ISTAT SDMX API.
 *
 * Uses the same proven dataflow as fetch-population.ts:
 *   22_289_DF_DCIS_POPRES1_24 (All municipalities by age)
 *
 * The API provides single-year age codes (Y0, Y1, ... Y99, Y_GE100, TOTAL)
 * but no pre-aggregated ranges. We use multi-value SDMX key syntax (Y0+Y1+...)
 * and aggregate client-side.
 *
 * Fetches 3 datasets in sequence (with 13s rate-limit between each):
 *   1. Male + female totals:  SEX=1+2, AGE=TOTAL
 *   2. Youth ages 0-14:       SEX=9,   AGE=Y0+Y1+...+Y14  (sum per comune)
 *   3. Elderly ages 65+:      SEX=9,   AGE=Y65+Y66+...+Y99+Y_GE100 (sum)
 *   4. Working age (15-64) = total - youth - elderly (computed, no query)
 *
 * Total population per comune is read from the existing comuni-population.csv
 * (produced by fetch-population.ts) to derive working-age without an extra query.
 *
 * Output: public/data/population/demographics-by-comune.csv
 * Format: codice_comune,pop_0_14,pop_15_64,pop_65_plus,pop_male,pop_female
 *
 * Total API calls: 3 (with 13s delay = ~40s runtime)
 *
 * Usage: npx tsx scripts/fetch-demographics.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";
import { fetchSdmxCsv, parseSdmxCsv } from "./lib/istat-sdmx";

const DATAFLOW = "22_289_DF_DCIS_POPRES1_24";
const START_PERIOD = "2025";

const DATA_DIR = resolve(process.cwd(), "public/data");
const POP_FILE = join(DATA_DIR, "population/comuni-population.csv");
const OUTPUT_DIR = join(DATA_DIR, "population");
const OUTPUT_FILE = join(OUTPUT_DIR, "demographics-by-comune.csv");

// Build multi-value age keys
const YOUTH_AGES = Array.from({ length: 15 }, (_, i) => `Y${i}`).join("+"); // Y0+Y1+...+Y14
const ELDERLY_AGES = [
  ...Array.from({ length: 35 }, (_, i) => `Y${65 + i}`), // Y65..Y99
  "Y_GE100",
].join("+");

interface DemoData {
  pop_0_14: number;
  pop_65_plus: number;
  pop_male: number;
  pop_female: number;
}

/**
 * Key format: FREQ.REF_AREA.DATA_TYPE.SEX.AGE.MARITAL_STATUS
 * Multi-value: use + to request multiple codes in one dimension.
 */
type AggMode = "assign" | "sum";

const QUERIES: {
  label: string;
  key: string;
  fields: (keyof DemoData)[];
  sexColumn: boolean;
  agg: AggMode;
}[] = [
  {
    label: "male + female totals",
    key: `A..JAN.1+2.TOTAL.99`,
    fields: ["pop_male", "pop_female"],
    sexColumn: true,
    agg: "assign",
  },
  {
    label: "youth (0-14)",
    key: `A..JAN.9.${YOUTH_AGES}.99`,
    fields: ["pop_0_14"],
    sexColumn: false,
    agg: "sum",
  },
  {
    label: "elderly (65+)",
    key: `A..JAN.9.${ELDERLY_AGES}.99`,
    fields: ["pop_65_plus"],
    sexColumn: false,
    agg: "sum",
  },
];

function isComuneCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

function padProComT(v: string | number): string {
  return String(v).padStart(6, "0");
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load existing total population for computing working-age
  const popRaw = readFileSync(POP_FILE, "utf-8");
  const popRows = Papa.parse<{
    codice_comune: string;
    anno: string;
    popolazione: string;
  }>(popRaw, { header: true, skipEmptyLines: true }).data;

  // Use latest year per comune
  const popMap = new Map<string, number>();
  for (const r of popRows) {
    const code = padProComT(r.codice_comune);
    const pop = parseInt(r.popolazione, 10) || 0;
    const existing = popMap.get(code);
    if (!existing || pop > 0) popMap.set(code, pop);
  }
  console.log(`Loaded ${popMap.size} comuni from total population file`);

  console.log(`\nFetching demographic breakdowns from ISTAT SDMX API...`);
  console.log(`  Dataflow: ${DATAFLOW}`);
  console.log(`  Queries: ${QUERIES.length} (with 13s delay between each)\n`);

  const data = new Map<string, DemoData>();

  function getOrCreate(code: string): DemoData {
    if (!data.has(code)) {
      data.set(code, {
        pop_0_14: 0,
        pop_65_plus: 0,
        pop_male: 0,
        pop_female: 0,
      });
    }
    return data.get(code)!;
  }

  for (const q of QUERIES) {
    console.log(`→ Fetching ${q.label}: key=${q.key.slice(0, 60)}...`);
    const csv = await fetchSdmxCsv({
      dataflowId: DATAFLOW,
      key: q.key,
      startPeriod: START_PERIOD,
    });

    const rows = parseSdmxCsv(csv);
    // Keep only latest year per comune (take max TIME_PERIOD)
    const latest = new Map<string, (typeof rows)[0][]>();
    for (const r of rows) {
      if (!isComuneCode(r.REF_AREA)) continue;
      const k = `${r.REF_AREA}_${r.SEX || ""}_${r.AGE || ""}`;
      if (!latest.has(r.REF_AREA)) latest.set(r.REF_AREA, []);
    }

    // Filter to latest year only
    let maxYear = "0";
    for (const r of rows) {
      if (isComuneCode(r.REF_AREA) && r.TIME_PERIOD > maxYear)
        maxYear = r.TIME_PERIOD;
    }
    const filtered = rows.filter(
      (r) => isComuneCode(r.REF_AREA) && r.TIME_PERIOD === maxYear,
    );
    console.log(
      `  Received ${rows.length} rows → ${filtered.length} for year ${maxYear}`,
    );

    if (q.sexColumn) {
      // Male/female: assign directly by SEX code
      for (const r of filtered) {
        const d = getOrCreate(r.REF_AREA);
        const val = parseInt(r.OBS_VALUE, 10) || 0;
        if (r.SEX === "1") d.pop_male = val;
        else if (r.SEX === "2") d.pop_female = val;
      }
    } else {
      // Age ranges: sum all individual-year rows per comune
      const sums = new Map<string, number>();
      for (const r of filtered) {
        sums.set(
          r.REF_AREA,
          (sums.get(r.REF_AREA) ?? 0) + (parseInt(r.OBS_VALUE, 10) || 0),
        );
      }
      const field = q.fields[0];
      for (const [code, total] of sums) {
        getOrCreate(code)[field] = total;
      }
      console.log(`  Aggregated ${sums.size} comuni`);
    }
  }

  if (data.size === 0) {
    console.error("No data received. Aborting.");
    process.exit(1);
  }

  // Compute working-age = total - youth - elderly
  const header =
    "codice_comune,pop_0_14,pop_15_64,pop_65_plus,pop_male,pop_female";
  const lines: string[] = [];
  let missingPop = 0;

  for (const [code, d] of [...data.entries()].sort()) {
    const totalPop = popMap.get(code) ?? 0;
    const pop1564 = totalPop > 0 ? totalPop - d.pop_0_14 - d.pop_65_plus : 0;
    if (totalPop === 0) missingPop++;
    lines.push(
      `${code},${d.pop_0_14},${pop1564},${d.pop_65_plus},${d.pop_male},${d.pop_female}`,
    );
  }

  const output = [header, ...lines].join("\n");
  writeFileSync(OUTPUT_FILE, output, "utf-8");

  // Summary
  const vals = [...data.entries()].map(([code, d]) => {
    const total = popMap.get(code) ?? 0;
    return {
      ...d,
      pop_15_64: total > 0 ? total - d.pop_0_14 - d.pop_65_plus : 0,
    };
  });
  const totalYouth = vals.reduce((s, d) => s + d.pop_0_14, 0);
  const totalWorking = vals.reduce((s, d) => s + d.pop_15_64, 0);
  const totalElderly = vals.reduce((s, d) => s + d.pop_65_plus, 0);
  const totalMale = vals.reduce((s, d) => s + d.pop_male, 0);
  const totalFemale = vals.reduce((s, d) => s + d.pop_female, 0);

  console.log(`\n✓ Wrote ${data.size} comuni to demographics-by-comune.csv`);
  console.log(`  Youth (0-14):      ${totalYouth.toLocaleString("it-IT")}`);
  console.log(`  Working (15-64):   ${totalWorking.toLocaleString("it-IT")}`);
  console.log(`  Elderly (65+):     ${totalElderly.toLocaleString("it-IT")}`);
  console.log(`  Male:              ${totalMale.toLocaleString("it-IT")}`);
  console.log(`  Female:            ${totalFemale.toLocaleString("it-IT")}`);
  if (missingPop > 0)
    console.log(
      `  ⚠ ${missingPop} comuni missing total population (pop_15_64 = 0)`,
    );
  console.log(`  File size: ${(output.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
