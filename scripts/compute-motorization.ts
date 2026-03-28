/**
 * Compute motorization rate per province.
 *
 * Inputs:
 *   - public/data/vehicles/fleet-by-province.csv (ACI: COD_PROV, totale, autovetture)
 *   - public/data/population/comuni-population.csv (ISTAT: codice_comune, popolazione)
 *
 * Method: population aggregated by province (first 3 digits of codice_comune = COD_PROV),
 *         then vehicles_per_1000 = (totale / popolazione) * 1000
 *
 * Output: public/data/derived/motorization-rate.csv
 * Format: COD_PROV,provincia,popolazione,veicoli_totali,autovetture,veicoli_per_1000,auto_per_1000
 *
 * Usage: npx tsx scripts/compute-motorization.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";

const DATA_DIR = resolve(process.cwd(), "public/data");
const VEHICLES_FILE = join(DATA_DIR, "vehicles/fleet-by-province.csv");
const POP_FILE = join(DATA_DIR, "population/comuni-population.csv");
const OUTPUT_DIR = join(DATA_DIR, "derived");
const OUTPUT_FILE = join(OUTPUT_DIR, "motorization-rate.csv");

interface VehicleRow {
  COD_PROV: string;
  provincia: string;
  totale: string;
  autovetture: string;
  [key: string]: string;
}

interface PopRow {
  codice_comune: string;
  anno: string;
  popolazione: string;
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load vehicles
  const vehiclesRaw = readFileSync(VEHICLES_FILE, "utf-8");
  const vehicles = Papa.parse<VehicleRow>(vehiclesRaw, {
    header: true,
    skipEmptyLines: true,
  }).data;
  console.log(`Loaded ${vehicles.length} province vehicle records`);

  // Load population and aggregate by province
  const popRaw = readFileSync(POP_FILE, "utf-8");
  const popRows = Papa.parse<PopRow>(popRaw, {
    header: true,
    skipEmptyLines: true,
  }).data;
  console.log(`Loaded ${popRows.length} comune population records`);

  // Aggregate: province code = first 3 digits of 6-digit codice_comune
  const popByProvince = new Map<number, number>();
  for (const r of popRows) {
    const codProv = parseInt(r.codice_comune.substring(0, 3), 10);
    const pop = parseInt(r.popolazione, 10) || 0;
    popByProvince.set(codProv, (popByProvince.get(codProv) ?? 0) + pop);
  }
  console.log(`Aggregated population for ${popByProvince.size} provinces`);

  // Compute motorization rate
  const header =
    "COD_PROV,provincia,popolazione,veicoli_totali,autovetture,veicoli_per_1000,auto_per_1000";
  const lines: string[] = [];
  let matched = 0;

  for (const v of vehicles) {
    const codProv = parseInt(v.COD_PROV, 10);
    const pop = popByProvince.get(codProv);
    if (!pop || pop === 0) {
      console.warn(`  No population for COD_PROV=${codProv} (${v.provincia})`);
      continue;
    }

    const totale = parseInt(v.totale, 10) || 0;
    const autovetture = parseInt(v.autovetture, 10) || 0;
    const veicoliPer1000 = Math.round((totale / pop) * 1000);
    const autoPer1000 = Math.round((autovetture / pop) * 1000);

    lines.push(
      `${codProv},${v.provincia},${pop},${totale},${autovetture},${veicoliPer1000},${autoPer1000}`,
    );
    matched++;
  }

  lines.sort((a, b) => parseInt(a.split(",")[0]) - parseInt(b.split(",")[0]));
  const output = [header, ...lines].join("\n");
  writeFileSync(OUTPUT_FILE, output, "utf-8");

  // Summary
  const rates = lines.map((l) => parseInt(l.split(",")[5]));
  const avgRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  const maxLine = lines.reduce((max, l) =>
    parseInt(l.split(",")[5]) > parseInt(max.split(",")[5]) ? l : max,
  );
  const minLine = lines.reduce((min, l) =>
    parseInt(l.split(",")[5]) < parseInt(min.split(",")[5]) ? l : min,
  );

  console.log(`\n✓ Wrote ${matched} province motorization rates`);
  console.log(`  Average: ${avgRate} vehicles per 1,000 inhabitants`);
  console.log(
    `  Highest: ${maxLine.split(",")[1]} (${maxLine.split(",")[5]}/1000)`,
  );
  console.log(
    `  Lowest: ${minLine.split(",")[1]} (${minLine.split(",")[5]}/1000)`,
  );
  console.log(`  File: ${OUTPUT_FILE}`);
}

main();
