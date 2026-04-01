/**
 * Choropleth data engine — loads CSV data, joins to GeoJSON, computes quantile breaks.
 *
 * Each "indicator" defines: CSV path, join key, and available numeric fields.
 * The engine fetches CSV on demand, builds a lookup map keyed by the join field,
 * and injects values into GeoJSON feature properties for MapLibre's data-driven styling.
 */

import Papa from "papaparse";

// ── Indicator Definitions ──────────────────────────────────────────

export interface IndicatorDef {
  /** Unique id — matches layer id in store. */
  id: string;
  label: string;
  /** Path relative to /data/ */
  csv: string;
  /** CSV column used to join to GeoJSON. */
  joinKey: string;
  /** Which boundary level this joins to. */
  scale: "comunale" | "provinciale";
  /** Numeric fields available for coloring. */
  fields: { key: string; label: string; unit?: string }[];
  /** Default field to color by. */
  defaultField: string;
}

export const INDICATORS: IndicatorDef[] = [
  {
    id: "population",
    label: "Popolazione",
    csv: "population/comuni-population.csv",
    joinKey: "codice_comune",
    scale: "comunale",
    fields: [{ key: "popolazione", label: "Popolazione", unit: "ab." }],
    defaultField: "popolazione",
  },
  {
    id: "density",
    label: "Densità Demografica",
    csv: "derived/population-density.csv",
    joinKey: "PRO_COM_T",
    scale: "comunale",
    fields: [
      { key: "densita_ab_km2", label: "Densità", unit: "ab./km²" },
      { key: "area_km2", label: "Superficie", unit: "km²" },
    ],
    defaultField: "densita_ab_km2",
  },
  {
    id: "income",
    label: "Reddito Pro Capite",
    csv: "derived/income-per-capita.csv",
    joinKey: "PRO_COM_T",
    scale: "comunale",
    fields: [
      { key: "reddito_pro_capite", label: "Reddito pro capite", unit: "€" },
      {
        key: "reddito_medio_contribuente",
        label: "Reddito medio contribuente",
        unit: "€",
      },
      { key: "pressione_fiscale", label: "Pressione fiscale", unit: "%" },
    ],
    defaultField: "reddito_pro_capite",
  },
  {
    id: "commuters",
    label: "Bilancio Pendolari",
    csv: "derived/commuter-balance.csv",
    joinKey: "PRO_COM_T",
    scale: "comunale",
    fields: [
      { key: "bilancio_per_1000", label: "Bilancio per 1.000 ab.", unit: "‰" },
      { key: "bilancio_pendolari", label: "Bilancio assoluto" },
      { key: "pendolari_in_entrata", label: "In entrata" },
      { key: "pendolari_in_uscita", label: "In uscita" },
    ],
    defaultField: "bilancio_per_1000",
  },
  {
    id: "vehicles",
    label: "Tasso di Motorizzazione",
    csv: "derived/motorization-rate.csv",
    joinKey: "COD_PROV",
    scale: "provinciale",
    fields: [
      { key: "veicoli_per_1000", label: "Veicoli per 1.000 ab." },
      { key: "auto_per_1000", label: "Auto per 1.000 ab." },
    ],
    defaultField: "veicoli_per_1000",
  },
  {
    id: "emissions",
    label: "Emissioni Veicolari",
    csv: "derived/emissions-by-province.csv",
    joinKey: "COD_PROV",
    scale: "provinciale",
    fields: [
      { key: "co2_tonnellate_anno", label: "CO₂", unit: "t/anno" },
      { key: "nox_kg_anno", label: "NOx", unit: "kg/anno" },
      { key: "pm25_kg_anno", label: "PM2.5", unit: "kg/anno" },
      { key: "co2_per_veicolo_kg", label: "CO₂ per veicolo", unit: "kg" },
    ],
    defaultField: "co2_tonnellate_anno",
  },
  {
    id: "demographics",
    label: "Indicatori Demografici",
    csv: "derived/demographic-indicators.csv",
    joinKey: "PRO_COM_T",
    scale: "comunale",
    fields: [
      { key: "indice_vecchiaia", label: "Indice di vecchiaia", unit: "%" },
      { key: "indice_dipendenza", label: "Indice di dipendenza", unit: "%" },
      { key: "pct_giovani", label: "% Giovani (0-14)", unit: "%" },
      { key: "pct_anziani", label: "% Anziani (65+)", unit: "%" },
      {
        key: "rapporto_mascolinita",
        label: "Rapporto mascolinit\u00e0",
        unit: "%",
      },
    ],
    defaultField: "indice_vecchiaia",
  },
];

// ── CSV Cache ──────────────────────────────────────────────────────

/** Parsed CSV rows keyed by join field value → Record<field, number>. */
type DataMap = Map<string, Record<string, number>>;

const cache = new Map<string, DataMap>();

/** Fetch + parse CSV, return a lookup map keyed by joinKey. */
async function loadCSV(csvPath: string, joinKey: string): Promise<DataMap> {
  const cacheKey = csvPath;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const resp = await fetch(`/data/${csvPath}`);
  const text = await resp.text();

  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const map: DataMap = new Map();
  for (const row of data) {
    const key = row[joinKey]?.trim();
    if (!key) continue;
    const nums: Record<string, number> = {};
    for (const [col, val] of Object.entries(row)) {
      if (col === joinKey) continue;
      const n = parseFloat(val);
      if (!isNaN(n)) nums[col] = n;
    }
    map.set(key, nums);
  }

  cache.set(cacheKey, map);
  return map;
}

// ── GeoJSON Enrichment ─────────────────────────────────────────────

/**
 * Given a GeoJSON FeatureCollection and an indicator, returns a NEW FeatureCollection
 * with numeric fields injected into each feature's properties.
 *
 * GeoJSON join keys:
 *  - comunale: feature.properties.PRO_COM_T → padded to 6 digits
 *  - provinciale: feature.properties.COD_PROV → as string
 */
export async function enrichGeoJSON(
  geojson: GeoJSON.FeatureCollection,
  indicator: IndicatorDef,
): Promise<GeoJSON.FeatureCollection> {
  const dataMap = await loadCSV(indicator.csv, indicator.joinKey);

  const features = geojson.features.map((f) => {
    const props = f.properties ?? {};
    let joinVal: string;

    if (indicator.scale === "comunale") {
      // GeoJSON has PRO_COM_T as "001001" or codice_comune as "001001"
      joinVal = String(props["PRO_COM_T"] ?? "").padStart(6, "0");
    } else {
      // Province: COD_PROV is a number in GeoJSON, CSV has it as string
      joinVal = String(props["COD_PROV"] ?? "");
    }

    const row = dataMap.get(joinVal);
    if (row) {
      return { ...f, properties: { ...props, ...row, _joined: true } };
    }
    return { ...f, properties: { ...props, _joined: false } };
  });

  return { type: "FeatureCollection", features };
}

// ── Quantile Breaks ────────────────────────────────────────────────

/** Compute quantile break values for N classes. Returns N-1 break points. */
export function quantileBreaks(values: number[], nClasses: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const breaks: number[] = [];
  for (let i = 1; i < nClasses; i++) {
    const idx = Math.floor((i / nClasses) * sorted.length);
    breaks.push(sorted[idx]);
  }
  return breaks;
}

/** Extract all numeric values for a given field from enriched GeoJSON. */
export function extractValues(
  geojson: GeoJSON.FeatureCollection,
  field: string,
): number[] {
  const values: number[] = [];
  for (const f of geojson.features) {
    const v = f.properties?.[field];
    if (typeof v === "number" && isFinite(v)) values.push(v);
  }
  return values;
}

// ── Color Palettes ─────────────────────────────────────────────────

/** Sequential 5-class palettes (light → dark). */
export const PALETTES = {
  teal: ["#d1fae5", "#6ee7b7", "#34d399", "#10b981", "#047857"],
  blue: ["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"],
  purple: ["#ede9fe", "#c4b5fd", "#a78bfa", "#8b5cf6", "#6d28d9"],
  orange: ["#ffedd5", "#fdba74", "#fb923c", "#f97316", "#c2410c"],
  red: ["#fee2e2", "#fca5a5", "#f87171", "#ef4444", "#b91c1c"],
  /** Diverging: red → white → blue. For commuter balance. */
  diverging: ["#b91c1c", "#fca5a5", "#f5f5f5", "#93c5fd", "#1d4ed8"],
} as const;

export type PaletteKey = keyof typeof PALETTES;

/** Default palette per indicator. */
export const INDICATOR_PALETTES: Record<string, PaletteKey> = {
  population: "teal",
  density: "orange",
  income: "blue",
  commuters: "diverging",
  vehicles: "purple",
  emissions: "red",
  demographics: "orange",
};

/**
 * Build a MapLibre "step" expression for fill-color based on breaks + palette.
 * Returns a style expression: ["step", ["get", field], color0, break1, color1, ...]
 */
export function buildStepExpression(
  field: string,
  breaks: number[],
  palette: readonly string[],
): unknown[] {
  // For features without data, use transparent
  const expr: unknown[] = [
    "case",
    ["==", ["get", "_joined"], true],
    [
      "step",
      ["coalesce", ["get", field], 0],
      palette[0],
      ...breaks.flatMap((b, i) => [b, palette[i + 1]]),
    ],
    "rgba(0,0,0,0)", // No data → transparent
  ];
  return expr;
}
