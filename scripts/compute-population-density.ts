/**
 * Compute population density per comune.
 *
 * Inputs:
 *   - public/data/boundaries/comuni.geojson (ISTAT: PRO_COM_T, SHAPE_AREA or computed area)
 *   - public/data/population/comuni-population.csv (ISTAT: codice_comune, popolazione)
 *
 * Method: densita = popolazione / area_km2
 * Area is computed from SHAPE_AREA (m²) if present, otherwise from geometry bbox estimate.
 *
 * Output: public/data/derived/population-density.csv
 *
 * Usage: npx tsx scripts/compute-population-density.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import Papa from "papaparse";

const DATA_DIR = resolve(process.cwd(), "public/data");
const BOUNDARIES_FILE = join(DATA_DIR, "boundaries/comuni.geojson");
const POP_FILE = join(DATA_DIR, "population/comuni-population.csv");
const OUTPUT_DIR = join(DATA_DIR, "derived");
const OUTPUT_FILE = join(OUTPUT_DIR, "population-density.csv");

interface PopRow {
  codice_comune: string;
  anno: string;
  popolazione: string;
}

function padProComT(v: string | number): string {
  return String(v).padStart(6, "0");
}

/**
 * Approximate area (km²) from a GeoJSON geometry using the Shoelace formula
 * on WGS84 coordinates. Not survey-grade but sufficient for density ranking.
 */
function approxAreaKm2(geometry: {
  type: string;
  coordinates: number[][][] | number[][][][];
}): number {
  const polygons =
    geometry.type === "MultiPolygon"
      ? (geometry.coordinates as number[][][][])
      : [geometry.coordinates as number[][][]];

  let totalArea = 0;
  for (const polygon of polygons) {
    const ring = polygon[0]; // outer ring
    if (!ring || ring.length < 3) continue;

    // Shoelace on projected coordinates (approximate mercator)
    const midLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const latRad = (midLat * Math.PI) / 180;
    const mPerDegLon = 111320 * Math.cos(latRad);
    const mPerDegLat = 110540;

    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      const x1 = ring[i][0] * mPerDegLon;
      const y1 = ring[i][1] * mPerDegLat;
      const x2 = ring[j][0] * mPerDegLon;
      const y2 = ring[j][1] * mPerDegLat;
      area += x1 * y2 - x2 * y1;
    }
    totalArea += Math.abs(area) / 2;
  }

  return totalArea / 1e6; // m² → km²
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load boundaries
  const geoRaw = readFileSync(BOUNDARIES_FILE, "utf-8");
  const geojson = JSON.parse(geoRaw);
  const features: {
    properties: Record<string, string | number>;
    geometry: { type: string; coordinates: number[][][] | number[][][][] };
  }[] = geojson.features ?? [];
  console.log(`Loaded ${features.length} comune boundaries`);

  // Build area lookup: PRO_COM_T → area_km2
  const areaMap = new Map<
    string,
    { area: number; nome: string; provincia: string; regione: string }
  >();
  for (const f of features) {
    const key = padProComT(f.properties.PRO_COM_T);
    const shapeArea = f.properties.SHAPE_AREA ?? f.properties.Shape_Area;
    const area = shapeArea
      ? Number(shapeArea) / 1e6 // m² → km²
      : approxAreaKm2(f.geometry);

    areaMap.set(key, {
      area: Math.round(area * 100) / 100,
      nome: String(f.properties.COMUNE ?? f.properties.NOME_COM ?? ""),
      provincia: String(f.properties.DEN_PROV ?? f.properties.COD_PROV ?? ""),
      regione: String(f.properties.DEN_REG ?? f.properties.COD_REG ?? ""),
    });
  }

  // Load population
  const popRaw = readFileSync(POP_FILE, "utf-8");
  const popRows = Papa.parse<PopRow>(popRaw, {
    header: true,
    skipEmptyLines: true,
  }).data;

  const popMap = new Map<string, number>();
  for (const r of popRows) {
    popMap.set(padProComT(r.codice_comune), parseInt(r.popolazione, 10) || 0);
  }
  console.log(`Loaded ${popMap.size} population records`);

  // Compute density
  const header =
    "PRO_COM_T,comune,provincia,regione,popolazione,area_km2,densita_ab_km2";
  const lines: string[] = [];
  let matched = 0;

  for (const [key, info] of areaMap) {
    const pop = popMap.get(key);
    if (pop === undefined) continue;
    if (info.area <= 0) continue;

    const density = Math.round((pop / info.area) * 10) / 10;
    lines.push(
      [
        key,
        `"${info.nome}"`,
        `"${info.provincia}"`,
        `"${info.regione}"`,
        pop,
        info.area,
        density,
      ].join(","),
    );
    matched++;
  }

  lines.sort((a, b) => a.localeCompare(b));
  const output = [header, ...lines].join("\n");
  writeFileSync(OUTPUT_FILE, output, "utf-8");

  // Summary
  const densities = lines.map((l) => parseFloat(l.split(",")[6]));
  const avg = Math.round(
    densities.reduce((a, b) => a + b, 0) / densities.length,
  );
  const max = Math.max(...densities);
  const maxLine = lines[densities.indexOf(max)];
  const maxComune = maxLine?.split(",")[1]?.replace(/"/g, "");

  console.log(`\nResults:`);
  console.log(`  Matched: ${matched} comuni`);
  console.log(`  Densità media: ${avg} ab/km²`);
  console.log(`  Densità max: ${max} ab/km² (${maxComune})`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

main();
