/**
 * Process MEF IRPEF income CSV into a clean per-comune income CSV.
 *
 * Input:  ../DATA/MEF/Redditi_e_principali_variabili_IRPEF_su_base_comunale_CSV_2023.csv
 * Output: public/data/population/income-by-comune.csv
 *
 * Extracts key indicators per comune:
 *  - PRO_COM_T (6-digit ISTAT code, joinable with boundaries)
 *  - comune, sigla_provincia, regione
 *  - contribuenti (number of taxpayers)
 *  - reddito_complessivo (total income in EUR)
 *  - reddito_imponibile (taxable income in EUR)
 *  - imposta_netta (net tax in EUR)
 *  - reddito_medio (average income per taxpayer)
 *
 * Source delimiter: semicolon (;)
 * Source encoding: UTF-8
 *
 * Usage: npx tsx scripts/process-income.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";

const INPUT_FILE = resolve(
  process.cwd(),
  "../DATA/MEF/Redditi_e_principali_variabili_IRPEF_su_base_comunale_CSV_2023.csv",
);
const OUTPUT_DIR = resolve(process.cwd(), "public/data/population");
const OUTPUT_FILE = join(OUTPUT_DIR, "income-by-comune.csv");

// Column indices in the source MEF CSV (semicolon-delimited)
const COL = {
  ANNO: 0,
  CODICE_ISTAT: 2,
  COMUNE: 3,
  SIGLA_PROV: 4,
  REGIONE: 5,
  CONTRIBUENTI: 7,
  REDDITO_IMPONIBILE_AMM: 23,
  IMPOSTA_NETTA_AMM: 25,
  REDDITO_COMPLESSIVO_AMM: 35,
} as const;

interface OutputRow {
  PRO_COM_T: string;
  comune: string;
  sigla_provincia: string;
  regione: string;
  anno_imposta: number;
  contribuenti: number;
  reddito_complessivo: number;
  reddito_imponibile: number;
  imposta_netta: number;
  reddito_medio: number;
}

function parseNum(val: string | undefined): number {
  if (!val || val === "" || val === "0") return 0;
  return parseInt(val, 10) || 0;
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const raw = readFileSync(INPUT_FILE, "utf-8").replace(/^\uFEFF/, "");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);

  console.log(`Read ${lines.length} lines (including header)`);

  const rows: OutputRow[] = [];
  let skipped = 0;

  // Skip header (line 0), process data lines
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");

    const codiceIstat = (cols[COL.CODICE_ISTAT] ?? "").trim();
    // Skip invalid rows (last row is "0;0;0...")
    if (!codiceIstat || codiceIstat === "0" || !/^\d{5,6}$/.test(codiceIstat)) {
      skipped++;
      continue;
    }

    // Pad to 6 digits for PRO_COM_T compatibility
    const proComT = codiceIstat.padStart(6, "0");

    const contribuenti = parseNum(cols[COL.CONTRIBUENTI]);
    const redditoComplessivo = parseNum(cols[COL.REDDITO_COMPLESSIVO_AMM]);
    const redditoImponibile = parseNum(cols[COL.REDDITO_IMPONIBILE_AMM]);
    const impostaNetta = parseNum(cols[COL.IMPOSTA_NETTA_AMM]);

    const redditoMedio =
      contribuenti > 0 ? Math.round(redditoComplessivo / contribuenti) : 0;

    rows.push({
      PRO_COM_T: proComT,
      comune: (cols[COL.COMUNE] ?? "").trim(),
      sigla_provincia: (cols[COL.SIGLA_PROV] ?? "").trim(),
      regione: (cols[COL.REGIONE] ?? "").trim(),
      anno_imposta: parseNum(cols[COL.ANNO]),
      contribuenti,
      reddito_complessivo: redditoComplessivo,
      reddito_imponibile: redditoImponibile,
      imposta_netta: impostaNetta,
      reddito_medio: redditoMedio,
    });
  }

  // Sort by PRO_COM_T for deterministic output
  rows.sort((a, b) => a.PRO_COM_T.localeCompare(b.PRO_COM_T));

  const csv = Papa.unparse(rows, { header: true });
  writeFileSync(OUTPUT_FILE, csv, "utf-8");

  // Print summary stats
  const totalContribuenti = rows.reduce((s, r) => s + r.contribuenti, 0);
  const avgReddito =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.reddito_medio, 0) / rows.length)
      : 0;

  console.log(`✓ Wrote ${rows.length} comuni to income-by-comune.csv`);
  console.log(`  Skipped ${skipped} invalid rows`);
  console.log(
    `  Total contribuenti: ${totalContribuenti.toLocaleString("it-IT")}`,
  );
  console.log(
    `  Avg reddito medio per comune: €${avgReddito.toLocaleString("it-IT")}`,
  );
  console.log(`  File size: ${(csv.length / 1024).toFixed(1)} KB`);
}

main();
