/**
 * Compute estimated vehicle emissions per province (NATIONAL).
 *
 * Method: fleet-by-province.csv (all 107 provinces, vehicle counts by type)
 *         × ISPRA 'categoria' sheet (national-average g/km per vehicle category)
 *         × 10,000 km/year (ISFORT/ACI national average)
 *
 * Mapping:
 *   autovetture → Passenger Cars (161.7 g CO2/km)
 *   autobus → Buses (718.0 g CO2/km)
 *   autocarri → weighted avg of Light Commercial (242.4) + Heavy Duty Trucks (668.9)
 *   motocicli → Motorcycles (107.8 g CO2/km)
 *   motocarri → Mopeds (55.3 g CO2/km)
 *
 * Output: public/data/derived/emissions-by-province.csv
 * Usage: npx tsx scripts/compute-emissions.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const ISPRA_FILE = resolve(
  process.cwd(),
  "../DATA/EMISSIONS/ISPRAMBIENTE/fe.xlsx",
);
const FLEET_FILE = resolve(
  process.cwd(),
  "public/data/vehicles/fleet-by-province.csv",
);
const OUTPUT_DIR = resolve(process.cwd(), "public/data/derived");
const OUTPUT_FILE = join(OUTPUT_DIR, "emissions-by-province.csv");

const AVG_KM_PER_YEAR = 10_000;

interface EF {
  co2: number;
  nox: number;
  pm25: number;
}

// Fleet column → ISPRA Categoria name
const COL_TO_CAT: Record<string, string> = {
  autovetture: "Passenger Cars",
  autobus: "Buses",
  motocicli: "Motorcycles",
  motocarri: "Mopeds",
};

// autocarri has no direct ISPRA match — we'll use a weighted average
// of Light Commercial Vehicles (majority) and Heavy Duty Trucks.
// National split is roughly 85% LCV / 15% HDT (ACI statistics).
const LCV_WEIGHT = 0.85;
const HDT_WEIGHT = 0.15;

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // ─── 1. Load ISPRA emission factors (categoria sheet) ───
  console.log("Loading ISPRA emission factors (categoria sheet)...");
  const wb = XLSX.readFile(ISPRA_FILE);
  const ws = wb.Sheets["categoria"];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  const catEF = new Map<string, EF>();
  for (const row of rows) {
    const cat = String(row["Categoria"] || "");
    const co2 = Number(row["CO2 2022 g/km TOTALE"]) || 0;
    const nox = Number(row["NOx 2022 g/km TOTALE"]) || 0;
    const pm25 = Number(row["PM2.5 2022 g/km TOTALE"]) || 0;
    catEF.set(cat, { co2, nox, pm25 });
    console.log(
      `  ${cat}: CO2=${co2.toFixed(1)} g/km, NOx=${nox.toFixed(3)} g/km, PM2.5=${pm25.toFixed(4)} g/km`,
    );
  }

  // Build "autocarri" EF as weighted average of LCV + HDT
  const lcv = catEF.get("Light Commercial Vehicles")!;
  const hdt = catEF.get("Heavy Duty Trucks")!;
  const autocarriEF: EF = {
    co2: lcv.co2 * LCV_WEIGHT + hdt.co2 * HDT_WEIGHT,
    nox: lcv.nox * LCV_WEIGHT + hdt.nox * HDT_WEIGHT,
    pm25: lcv.pm25 * LCV_WEIGHT + hdt.pm25 * HDT_WEIGHT,
  };
  console.log(
    `  autocarri (blend): CO2=${autocarriEF.co2.toFixed(1)} g/km, NOx=${autocarriEF.nox.toFixed(3)} g/km`,
  );

  // Build final lookup: fleet column → EF
  const efByCol = new Map<string, EF>();
  for (const [col, cat] of Object.entries(COL_TO_CAT)) {
    const ef = catEF.get(cat);
    if (ef) efByCol.set(col, ef);
    else console.warn(`  ⚠ Missing EF for ${cat}`);
  }
  efByCol.set("autocarri", autocarriEF);

  // ─── 2. Load fleet data (national, all provinces) ───
  console.log("\nLoading fleet-by-province.csv...");
  const fleetRaw = readFileSync(FLEET_FILE, "utf-8");
  const fleet = Papa.parse<Record<string, string>>(fleetRaw, {
    header: true,
    skipEmptyLines: true,
  }).data;
  console.log(`  ${fleet.length} provinces`);

  // ─── 3. Compute emissions per province ───
  const vehicleCols = [...efByCol.keys()];

  const header =
    "COD_PROV,DEN_PROV,veicoli_analizzati,co2_tonnellate_anno,nox_kg_anno,pm25_kg_anno,co2_per_veicolo_kg";
  const lines: string[] = [];
  let grandTotalCO2 = 0;
  let grandTotalVehicles = 0;

  for (const row of fleet) {
    const codProv = row.COD_PROV?.trim();
    const prov = row.provincia?.trim();
    if (!codProv || !prov) continue;

    let totalVehicles = 0;
    let co2Tonnes = 0;
    let noxKg = 0;
    let pm25Kg = 0;

    for (const col of vehicleCols) {
      const count = parseInt(row[col] || "0", 10);
      if (count <= 0) continue;

      const ef = efByCol.get(col)!;
      totalVehicles += count;
      co2Tonnes += (ef.co2 * AVG_KM_PER_YEAR * count) / 1e6; // g→tonnes
      noxKg += (ef.nox * AVG_KM_PER_YEAR * count) / 1e3; // g→kg
      pm25Kg += (ef.pm25 * AVG_KM_PER_YEAR * count) / 1e3; // g→kg
    }

    if (totalVehicles === 0) continue;

    const co2PerVehicle = (co2Tonnes * 1000) / totalVehicles;
    grandTotalCO2 += co2Tonnes;
    grandTotalVehicles += totalVehicles;

    lines.push(
      [
        codProv,
        `"${prov}"`,
        totalVehicles,
        co2Tonnes.toFixed(0),
        noxKg.toFixed(0),
        pm25Kg.toFixed(0),
        co2PerVehicle.toFixed(1),
      ].join(","),
    );
  }

  const output = [header, ...lines].join("\n");
  writeFileSync(OUTPUT_FILE, output, "utf-8");

  console.log(
    `\n✓ Wrote ${lines.length} provinces → emissions-by-province.csv`,
  );
  console.log(`  Vehicles analyzed: ${grandTotalVehicles.toLocaleString()}`);
  console.log(
    `  Total estimated CO2: ${(grandTotalCO2 / 1e6).toFixed(2)}M tonnes/year`,
  );
  console.log(
    `  Avg CO2/vehicle: ${((grandTotalCO2 * 1000) / grandTotalVehicles).toFixed(0)} kg/year`,
  );
  console.log(`  File: ${(output.length / 1024).toFixed(1)} KB`);
}

main();
