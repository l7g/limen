/**
 * Process ISTAT SDMX population CSV into clean per-comune population CSV.
 *
 * Input:  ../DATA/ISTAT/pop_comuni_eta_sardegna/*.csv (SDMX format)
 * Output: public/data/population/comuni-population.csv
 *
 * Filters: AGE=TOTAL, latest TIME_PERIOD, numeric REF_AREA (comuni only)
 * Note: Currently Sardinia-only (377 comuni). National data requires ISTAT API fetch.
 *
 * Usage: npx tsx scripts/process-population.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";

const DATA_DIR = resolve(
  process.cwd(),
  "../DATA/ISTAT/pop_comuni_eta_sardegna",
);
const OUTPUT_DIR = resolve(process.cwd(), "public/data/population");
const OUTPUT_FILE = join(OUTPUT_DIR, "comuni-population.csv");

interface SdmxRow {
  FREQ: string;
  Frequenza: string;
  REF_AREA: string;
  Territorio: string;
  DATA_TYPE: string;
  Indicatore: string;
  SEX: string;
  Sesso: string;
  AGE: string;
  Età: string;
  MARITAL_STATUS: string;
  "Stato civile": string;
  TIME_PERIOD: string;
  Osservazione: string;
  [key: string]: string;
}

interface OutputRow {
  codice_comune: string;
  comune: string;
  anno: number;
  popolazione: number;
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Find the CSV file
  const csvFiles = readdirSync(DATA_DIR).filter((f) => f.endsWith(".csv"));
  if (csvFiles.length === 0) {
    console.error("No CSV files found in", DATA_DIR);
    process.exit(1);
  }

  const filePath = join(DATA_DIR, csvFiles[0]);
  console.log(`Reading ${csvFiles[0]}...`);

  const raw = readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
  const parsed = Papa.parse<SdmxRow>(raw, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`Parsed ${parsed.data.length} raw rows`);

  // Filter: numeric REF_AREA (comuni, not NUTS codes), AGE=TOTAL or Y_GE0
  const comuneRows = parsed.data.filter((r) => {
    if (!r.REF_AREA || !/^\d+$/.test(r.REF_AREA)) return false;
    // Accept TOTAL or Y_GE0 (different SDMX encodings for "all ages")
    if (r.AGE !== "TOTAL" && r.AGE !== "Y_GE0") return false;
    if (r.SEX !== "9") return false; // 9 = Totale
    return true;
  });

  console.log(`Filtered to ${comuneRows.length} comune-level total rows`);

  // Find latest year
  const years = [
    ...new Set(comuneRows.map((r) => parseInt(r.TIME_PERIOD, 10))),
  ];
  const latestYear = Math.max(...years);
  console.log(
    `Available years: ${years.sort().join(", ")}. Using: ${latestYear}`,
  );

  const latestRows = comuneRows.filter(
    (r) => parseInt(r.TIME_PERIOD, 10) === latestYear,
  );

  const output: OutputRow[] = latestRows.map((r) => ({
    codice_comune: r.REF_AREA.padStart(6, "0"),
    comune: r.Territorio.trim(),
    anno: latestYear,
    popolazione: parseInt(r.Osservazione, 10) || 0,
  }));

  // Sort by codice_comune
  output.sort((a, b) => a.codice_comune.localeCompare(b.codice_comune));

  const csv = Papa.unparse(output, { header: true });
  writeFileSync(OUTPUT_FILE, csv, "utf-8");
  console.log(
    `✓ Wrote ${output.length} comuni to comuni-population.csv (${(csv.length / 1024).toFixed(1)} KB)`,
  );
}

main();
