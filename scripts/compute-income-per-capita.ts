/**
 * Compute income per capita per comune.
 *
 * Inputs:
 *   - public/data/population/income-by-comune.csv (MEF: PRO_COM_T, reddito_complessivo, contribuenti, reddito_medio)
 *   - public/data/population/comuni-population.csv (ISTAT: codice_comune, popolazione)
 *
 * Method: reddito_pro_capite = reddito_complessivo / popolazione
 *
 * Output: public/data/derived/income-per-capita.csv
 *
 * Usage: npx tsx scripts/compute-income-per-capita.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";

const DATA_DIR = resolve(process.cwd(), "public/data");
const INCOME_FILE = join(DATA_DIR, "population/income-by-comune.csv");
const POP_FILE = join(DATA_DIR, "population/comuni-population.csv");
const OUTPUT_DIR = join(DATA_DIR, "derived");
const OUTPUT_FILE = join(OUTPUT_DIR, "income-per-capita.csv");

interface IncomeRow {
  PRO_COM_T: string;
  comune: string;
  sigla_provincia: string;
  regione: string;
  anno_imposta: string;
  contribuenti: string;
  reddito_complessivo: string;
  reddito_imponibile: string;
  imposta_netta: string;
  reddito_medio: string;
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

  // Load income
  const incomeRaw = readFileSync(INCOME_FILE, "utf-8");
  const income = Papa.parse<IncomeRow>(incomeRaw, {
    header: true,
    skipEmptyLines: true,
  }).data;
  console.log(`Loaded ${income.length} income records`);

  // Load population — build lookup
  const popRaw = readFileSync(POP_FILE, "utf-8");
  const popRows = Papa.parse<PopRow>(popRaw, {
    header: true,
    skipEmptyLines: true,
  }).data;

  const popMap = new Map<string, number>();
  for (const r of popRows) {
    const key = padProComT(r.codice_comune);
    popMap.set(key, parseInt(r.popolazione, 10) || 0);
  }
  console.log(`Loaded ${popMap.size} population records`);

  // Compute
  const header =
    "PRO_COM_T,COD_PROV,comune,sigla_provincia,regione,popolazione,contribuenti,reddito_complessivo,reddito_pro_capite,reddito_medio_contribuente,pressione_fiscale";
  const lines: string[] = [];
  let matched = 0;
  let unmatched = 0;

  for (const r of income) {
    const key = padProComT(r.PRO_COM_T);
    const pop = popMap.get(key);
    if (!pop || pop === 0) {
      unmatched++;
      continue;
    }

    const redditoComplessivo = parseFloat(r.reddito_complessivo) || 0;
    const impostaNetta = parseFloat(r.imposta_netta) || 0;
    const contribuenti = parseInt(r.contribuenti, 10) || 0;

    const redditoProCapite = Math.round(redditoComplessivo / pop);
    const redditoMedioContribuente =
      contribuenti > 0 ? Math.round(redditoComplessivo / contribuenti) : 0;
    const pressioneFiscale =
      redditoComplessivo > 0
        ? Math.round((impostaNetta / redditoComplessivo) * 10000) / 100
        : 0;

    lines.push(
      [
        key,
        key.slice(0, 3),
        `"${r.comune}"`,
        r.sigla_provincia,
        `"${r.regione}"`,
        pop,
        contribuenti,
        Math.round(redditoComplessivo),
        redditoProCapite,
        redditoMedioContribuente,
        pressioneFiscale,
      ].join(","),
    );
    matched++;
  }

  lines.sort((a, b) => a.localeCompare(b));
  const output = [header, ...lines].join("\n");
  writeFileSync(OUTPUT_FILE, output, "utf-8");

  // Summary stats
  const perCapita = lines.map((l) => parseInt(l.split(",")[8]));
  const avg = Math.round(
    perCapita.reduce((a, b) => a + b, 0) / perCapita.length,
  );
  const min = Math.min(...perCapita);
  const max = Math.max(...perCapita);

  console.log(`\nResults:`);
  console.log(`  Matched: ${matched} comuni`);
  console.log(`  Unmatched: ${unmatched} comuni (no population data)`);
  console.log(
    `  Reddito pro capite — media: €${avg.toLocaleString("it-IT")}, min: €${min.toLocaleString("it-IT")}, max: €${max.toLocaleString("it-IT")}`,
  );
  console.log(`Output: ${OUTPUT_FILE}`);
}

main();
