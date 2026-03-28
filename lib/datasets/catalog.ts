import type { DatasetMeta } from "./types";

/**
 * Master dataset catalog.
 * Each entry describes a dataset's metadata, source, and freshness config.
 * Actual data files live in /public/data/ (processed) or ../DATA/ (raw).
 */
export const datasets: DatasetMeta[] = [
  // ── Tier 1: API-Fed ──────────────────────────────────────────────
  {
    id: "istat-boundaries-comuni",
    name: "Confini Comunali",
    tier: 1,
    source: "ISTAT",
    sourceUrl:
      "https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici/",
    description:
      "Poligoni dei 7.904 comuni italiani (versione generalizzata). Contiene codice ISTAT (PRO_COM_T), nome, provincia, regione, superficie e popolazione legale. Base per qualsiasi analisi a scala comunale — unibile con popolazione, redditi, veicoli e altri dataset tramite PRO_COM_T.",
    cadence: "annual",
    lastUpdated: "2025-01-01",
    nextExpectedUpdate: "2026-01-01",
    expectedPublishMonth: 1,
    expiryWarningDays: 30,
    status: "current",
    coverage: "italy",
    format: "geojson",
    category: "confini",
    license: "CC BY 3.0 IT",
    fetchScript: "scripts/fetch-boundaries.ts",
    filePath: "public/data/boundaries/comuni.geojson",
    geometryType: "polygon",
    joinField: "PRO_COM_T",
    scale: "comunale",
    isBoundary: true,
    acquisitionMethod: "download",
    group: "confini",
    groupLabel: "Confini Amministrativi",
  },
  {
    id: "istat-boundaries-province",
    name: "Confini Provinciali",
    tier: 1,
    source: "ISTAT",
    sourceUrl:
      "https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici/",
    description:
      "Poligoni delle 107 province/città metropolitane italiane. Contiene codice provincia (COD_PROV), nome, sigla automobilistica, regione e tipo (provincia o città metropolitana). Unibile con dati ACI veicoli e altri indicatori provinciali tramite COD_PROV.",
    cadence: "annual",
    lastUpdated: "2025-01-01",
    nextExpectedUpdate: "2026-01-01",
    expectedPublishMonth: 1,
    expiryWarningDays: 30,
    status: "current",
    coverage: "italy",
    format: "geojson",
    category: "confini",
    license: "CC BY 3.0 IT",
    fetchScript: "scripts/fetch-boundaries.ts",
    filePath: "public/data/boundaries/province.geojson",
    geometryType: "polygon",
    joinField: "COD_PROV",
    scale: "provinciale",
    isBoundary: true,
    acquisitionMethod: "download",
    group: "confini",
  },
  {
    id: "istat-boundaries-regioni",
    name: "Confini Regionali",
    tier: 1,
    source: "ISTAT",
    sourceUrl:
      "https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici/",
    description:
      "Poligoni delle 20 regioni italiane. Contiene codice regione (COD_REG), nome, ripartizione geografica e superficie. Utile come base cartografica per visualizzazioni a scala regionale.",
    cadence: "annual",
    lastUpdated: "2025-01-01",
    nextExpectedUpdate: "2026-01-01",
    expectedPublishMonth: 1,
    expiryWarningDays: 30,
    status: "current",
    coverage: "italy",
    format: "geojson",
    category: "confini",
    license: "CC BY 3.0 IT",
    fetchScript: "scripts/fetch-boundaries.ts",
    filePath: "public/data/boundaries/regioni.geojson",
    geometryType: "polygon",
    joinField: "COD_REG",
    scale: "regionale",
    isBoundary: true,
    acquisitionMethod: "download",
    group: "confini",
  },
  {
    id: "istat-population",
    name: "Popolazione Residente per Comune",
    tier: 1,
    source: "ISTAT",
    sourceUrl: "https://esploradati.istat.it/databrowser/",
    description:
      "Popolazione residente al 1° gennaio 2025 per tutti i 7.896 comuni italiani (fonte SDMX ISTAT, dataflow DCIS_POPRES1). Popolazione totale nazionale: 58.943.464 abitanti. Colonne: codice ISTAT a 6 cifre, anno, popolazione totale. Unibile con confini comunali e altri dataset tramite PRO_COM_T per calcolare indicatori pro-capite (motorizzazione, reddito, densità).",
    cadence: "annual",
    lastUpdated: "2026-03-28",
    nextExpectedUpdate: "2027-03-01",
    expectedPublishMonth: 1,
    expiryWarningDays: 60,
    status: "current",
    coverage: "italy",
    format: "csv",
    category: "demografia",
    license: "CC BY 3.0 IT",
    fetchScript: "scripts/fetch-population.ts",
    filePath: "public/data/population/comuni-population.csv",
    geometryType: "none",
    joinField: "PRO_COM_T",
    scale: "comunale",
    acquisitionMethod: "api",
  },
  {
    id: "gtfs-arst",
    name: "ARST — Autobus Regionali Sardegna",
    tier: 1,
    source: "ARST",
    sourceUrl: "https://www.arst.sardegna.it/",
    description:
      "Feed GTFS del servizio bus regionale ARST — il principale operatore extraurbano della Sardegna. Copre l'intera rete di autolinee che collega comuni rurali e centri urbani. Contiene fermate geolocalizzate, orari, percorsi e frequenze.",
    cadence: "quarterly",
    lastUpdated: "2026-01-23",
    expiryWarningDays: 14,
    status: "current",
    coverage: "sardinia",
    format: "gtfs",
    category: "trasporti",
    license: "Open Data",
    fetchScript: "scripts/fetch-gtfs.ts",
    filePath: "public/data/transit/arst-stops.geojson",
    geometryType: "point",
    acquisitionMethod: "download",
    group: "gtfs-sardegna",
    groupLabel: "Trasporto Pubblico Sardegna (GTFS)",
  },
  {
    id: "gtfs-ctm",
    name: "CTM — Trasporto Urbano Cagliari",
    tier: 1,
    source: "CTM",
    sourceUrl: "https://www.ctmcagliari.it/",
    description:
      "Feed GTFS del servizio bus urbano CTM — l'operatore del trasporto pubblico nell'area metropolitana di Cagliari. Copre le linee urbane e suburbane della città metropolitana. Contiene fermate, orari, percorsi e frequenze.",
    cadence: "quarterly",
    lastUpdated: "2026-01-23",
    expiryWarningDays: 14,
    status: "current",
    coverage: "sardinia",
    format: "gtfs",
    category: "trasporti",
    license: "Open Data",
    fetchScript: "scripts/fetch-gtfs.ts",
    filePath: "public/data/transit/ctm-stops.geojson",
    geometryType: "point",
    acquisitionMethod: "download",
    group: "gtfs-sardegna",
  },
  {
    id: "gtfs-atp-sassari",
    name: "ATP — Trasporto Urbano Sassari",
    tier: 1,
    source: "ATP Sassari",
    sourceUrl: "https://www.atpsassari.it/",
    description:
      "Feed GTFS del servizio bus ATP — trasporto urbano di Sassari e aree limitrofe. Contiene fermate geolocalizzate, orari e percorsi.",
    cadence: "quarterly",
    lastUpdated: "2026-01-23",
    expiryWarningDays: 14,
    status: "current",
    coverage: "sardinia",
    format: "gtfs",
    category: "trasporti",
    license: "Open Data",
    fetchScript: "scripts/fetch-gtfs.ts",
    filePath: "public/data/transit/atp-sassari-stops.geojson",
    geometryType: "point",
    acquisitionMethod: "download",
    group: "gtfs-sardegna",
  },
  {
    id: "gtfs-atp-nuoro",
    name: "ATP — Trasporto Urbano Nuoro",
    tier: 1,
    source: "ATP Nuoro",
    sourceUrl: "",
    description:
      "Feed GTFS del servizio bus ATP Nuoro — trasporto urbano di Nuoro. Contiene fermate geolocalizzate, orari e percorsi.",
    cadence: "quarterly",
    lastUpdated: "2026-01-23",
    expiryWarningDays: 14,
    status: "current",
    coverage: "sardinia",
    format: "gtfs",
    category: "trasporti",
    license: "Open Data",
    fetchScript: "scripts/fetch-gtfs.ts",
    filePath: "public/data/transit/atp-nuoro-stops.geojson",
    geometryType: "point",
    acquisitionMethod: "download",
    group: "gtfs-sardegna",
  },
  {
    id: "gtfs-aspo",
    name: "ASPO — Trasporto Urbano Olbia",
    tier: 1,
    source: "ASPO",
    sourceUrl: "",
    description:
      "Feed GTFS del servizio bus ASPO — trasporto urbano di Olbia e Golfo Aranci. Contiene fermate geolocalizzate, orari e percorsi.",
    cadence: "quarterly",
    lastUpdated: "2026-01-23",
    expiryWarningDays: 14,
    status: "current",
    coverage: "sardinia",
    format: "gtfs",
    category: "trasporti",
    license: "Open Data",
    fetchScript: "scripts/fetch-gtfs.ts",
    filePath: "public/data/transit/aspo-stops.geojson",
    geometryType: "point",
    acquisitionMethod: "download",
    group: "gtfs-sardegna",
  },
  {
    id: "gtfs-trenitalia",
    name: "Trenitalia — Ferrovie Sardegna",
    tier: 1,
    source: "Trenitalia",
    sourceUrl: "https://www.trenitalia.com/",
    description:
      "Feed GTFS del servizio ferroviario Trenitalia in Sardegna — la rete su ferro che collega Cagliari, Sassari, Olbia e Oristano. Contiene stazioni, orari e linee ferroviarie.",
    cadence: "quarterly",
    lastUpdated: "2026-01-23",
    expiryWarningDays: 14,
    status: "current",
    coverage: "sardinia",
    format: "gtfs",
    category: "trasporti",
    license: "Open Data",
    fetchScript: "scripts/fetch-gtfs.ts",
    filePath: "public/data/transit/trenitalia-stops.geojson",
    geometryType: "point",
    acquisitionMethod: "download",
    group: "gtfs-sardegna",
  },
  {
    id: "aci-vehicles",
    name: "Parco Veicolare Provinciale",
    tier: 1,
    source: "ACI",
    sourceUrl:
      "https://www.aci.it/laci/studi-e-ricerche/dati-e-statistiche/open-data.html",
    description:
      "Consistenza del parco veicolare per le 107 province italiane, disaggregato per categoria: autovetture, autocarri, motocicli, autobus, autoveicoli speciali, motocarri, rimorchi e trattori. Fonte ACI Autoritratto 2024 (Open Data). 55,6 milioni di veicoli totali, di cui 41,3 milioni di autovetture. Unibile con confini provinciali (COD_PROV) e popolazione per calcolare il tasso di motorizzazione.",
    cadence: "annual",
    lastUpdated: "2026-03-28",
    nextExpectedUpdate: "2027-06-01",
    expectedPublishMonth: 6,
    expiryWarningDays: 60,
    status: "current",
    coverage: "italy",
    format: "csv",
    category: "veicoli",
    license: "Open Data",
    filePath: "public/data/vehicles/fleet-by-province.csv",
    geometryType: "none",
    joinField: "COD_PROV",
    scale: "provinciale",
    acquisitionMethod: "download",
  },

  // ── Tier 2: Curated Static ───────────────────────────────────────
  {
    id: "istat-pendolarismo",
    name: "Matrice del Pendolarismo",
    tier: 2,
    source: "ISTAT",
    sourceUrl:
      "https://www.istat.it/statistiche/censimento-permanente/censimento-popolazione/pendolarismo/",
    description:
      "Matrice origine-destinazione degli spostamenti quotidiani per studio e lavoro (Censimento permanente 2021). Contiene 524.000 flussi con comune di partenza, comune di arrivo, mezzo di trasporto e motivo. Unibile con confini comunali per visualizzare i corridoi di mobilità e identificare poli attrattori.",
    cadence: "decennial",
    lastUpdated: "2023-12-01",
    expiryWarningDays: 365,
    status: "current",
    coverage: "italy",
    format: "csv",
    category: "demografia",
    license: "CC BY 3.0 IT",
    filePath: "public/data/population/pendolarismo.csv",
    geometryType: "none",
    joinField: "PRO_COM_T",
    scale: "comunale",
    acquisitionMethod: "download",
  },
  // ISPRA emission factors: raw data exists (DATA/EMISSIONS/ISPRAMBIENTE/fe.xlsx)
  // Re-add when processing script is written.

  {
    id: "mef-income",
    name: "Redditi per Comune",
    tier: 2,
    source: "MEF",
    sourceUrl: "https://www.finanze.gov.it/",
    description:
      "Redditi IRPEF per comune dalle dichiarazioni fiscali 2023 (fonte MEF — Dipartimento delle Finanze). Copre 7.896 comuni italiani con numero di contribuenti, reddito complessivo, imponibile, imposta netta e reddito medio (media nazionale €21.431). Unibile con confini comunali tramite PRO_COM_T per mappe della ricchezza e disparità territoriale.",
    cadence: "annual",
    lastUpdated: "2026-03-28",
    nextExpectedUpdate: "2027-04-01",
    expectedPublishMonth: 4,
    expiryWarningDays: 60,
    status: "current",
    coverage: "italy",
    format: "csv",
    category: "economia",
    license: "Open Data",
    filePath: "public/data/population/income-by-comune.csv",
    geometryType: "none",
    joinField: "PRO_COM_T",
    scale: "comunale",
    acquisitionMethod: "download",
  },
  // MIUR schools: no raw data downloaded yet. Re-add when sourced.

  // ── Tier 3: Computed / Derived ───────────────────────────────────
  // PTAL: requires complex GTFS frequency analysis. Re-add when compute-ptal.ts is written.

  {
    id: "derived-motorization",
    name: "Tasso di Motorizzazione",
    tier: 3,
    source: "Limen (calcolato)",
    sourceUrl: "",
    description:
      "Numero di veicoli per 1.000 abitanti per provincia italiana — calcolato incrociando il parco veicolare ACI 2024 (55,6M veicoli) con la popolazione ISTAT 2025 (58,9M abitanti). Media nazionale: 982 veicoli/1.000 ab. Range: Milano (763) — Aosta (2.642). Include anche rapporto sole autovetture per 1.000 abitanti. Unibile con confini provinciali (COD_PROV) per mappe choropleth.",
    cadence: "annual",
    lastUpdated: "2026-03-28",
    expiryWarningDays: 60,
    status: "current",
    coverage: "italy",
    format: "csv",
    category: "indicatori",
    license: "CC BY 4.0",
    filePath: "public/data/derived/motorization-rate.csv",
    geometryType: "none",
    joinField: "COD_PROV",
    scale: "provinciale",
    acquisitionMethod: "derived",
  },
];

/** Lookup a single dataset by ID. */
export function getDataset(id: string): DatasetMeta | undefined {
  return datasets.find((d) => d.id === id);
}

/** Filter datasets by tier. */
export function getDatasetsByTier(tier: 1 | 2 | 3): DatasetMeta[] {
  return datasets.filter((d) => d.tier === tier);
}

/** Filter datasets by coverage. */
export function getDatasetsByCoverage(
  coverage: DatasetMeta["coverage"],
): DatasetMeta[] {
  return datasets.filter((d) => d.coverage === coverage);
}

/** Find datasets that share a joinField with the given dataset (merge candidates). */
export function getRelatedDatasets(id: string): DatasetMeta[] {
  const dataset = getDataset(id);
  if (!dataset?.joinField) return [];
  return datasets.filter(
    (d) => d.id !== id && d.joinField === dataset.joinField,
  );
}

/**
 * Get catalog entries for display: one entry per ungrouped dataset,
 * one entry per group (uses the member with groupLabel as representative).
 */
export function getCatalogDisplayEntries(): DatasetMeta[] {
  const seen = new Set<string>();
  const result: DatasetMeta[] = [];

  for (const d of datasets) {
    if (!d.group) {
      result.push(d);
    } else if (!seen.has(d.group)) {
      seen.add(d.group);
      // Prefer the member with groupLabel set as the representative
      const representative =
        datasets.find((m) => m.group === d.group && m.groupLabel) ?? d;
      result.push(representative);
    }
  }

  return result;
}

/** Get all members of a dataset group. */
export function getGroupMembers(group: string): DatasetMeta[] {
  return datasets.filter((d) => d.group === group);
}
