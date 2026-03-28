/**
 * Process ISTAT pendolarismo (commuter matrix) into clean CSV.
 *
 * Input:  ../DATA/ISTAT/pendolarismo/matrix_pendoLAVORO_2021.txt (tab-delimited)
 * Output: public/data/population/pendolarismo.csv
 *
 * Usage: npx tsx scripts/process-pendolarismo.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";

const INPUT = resolve(
  process.cwd(),
  "../DATA/ISTAT/pendolarismo/matrix_pendoLAVORO_2021.txt",
);
const OUTPUT_DIR = resolve(process.cwd(), "public/data/population");
const OUTPUT_FILE = join(OUTPUT_DIR, "pendolarismo.csv");

interface RawRow {
  Prov_res: string;
  Procom_res: string;
  Prov_lav: string;
  Procom_lav: string;
  Pendolari: string;
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Reading ${INPUT}...`);
  const raw = readFileSync(INPUT, "latin1");

  const parsed = Papa.parse<RawRow>(raw, {
    header: true,
    delimiter: "\t",
    skipEmptyLines: true,
  });

  console.log(`Parsed ${parsed.data.length} raw rows`);

  const rows = parsed.data
    .filter((r) => r.Prov_res && r.Pendolari)
    .map((r) => ({
      prov_residenza: r.Prov_res.trim(),
      comune_residenza: r.Procom_res.trim(),
      prov_lavoro: r.Prov_lav.trim(),
      comune_lavoro: r.Procom_lav.trim(),
      pendolari: parseInt(r.Pendolari.trim(), 10) || 0,
    }));

  const csv = Papa.unparse(rows, { header: true });
  writeFileSync(OUTPUT_FILE, csv, "utf-8");
  console.log(
    `✓ Wrote ${rows.length} rows to pendolarismo.csv (${(csv.length / 1024 / 1024).toFixed(1)} MB)`,
  );
}

main();
