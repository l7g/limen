/**
 * Convert GTFS stops.txt files from Sardinia transit operators into GeoJSON.
 *
 * Reads stops.txt from each operator directory in ../../DATA/,
 * outputs a single combined GeoJSON and per-operator files.
 *
 * Output: public/data/transit/{operator}-stops.geojson
 *         public/data/transit/all-stops.geojson
 *
 * Usage:
 *   npx tsx scripts/process-gtfs-stops.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const DATA_ROOT = resolve(process.cwd(), "../DATA");
const OUTPUT_DIR = resolve(process.cwd(), "public/data/transit");

interface GtfsStop {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  [key: string]: string;
}

interface Operator {
  id: string;
  label: string;
  /** Path to stops.txt relative to DATA_ROOT */
  stopsPath: string;
}

const OPERATORS: Operator[] = [
  { id: "arst", label: "ARST", stopsPath: "ARST/arst-cagliari-it/stops.txt" },
  { id: "ctm", label: "CTM", stopsPath: "CTM/ctm-it/stops.txt" },
  { id: "atp-sassari", label: "ATP Sassari", stopsPath: "ATP/stops.txt" },
  { id: "atp-nuoro", label: "ATP Nuoro", stopsPath: "ATP_NU/stops.txt" },
  { id: "aspo", label: "ASPO", stopsPath: "ASPO/stops.txt" },
  { id: "trenitalia", label: "Trenitalia", stopsPath: "TRENITALIA/stops.txt" },
];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseStopsCsv(csv: string): GtfsStop[] {
  const lines = csv.trim().split("\n");
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (values[i] ?? "").trim();
    });
    return obj as GtfsStop;
  });
}

function stopsToGeoJson(
  stops: GtfsStop[],
  operatorLabel: string,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const stop of stops) {
    const lat = parseFloat(stop.stop_lat);
    const lon = parseFloat(stop.stop_lon);
    if (isNaN(lat) || isNaN(lon)) continue;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        stop_id: stop.stop_id,
        stop_name: stop.stop_name,
        operator: operatorLabel,
        ...(stop.stop_code && { stop_code: stop.stop_code }),
        ...(stop.zone_id && { zone_id: stop.zone_id }),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

// ── Main ────────────────────────────────────────────────

mkdirSync(OUTPUT_DIR, { recursive: true });

let totalStops = 0;
const allFeatures: GeoJSON.Feature[] = [];

for (const op of OPERATORS) {
  const stopsFile = join(DATA_ROOT, op.stopsPath);
  let csv: string;

  try {
    csv = readFileSync(stopsFile, "utf-8");
  } catch {
    console.warn(`⚠ Skipping ${op.id}: ${stopsFile} not found`);
    continue;
  }

  const stops = parseStopsCsv(csv);
  const geojson = stopsToGeoJson(stops, op.label);
  const count = geojson.features.length;
  totalStops += count;

  // Per-operator file
  const outPath = join(OUTPUT_DIR, `${op.id}-stops.geojson`);
  writeFileSync(outPath, JSON.stringify(geojson));
  console.log(`✓ ${op.label}: ${count} stops → ${outPath}`);

  allFeatures.push(...geojson.features);
}

// Combined file
const combined: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: allFeatures,
};
const combinedPath = join(OUTPUT_DIR, "all-stops.geojson");
writeFileSync(combinedPath, JSON.stringify(combined));
console.log(`\n✓ Combined: ${totalStops} stops → ${combinedPath}`);
