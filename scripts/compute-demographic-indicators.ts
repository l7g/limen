/**
 * Compute demographic indicators per comune from age/sex breakdown.
 *
 * Inputs:
 *   - public/data/population/demographics-by-comune.csv
 *   - public/data/population/comuni-population.csv (for COMUNE name lookups)
 *   - public/data/boundaries/comuni.geojson (for comune names + province codes)
 *
 * Indicators:
 *   - aging_index: (pop_65+ / pop_0-14) × 100
 *   - dependency_ratio: ((pop_0-14 + pop_65+) / pop_15-64) × 100
 *   - old_age_pct: (pop_65+ / total) × 100
 *   - youth_pct: (pop_0-14 / total) × 100
 *   - gender_ratio: (pop_male / pop_female) × 100
 *
 * Output: public/data/derived/demographic-indicators.csv
 *
 * Usage: npx tsx scripts/compute-demographic-indicators.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";

const DATA_DIR = resolve(process.cwd(), "public/data");
const DEMO_FILE = join(DATA_DIR, "population/demographics-by-comune.csv");
const BOUNDARIES_FILE = join(DATA_DIR, "boundaries/comuni.geojson");
const OUTPUT_DIR = join(DATA_DIR, "derived");
const OUTPUT_FILE = join(OUTPUT_DIR, "demographic-indicators.csv");

interface DemoRow {
  codice_comune: string;
  pop_0_14: string;
  pop_15_64: string;
  pop_65_plus: string;
  pop_male: string;
  pop_female: string;
}

function padProComT(v: string | number): string {
  return String(v).padStart(6, "0");
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load demographics
  const demoRaw = readFileSync(DEMO_FILE, "utf-8");
  const demoRows = Papa.parse<DemoRow>(demoRaw, {
    header: true,
    skipEmptyLines: true,
  }).data;
  console.log(`Loaded ${demoRows.length} demographic records`);

  // Load boundaries for comune names + province info
  const geoRaw = readFileSync(BOUNDARIES_FILE, "utf-8");
  const geojson = JSON.parse(geoRaw);
  const nameMap = new Map<
    string,
    { name: string; prov: string; reg: string }
  >();
  for (const f of geojson.features) {
    const p = f.properties;
    const code = padProComT(p.PRO_COM_T || p.PRO_COM || p.ISTAT || "");
    nameMap.set(code, {
      name: p.COMUNE || p.DEN_UTS || p.DENOMINAZIONE_COMUNE || "",
      prov: p.COD_PROV || p.DEN_PROV || "",
      reg: p.COD_REG || p.DEN_REG || "",
    });
  }
  console.log(`Loaded ${nameMap.size} boundary features for name lookup`);

  // Compute
  const header =
    "PRO_COM_T,comune,COD_PROV,COD_REG,pop_totale,pop_0_14,pop_15_64,pop_65_plus,pop_male,pop_female,indice_vecchiaia,indice_dipendenza,pct_giovani,pct_anziani,rapporto_mascolinita";
  const lines: string[] = [];
  let computed = 0;

  for (const r of demoRows) {
    const code = padProComT(r.codice_comune);
    const p014 = parseInt(r.pop_0_14, 10) || 0;
    const p1564 = parseInt(r.pop_15_64, 10) || 0;
    const p65 = parseInt(r.pop_65_plus, 10) || 0;
    const male = parseInt(r.pop_male, 10) || 0;
    const female = parseInt(r.pop_female, 10) || 0;
    const total = p014 + p1564 + p65;

    if (total === 0) continue;

    const agingIndex = p014 > 0 ? ((p65 / p014) * 100).toFixed(1) : "0";
    const depRatio =
      p1564 > 0 ? (((p014 + p65) / p1564) * 100).toFixed(1) : "0";
    const youthPct = ((p014 / total) * 100).toFixed(1);
    const oldPct = ((p65 / total) * 100).toFixed(1);
    const genderRatio = female > 0 ? ((male / female) * 100).toFixed(1) : "0";

    const info = nameMap.get(code);

    lines.push(
      [
        code,
        info?.name ?? "",
        info?.prov ?? "",
        info?.reg ?? "",
        total,
        p014,
        p1564,
        p65,
        male,
        female,
        agingIndex,
        depRatio,
        youthPct,
        oldPct,
        genderRatio,
      ].join(","),
    );
    computed++;
  }

  const output = [header, ...lines.sort()].join("\n");
  writeFileSync(OUTPUT_FILE, output, "utf-8");

  console.log(`\n✓ Wrote ${computed} comuni to demographic-indicators.csv`);
  console.log(`  File size: ${(output.length / 1024).toFixed(1)} KB`);

  // Sample stats
  const agingValues = lines
    .map((l) => parseFloat(l.split(",")[10]))
    .filter((v) => !isNaN(v));
  const avgAging = agingValues.reduce((s, v) => s + v, 0) / agingValues.length;
  const maxAging = Math.max(...agingValues);
  console.log(
    `  Avg aging index: ${avgAging.toFixed(1)}, max: ${maxAging.toFixed(1)}`,
  );
}

main();
