/**
 * Process ACI Autoritratto vehicle fleet ODS into a clean per-province CSV.
 *
 * Input:  ../DATA/ACI/AUTORITRATTO_2024/Parco_veicoli_2024/Parco veicoli 2024/Parco_veicolare_2024.ods
 *         Sheet: 1_Provincia_categoria (149 rows, all vehicle types by province)
 * Lookup: public/data/boundaries/province.geojson (province name → COD_PROV)
 * Output: public/data/vehicles/fleet-by-province.csv
 *
 * Province name normalization: ACI uses spaces/shortened names, ISTAT uses
 * hyphens/full names. We normalize both to uppercase with spaces, plus an
 * explicit override map for 4 known mismatches.
 *
 * Usage: npx tsx scripts/process-vehicles-national.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// ── Paths ──────────────────────────────────────────────────────────────
const ODS_FILE = resolve(
  process.cwd(),
  "../DATA/ACI/AUTORITRATTO_2024/Parco_veicoli_2024/Parco veicoli 2024/Parco_veicolare_2024.ods",
);
const PROVINCE_GEOJSON = resolve(
  process.cwd(),
  "public/data/boundaries/province.geojson",
);
const OUTPUT_DIR = resolve(process.cwd(), "public/data/vehicles");
const OUTPUT_FILE = join(OUTPUT_DIR, "fleet-by-province.csv");

// ── Province name overrides ────────────────────────────────────────────
// ACI name (uppercase) → ISTAT DEN_UTS (uppercase) for cases where
// simple normalization (hyphens/apostrophes → spaces) isn't enough.
const ACI_TO_ISTAT: Record<string, string> = {
  "BARLETTA TRANI": "BARLETTA-ANDRIA-TRANI",
  "MONZA BRIANZA": "MONZA E DELLA BRIANZA",
  "REGGIO CALABRIA": "REGGIO DI CALABRIA",
  "REGGIO EMILIA": "REGGIO NELL'EMILIA",
};

// Rows to skip (subtotals, headers, macro-area labels)
const SKIP_PROVINCES = new Set([
  "Totale",
  "ITALIA",
  "NON DEFINITO",
  "ITALIA NORD-OCCIDENTALE",
  "ITALIA NORD-ORIENTALE",
  "ITALIA CENTRALE",
  "ITALIA MERIDIONALE",
  "ITALIA INSULARE",
]);

interface OutputRow {
  COD_PROV: number;
  provincia: string;
  sigla: string;
  regione: string;
  area_geografica: string;
  autobus: number;
  autocarri: number;
  autoveicoli_speciali: number;
  autovetture: number;
  motocarri: number;
  motocicli: number;
  motoveicoli_speciali: number;
  rimorchi_speciali: number;
  rimorchi_merci: number;
  trattori: number;
  non_definito: number;
  totale: number;
}

/** Normalize a province name for matching: uppercase, hyphens→spaces, remove apostrophes */
function normalize(name: string): string {
  return name
    .toUpperCase()
    .replace(/-/g, " ")
    .replace(/'/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build lookup: normalized ISTAT name → { COD_PROV, DEN_UTS, SIGLA } */
function buildProvinceLookup(): Map<
  string,
  { codProv: number; name: string; sigla: string }
> {
  const raw = readFileSync(PROVINCE_GEOJSON, "utf-8");
  const gj = JSON.parse(raw);
  const lookup = new Map<
    string,
    { codProv: number; name: string; sigla: string }
  >();

  for (const feat of gj.features) {
    const p = feat.properties;
    const key = normalize(p.DEN_UTS);
    lookup.set(key, {
      codProv: p.COD_PROV,
      name: p.DEN_UTS,
      sigla: p.SIGLA,
    });
  }

  return lookup;
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Build province lookup from ISTAT boundaries
  const lookup = buildProvinceLookup();
  console.log(`Loaded ${lookup.size} provinces from ISTAT boundaries`);

  // 2. Read ACI ODS
  const wb = XLSX.readFile(ODS_FILE);
  const ws = wb.Sheets["1_Provincia_categoria"];
  if (!ws) {
    console.error("Sheet '1_Provincia_categoria' not found!");
    process.exit(1);
  }

  const rawData: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`Read ${rawData.length} rows from ODS sheet`);

  // 3. Parse rows (skip first 3: title, empty, header)
  const rows: OutputRow[] = [];
  let currentArea = "";
  let currentRegione = "";
  const unmatched: string[] = [];

  for (let i = 3; i < rawData.length; i++) {
    const r = rawData[i];
    if (!r || r.length < 3) continue;

    // Forward-fill sparse area and regione columns
    if (r[0] && String(r[0]).trim()) currentArea = String(r[0]).trim();
    if (r[1] && String(r[1]).trim()) currentRegione = String(r[1]).trim();

    const provinceName = r[2] ? String(r[2]).trim() : "";
    if (!provinceName || SKIP_PROVINCES.has(provinceName)) continue;

    // Resolve ACI province name → ISTAT COD_PROV
    const aciUpper = provinceName.toUpperCase();
    const istatName = ACI_TO_ISTAT[aciUpper];
    const searchKey = istatName ? normalize(istatName) : normalize(aciUpper);
    const match = lookup.get(searchKey);

    if (!match) {
      unmatched.push(provinceName);
      continue;
    }

    const num = (idx: number): number => {
      const v = r[idx];
      if (v === undefined || v === null || v === "") return 0;
      return typeof v === "number" ? v : parseInt(String(v), 10) || 0;
    };

    rows.push({
      COD_PROV: match.codProv,
      provincia: match.name,
      sigla: match.sigla,
      regione: currentRegione,
      area_geografica: currentArea,
      autobus: num(3),
      autocarri: num(4),
      autoveicoli_speciali: num(5),
      autovetture: num(6),
      motocarri: num(7),
      motocicli: num(8),
      motoveicoli_speciali: num(9),
      rimorchi_speciali: num(10),
      rimorchi_merci: num(11),
      trattori: num(12),
      non_definito: num(13),
      totale: num(14),
    });
  }

  // 4. Warn about unmatched provinces
  if (unmatched.length > 0) {
    console.warn(`⚠ ${unmatched.length} unmatched province(s):`);
    unmatched.forEach((u) => console.warn(`  "${u}"`));
  }

  // 5. Sort by COD_PROV for deterministic output
  rows.sort((a, b) => a.COD_PROV - b.COD_PROV);

  // 6. Write CSV
  const csv = Papa.unparse(rows, { header: true });
  writeFileSync(OUTPUT_FILE, csv, "utf-8");

  // 7. Summary
  const totalVeicoli = rows.reduce((s, r) => s + r.totale, 0);
  const totalAutovetture = rows.reduce((s, r) => s + r.autovetture, 0);
  const fileSize = (Buffer.byteLength(csv, "utf-8") / 1024).toFixed(1);

  console.log(`✓ Wrote ${rows.length} provinces to fleet-by-province.csv`);
  console.log(`  File size: ${fileSize} KB`);
  console.log(`  Total vehicles: ${totalVeicoli.toLocaleString("it-IT")}`);
  console.log(
    `  Total autovetture: ${totalAutovetture.toLocaleString("it-IT")}`,
  );
}

main();
