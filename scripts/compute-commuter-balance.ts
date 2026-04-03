/**
 * Compute commuter balance per comune.
 *
 * Inputs:
 *   - public/data/population/pendolarismo.csv (ISTAT: prov_residenza, comune_residenza, prov_lavoro, comune_lavoro, pendolari)
 *
 * Method: For each comune, sum incoming (where comune_lavoro = this) - outgoing (where comune_residenza = this).
 * Balance > 0 = net attractor, Balance < 0 = net dormitory.
 *
 * Output: public/data/derived/commuter-balance.csv
 *
 * Usage: npx tsx scripts/compute-commuter-balance.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";

const DATA_DIR = resolve(process.cwd(), "public/data");
const PENDOLARISMO_FILE = join(DATA_DIR, "population/pendolarismo.csv");
const POP_FILE = join(DATA_DIR, "population/comuni-population.csv");
const OUTPUT_DIR = join(DATA_DIR, "derived");
const OUTPUT_FILE = join(OUTPUT_DIR, "commuter-balance.csv");

interface FlowRow {
  prov_residenza: string;
  comune_residenza: string;
  prov_lavoro: string;
  comune_lavoro: string;
  pendolari: string;
}

interface PopRow {
  codice_comune: string;
  anno: string;
  popolazione: string;
}

function padProComT(v: string | number): string {
  return String(v).padStart(6, "0");
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load flows
  const flowsRaw = readFileSync(PENDOLARISMO_FILE, "utf-8");
  const flows = Papa.parse<FlowRow>(flowsRaw, {
    header: true,
    skipEmptyLines: true,
  }).data;
  console.log(`Loaded ${flows.length} commuter flow records`);

  // Aggregate outgoing and incoming per comune
  const outgoing = new Map<string, number>(); // comune_residenza → total leaving
  const incoming = new Map<string, number>(); // comune_lavoro → total arriving
  const internal = new Map<string, number>(); // same origin and destination

  for (const f of flows) {
    const origin = padProComT(f.comune_residenza);
    const dest = padProComT(f.comune_lavoro);
    const n = parseInt(f.pendolari, 10) || 0;

    if (origin === dest) {
      internal.set(origin, (internal.get(origin) ?? 0) + n);
    } else {
      outgoing.set(origin, (outgoing.get(origin) ?? 0) + n);
      incoming.set(dest, (incoming.get(dest) ?? 0) + n);
    }
  }

  // Load population for context
  const popRaw = readFileSync(POP_FILE, "utf-8");
  const popRows = Papa.parse<PopRow>(popRaw, {
    header: true,
    skipEmptyLines: true,
  }).data;
  const popMap = new Map<string, number>();
  for (const r of popRows) {
    popMap.set(padProComT(r.codice_comune), parseInt(r.popolazione, 10) || 0);
  }

  // Collect all unique comuni
  const allComuni = new Set([
    ...outgoing.keys(),
    ...incoming.keys(),
    ...internal.keys(),
  ]);
  console.log(`Computing balance for ${allComuni.size} comuni`);

  const header =
    "PRO_COM_T,COD_PROV,popolazione,pendolari_in_entrata,pendolari_in_uscita,pendolari_interni,bilancio_pendolari,bilancio_per_1000";
  const lines: string[] = [];

  for (const key of allComuni) {
    const inc = incoming.get(key) ?? 0;
    const out = outgoing.get(key) ?? 0;
    const int = internal.get(key) ?? 0;
    const balance = inc - out;
    const pop = popMap.get(key) ?? 0;
    const balancePer1000 = pop > 0 ? Math.round((balance / pop) * 1000) : 0;

    lines.push(
      [key, key.slice(0, 3), pop, inc, out, int, balance, balancePer1000].join(
        ",",
      ),
    );
  }

  lines.sort((a, b) => a.localeCompare(b));
  const output = [header, ...lines].join("\n");
  writeFileSync(OUTPUT_FILE, output, "utf-8");

  // Summary
  const balances = lines.map((l) => parseInt(l.split(",")[6]));
  const attractors = balances.filter((b) => b > 0).length;
  const dormitories = balances.filter((b) => b < 0).length;
  const neutral = balances.filter((b) => b === 0).length;
  const maxAttractor = Math.max(...balances);
  const maxDormitory = Math.min(...balances);

  console.log(`\nResults:`);
  console.log(`  Comuni attrattori (bilancio > 0): ${attractors}`);
  console.log(`  Comuni dormitorio (bilancio < 0): ${dormitories}`);
  console.log(`  Comuni neutri (bilancio = 0): ${neutral}`);
  console.log(
    `  Max attrattore: +${maxAttractor.toLocaleString("it-IT")} pendolari`,
  );
  console.log(
    `  Max dormitorio: ${maxDormitory.toLocaleString("it-IT")} pendolari`,
  );
  console.log(`Output: ${OUTPUT_FILE}`);
}

main();
