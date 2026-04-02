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

export interface ProvinceInfo {
  code: number;
  name: string;
  regionCode: number;
  sigla: string;
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

// ── Static Province List (ISTAT codes, sorted alphabetically) ─────

export const PROVINCES: ProvinceInfo[] = [
  { code: 84, name: "Agrigento", regionCode: 19, sigla: "AG" },
  { code: 6, name: "Alessandria", regionCode: 1, sigla: "AL" },
  { code: 42, name: "Ancona", regionCode: 11, sigla: "AN" },
  { code: 7, name: "Aosta", regionCode: 2, sigla: "AO" },
  { code: 51, name: "Arezzo", regionCode: 9, sigla: "AR" },
  { code: 44, name: "Ascoli Piceno", regionCode: 11, sigla: "AP" },
  { code: 5, name: "Asti", regionCode: 1, sigla: "AT" },
  { code: 64, name: "Avellino", regionCode: 15, sigla: "AV" },
  { code: 72, name: "Bari", regionCode: 16, sigla: "BA" },
  { code: 110, name: "Barletta-Andria-Trani", regionCode: 16, sigla: "BT" },
  { code: 25, name: "Belluno", regionCode: 5, sigla: "BL" },
  { code: 62, name: "Benevento", regionCode: 15, sigla: "BN" },
  { code: 16, name: "Bergamo", regionCode: 3, sigla: "BG" },
  { code: 96, name: "Biella", regionCode: 1, sigla: "BI" },
  { code: 37, name: "Bologna", regionCode: 8, sigla: "BO" },
  { code: 21, name: "Bolzano", regionCode: 4, sigla: "BZ" },
  { code: 17, name: "Brescia", regionCode: 3, sigla: "BS" },
  { code: 74, name: "Brindisi", regionCode: 16, sigla: "BR" },
  { code: 92, name: "Cagliari", regionCode: 20, sigla: "CA" },
  { code: 85, name: "Caltanissetta", regionCode: 19, sigla: "CL" },
  { code: 70, name: "Campobasso", regionCode: 14, sigla: "CB" },
  { code: 61, name: "Caserta", regionCode: 15, sigla: "CE" },
  { code: 87, name: "Catania", regionCode: 19, sigla: "CT" },
  { code: 79, name: "Catanzaro", regionCode: 18, sigla: "CZ" },
  { code: 69, name: "Chieti", regionCode: 13, sigla: "CH" },
  { code: 13, name: "Como", regionCode: 3, sigla: "CO" },
  { code: 78, name: "Cosenza", regionCode: 18, sigla: "CS" },
  { code: 19, name: "Cremona", regionCode: 3, sigla: "CR" },
  { code: 101, name: "Crotone", regionCode: 18, sigla: "KR" },
  { code: 4, name: "Cuneo", regionCode: 1, sigla: "CN" },
  { code: 86, name: "Enna", regionCode: 19, sigla: "EN" },
  { code: 109, name: "Fermo", regionCode: 11, sigla: "FM" },
  { code: 38, name: "Ferrara", regionCode: 8, sigla: "FE" },
  { code: 48, name: "Firenze", regionCode: 9, sigla: "FI" },
  { code: 71, name: "Foggia", regionCode: 16, sigla: "FG" },
  { code: 40, name: "Forlì-Cesena", regionCode: 8, sigla: "FC" },
  { code: 60, name: "Frosinone", regionCode: 12, sigla: "FR" },
  { code: 10, name: "Genova", regionCode: 7, sigla: "GE" },
  { code: 31, name: "Gorizia", regionCode: 6, sigla: "GO" },
  { code: 53, name: "Grosseto", regionCode: 9, sigla: "GR" },
  { code: 8, name: "Imperia", regionCode: 7, sigla: "IM" },
  { code: 94, name: "Isernia", regionCode: 14, sigla: "IS" },
  { code: 66, name: "L'Aquila", regionCode: 13, sigla: "AQ" },
  { code: 11, name: "La Spezia", regionCode: 7, sigla: "SP" },
  { code: 59, name: "Latina", regionCode: 12, sigla: "LT" },
  { code: 75, name: "Lecce", regionCode: 16, sigla: "LE" },
  { code: 97, name: "Lecco", regionCode: 3, sigla: "LC" },
  { code: 49, name: "Livorno", regionCode: 9, sigla: "LI" },
  { code: 98, name: "Lodi", regionCode: 3, sigla: "LO" },
  { code: 46, name: "Lucca", regionCode: 9, sigla: "LU" },
  { code: 43, name: "Macerata", regionCode: 11, sigla: "MC" },
  { code: 20, name: "Mantova", regionCode: 3, sigla: "MN" },
  { code: 45, name: "Massa Carrara", regionCode: 9, sigla: "MS" },
  { code: 77, name: "Matera", regionCode: 17, sigla: "MT" },
  { code: 83, name: "Messina", regionCode: 19, sigla: "ME" },
  { code: 15, name: "Milano", regionCode: 3, sigla: "MI" },
  { code: 36, name: "Modena", regionCode: 8, sigla: "MO" },
  { code: 108, name: "Monza e della Brianza", regionCode: 3, sigla: "MB" },
  { code: 63, name: "Napoli", regionCode: 15, sigla: "NA" },
  { code: 3, name: "Novara", regionCode: 1, sigla: "NO" },
  { code: 91, name: "Nuoro", regionCode: 20, sigla: "NU" },
  { code: 95, name: "Oristano", regionCode: 20, sigla: "OR" },
  { code: 28, name: "Padova", regionCode: 5, sigla: "PD" },
  { code: 82, name: "Palermo", regionCode: 19, sigla: "PA" },
  { code: 34, name: "Parma", regionCode: 8, sigla: "PR" },
  { code: 18, name: "Pavia", regionCode: 3, sigla: "PV" },
  { code: 54, name: "Perugia", regionCode: 10, sigla: "PG" },
  { code: 41, name: "Pesaro e Urbino", regionCode: 11, sigla: "PU" },
  { code: 68, name: "Pescara", regionCode: 13, sigla: "PE" },
  { code: 33, name: "Piacenza", regionCode: 8, sigla: "PC" },
  { code: 50, name: "Pisa", regionCode: 9, sigla: "PI" },
  { code: 47, name: "Pistoia", regionCode: 9, sigla: "PT" },
  { code: 93, name: "Pordenone", regionCode: 6, sigla: "PN" },
  { code: 76, name: "Potenza", regionCode: 17, sigla: "PZ" },
  { code: 100, name: "Prato", regionCode: 9, sigla: "PO" },
  { code: 88, name: "Ragusa", regionCode: 19, sigla: "RG" },
  { code: 39, name: "Ravenna", regionCode: 8, sigla: "RA" },
  { code: 80, name: "Reggio di Calabria", regionCode: 18, sigla: "RC" },
  { code: 35, name: "Reggio nell'Emilia", regionCode: 8, sigla: "RE" },
  { code: 57, name: "Rieti", regionCode: 12, sigla: "RI" },
  { code: 99, name: "Rimini", regionCode: 8, sigla: "RN" },
  { code: 58, name: "Roma", regionCode: 12, sigla: "RM" },
  { code: 29, name: "Rovigo", regionCode: 5, sigla: "RO" },
  { code: 65, name: "Salerno", regionCode: 15, sigla: "SA" },
  { code: 90, name: "Sassari", regionCode: 20, sigla: "SS" },
  { code: 9, name: "Savona", regionCode: 7, sigla: "SV" },
  { code: 52, name: "Siena", regionCode: 9, sigla: "SI" },
  { code: 14, name: "Sondrio", regionCode: 3, sigla: "SO" },
  { code: 111, name: "Sud Sardegna", regionCode: 20, sigla: "SU" },
  { code: 89, name: "Siracusa", regionCode: 19, sigla: "SR" },
  { code: 73, name: "Taranto", regionCode: 16, sigla: "TA" },
  { code: 67, name: "Teramo", regionCode: 13, sigla: "TE" },
  { code: 55, name: "Terni", regionCode: 10, sigla: "TR" },
  { code: 1, name: "Torino", regionCode: 1, sigla: "TO" },
  { code: 81, name: "Trapani", regionCode: 19, sigla: "TP" },
  { code: 22, name: "Trento", regionCode: 4, sigla: "TN" },
  { code: 26, name: "Treviso", regionCode: 5, sigla: "TV" },
  { code: 32, name: "Trieste", regionCode: 6, sigla: "TS" },
  { code: 30, name: "Udine", regionCode: 6, sigla: "UD" },
  { code: 12, name: "Varese", regionCode: 3, sigla: "VA" },
  { code: 27, name: "Venezia", regionCode: 5, sigla: "VE" },
  { code: 103, name: "Verbano-Cusio-Ossola", regionCode: 1, sigla: "VB" },
  { code: 2, name: "Vercelli", regionCode: 1, sigla: "VC" },
  { code: 23, name: "Verona", regionCode: 5, sigla: "VR" },
  { code: 102, name: "Vibo Valentia", regionCode: 18, sigla: "VV" },
  { code: 24, name: "Vicenza", regionCode: 5, sigla: "VI" },
  { code: 56, name: "Viterbo", regionCode: 12, sigla: "VT" },
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
