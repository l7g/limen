/**
 * Geographic scoping utilities — region list, province→region lookup,
 * and CSV row filtering by geographic scope.
 */

import type { GeoScope } from "@/lib/datasets/types";

// ── Static Region List (ISTAT codes) ──────────────────────────────

export interface RegionInfo {
  code: number;
  name: string;
}

export const REGIONS: RegionInfo[] = [
  { code: 1, name: "Piemonte" },
  { code: 2, name: "Valle d'Aosta" },
  { code: 3, name: "Lombardia" },
  { code: 4, name: "Trentino-Alto Adige" },
  { code: 5, name: "Veneto" },
  { code: 6, name: "Friuli-Venezia Giulia" },
  { code: 7, name: "Liguria" },
  { code: 8, name: "Emilia-Romagna" },
  { code: 9, name: "Toscana" },
  { code: 10, name: "Umbria" },
  { code: 11, name: "Marche" },
  { code: 12, name: "Lazio" },
  { code: 13, name: "Abruzzo" },
  { code: 14, name: "Molise" },
  { code: 15, name: "Campania" },
  { code: 16, name: "Puglia" },
  { code: 17, name: "Basilicata" },
  { code: 18, name: "Calabria" },
  { code: 19, name: "Sicilia" },
  { code: 20, name: "Sardegna" },
];

// ── Province → Region Mapping (from ISTAT boundaries) ─────────────

/** COD_PROV → COD_REG. Covers all 107 Italian provinces. */
const PROV_TO_REG: Record<number, number> = {
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 1,
  6: 1,
  96: 1,
  103: 1,
  7: 2,
  8: 7,
  9: 7,
  10: 7,
  11: 7,
  12: 3,
  13: 3,
  14: 3,
  15: 3,
  16: 3,
  17: 3,
  18: 3,
  19: 3,
  20: 3,
  97: 3,
  98: 3,
  108: 3,
  21: 4,
  22: 4,
  23: 5,
  24: 5,
  25: 5,
  26: 5,
  27: 5,
  28: 5,
  29: 5,
  30: 6,
  31: 6,
  32: 6,
  93: 6,
  33: 8,
  34: 8,
  35: 8,
  36: 8,
  37: 8,
  38: 8,
  39: 8,
  40: 8,
  99: 8,
  41: 11,
  42: 11,
  43: 11,
  44: 11,
  109: 11,
  45: 9,
  46: 9,
  47: 9,
  48: 9,
  49: 9,
  50: 9,
  51: 9,
  52: 9,
  53: 9,
  100: 9,
  54: 10,
  55: 10,
  56: 12,
  57: 12,
  58: 12,
  59: 12,
  60: 12,
  61: 15,
  62: 15,
  63: 15,
  64: 15,
  65: 15,
  66: 13,
  67: 13,
  68: 13,
  69: 13,
  70: 14,
  94: 14,
  71: 16,
  72: 16,
  73: 16,
  74: 16,
  75: 16,
  110: 16,
  76: 17,
  77: 17,
  78: 18,
  79: 18,
  80: 18,
  101: 18,
  102: 18,
  81: 19,
  82: 19,
  83: 19,
  84: 19,
  85: 19,
  86: 19,
  87: 19,
  88: 19,
  89: 19,
  90: 20,
  91: 20,
  92: 20,
  95: 20,
  111: 20,
};

/** Get region code for a province code. */
export function regionForProvince(codProv: number): number | undefined {
  return PROV_TO_REG[codProv];
}

/** Get region code from PRO_COM_T string (first 3 digits = province). */
export function regionForComune(proComT: string): number | undefined {
  const codProv = parseInt(proComT.substring(0, 3), 10);
  return PROV_TO_REG[codProv];
}

/** Get set of province codes belonging to a region. */
export function provincesInRegion(codReg: number): Set<number> {
  const set = new Set<number>();
  for (const [prov, reg] of Object.entries(PROV_TO_REG)) {
    if (reg === codReg) set.add(Number(prov));
  }
  return set;
}

// ── GeoJSON Feature Filtering ──────────────────────────────────────

/** Filter a FeatureCollection to only features within the geoScope. */
export function filterFeaturesByScope(
  geojson: GeoJSON.FeatureCollection,
  scope: GeoScope,
): GeoJSON.FeatureCollection {
  const features = geojson.features.filter((f) => {
    const props = f.properties ?? {};
    if (scope.type === "regione") {
      return Number(props.COD_REG) === scope.code;
    }
    return Number(props.COD_PROV) === scope.code;
  });
  return { type: "FeatureCollection", features };
}

// ── CSV Row Filtering ──────────────────────────────────────────────

/**
 * Check if a CSV row (parsed as Record<string, string>) belongs to a given region.
 *
 * Strategy per indicator:
 *  - If row has "regione" column → match by region name or code
 *  - If row has "PRO_COM_T" or "codice_comune" → derive province → lookup region
 *  - If row has "COD_PROV" → lookup region directly
 */
export function rowMatchesScope(
  row: Record<string, string>,
  scope: GeoScope,
  joinKey: string,
): boolean {
  if (scope.type === "regione") {
    // Direct region column?
    if (row.regione !== undefined) {
      const regVal = row.regione;
      // Could be name ("Piemonte") or numeric code ("1")
      const asNum = parseInt(regVal, 10);
      if (!isNaN(asNum)) return asNum === scope.code;
      return regVal === scope.name;
    }

    // Province-level data
    if (row.COD_PROV !== undefined) {
      const codProv = parseInt(row.COD_PROV, 10);
      return regionForProvince(codProv) === scope.code;
    }

    // Comune-level via join key
    const comKey = row[joinKey] ?? row.PRO_COM_T ?? row.codice_comune ?? "";
    if (comKey) {
      return regionForComune(comKey.padStart(6, "0")) === scope.code;
    }

    return true; // No column to filter on — include
  }

  // Province scope
  if (row.COD_PROV !== undefined) {
    return parseInt(row.COD_PROV, 10) === scope.code;
  }
  const comKey = row[joinKey] ?? row.PRO_COM_T ?? row.codice_comune ?? "";
  if (comKey) {
    const codProv = parseInt(comKey.padStart(6, "0").substring(0, 3), 10);
    return codProv === scope.code;
  }
  return true;
}
