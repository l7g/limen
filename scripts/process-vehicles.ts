/**
 * Process ACI OPV vehicle fleet CSVs into a single normalized CSV.
 *
 * Input:  ../DATA/ACI/OPV/{year}/{AV|Autobus|Motocicli}/*.csv
 * Output: public/data/vehicles/fleet-by-province.csv
 *
 * Handles:
 *  - Italian thousands separator ("23.297" → 23297)
 *  - Schema evolution (2015 has fewer fuel columns than 2024)
 *  - Skips national subtotal rows (Provincia = "ITALIA")
 *
 * Usage: npx tsx scripts/process-vehicles.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";

const DATA_ROOT = resolve(process.cwd(), "../DATA/ACI/OPV");
const OUTPUT_DIR = resolve(process.cwd(), "public/data/vehicles");
const OUTPUT_FILE = join(OUTPUT_DIR, "fleet-by-province.csv");

const TYPE_MAP: Record<string, string> = {
  AV: "Autoveicoli",
  Autobus: "Autobus",
  Motocicli: "Motocicli",
};

const FIXED_COLS = ["Anno", "Provincia", "Euro"];

interface OutputRow {
  anno: number;
  provincia: string;
  tipo_veicolo: string;
  euro: string;
  alimentazione: string;
  veicoli: number;
}

/** ACI files quote numbers with "." as thousands separator → strip */
function parseAciNumber(val: string | undefined): number {
  if (!val || val === "ND" || val === "") return 0;
  return parseInt(val.replace(/\./g, ""), 10) || 0;
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const rows: OutputRow[] = [];

  const years = readdirSync(DATA_ROOT)
    .filter((f) => /^\d{4}$/.test(f))
    .sort();
  console.log(`Found years: ${years.join(", ")}`);

  for (const year of years) {
    const yearDir = join(DATA_ROOT, year);
    const typeFolders = readdirSync(yearDir);

    for (const typeFolder of typeFolders) {
      const typeLabel = TYPE_MAP[typeFolder];
      if (!typeLabel) continue;

      const typeDir = join(yearDir, typeFolder);
      const csvFiles = readdirSync(typeDir).filter((f) => f.endsWith(".csv"));

      for (const csvFile of csvFiles) {
        const raw = readFileSync(join(typeDir, csvFile), "utf-8").replace(
          /^\uFEFF/,
          "",
        );
        const parsed = Papa.parse<Record<string, string>>(raw, {
          header: true,
          skipEmptyLines: true,
        });

        // Detect fuel columns dynamically (everything except Anno, Provincia, Euro, Totale)
        const allCols = parsed.meta.fields ?? [];
        const fuelCols = allCols.filter(
          (c) => !FIXED_COLS.includes(c) && c !== "Totale",
        );

        for (const row of parsed.data) {
          if (!row.Provincia || row.Provincia === "ITALIA") continue;

          // Melt: one output row per fuel type
          for (const fuel of fuelCols) {
            const count = parseAciNumber(row[fuel]);
            if (count === 0) continue;

            rows.push({
              anno: parseInt(row.Anno, 10),
              provincia: row.Provincia.trim(),
              tipo_veicolo: typeLabel,
              euro: (row.Euro ?? "").trim(),
              alimentazione: fuel,
              veicoli: count,
            });
          }
        }
      }
    }
  }

  const csv = Papa.unparse(rows, { header: true });
  writeFileSync(OUTPUT_FILE, csv, "utf-8");
  console.log(
    `✓ Wrote ${rows.length} rows to fleet-by-province.csv (${(csv.length / 1024).toFixed(1)} KB)`,
  );
}

main();
