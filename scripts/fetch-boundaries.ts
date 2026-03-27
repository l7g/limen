/**
 * Produce simplified GeoJSON boundary files from ISTAT administrative boundaries.
 *
 * Two modes:
 *   Local (default):  reads shapefiles from ../../DATA/ISTAT/confini_amministrativi/
 *   API (--from-api): fetches from ISTAT WFS geoserver (for CI / GitHub Actions)
 *
 * Pipeline: source → mapshaper simplify → truncate coords → write GeoJSON
 *
 * Output: public/data/boundaries/{comuni,province,regioni}.geojson
 *
 * Usage:
 *   npx tsx scripts/fetch-boundaries.ts            # local shapefiles
 *   npx tsx scripts/fetch-boundaries.ts --from-api  # ISTAT WFS
 *   npx tsx scripts/fetch-boundaries.ts --no-simplify  # skip simplification
 */

import { read } from "shapefile";
import mapshaper from "mapshaper";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_ROOT = resolve(
  process.cwd(),
  "../DATA/ISTAT/confini_amministrativi",
);
const OUTPUT_DIR = resolve(process.cwd(), "public/data/boundaries");

/**
 * Simplification percentage per layer.
 * Lower = more aggressive simplification = smaller file.
 * Visvalingam method preserves shape better for cartographic boundaries.
 *
 * Targets:
 *   regioni  → ~1.5 MB  (from ~27 MB, keep 5% of vertices)
 *   province → ~3 MB    (from ~47 MB, keep 5%)
 *   comuni   → ~15 MB   (from ~243 MB, keep 5%)
 */
const BOUNDARIES = [
  {
    name: "regioni",
    folder: "Reg01012025",
    file: "Reg01012025_WGS84",
    wfsLayer: "Reg01012025_WGS84",
    simplifyPct: "5%",
  },
  {
    name: "province",
    folder: "ProvCM01012025",
    file: "ProvCM01012025_WGS84",
    wfsLayer: "ProvCM01012025_WGS84",
    simplifyPct: "5%",
  },
  {
    name: "comuni",
    folder: "Com01012025",
    file: "Com01012025_WGS84",
    wfsLayer: "Com01012025_WGS84",
    simplifyPct: "5%",
  },
] as const;

const WFS_BASE =
  "https://geoserver.istat.it/geoserver/confini/ows" +
  "?service=WFS&version=1.1.0&request=GetFeature" +
  "&outputFormat=application/json&srsName=EPSG:4326";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchFromWFS(
  wfsLayer: string,
): Promise<GeoJSON.FeatureCollection> {
  const url = `${WFS_BASE}&typeName=confini:${wfsLayer}`;
  console.log(`  WFS request: ${wfsLayer} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WFS ${res.status}: ${res.statusText}`);
  return (await res.json()) as GeoJSON.FeatureCollection;
}

async function readLocal(
  folder: string,
  file: string,
): Promise<GeoJSON.FeatureCollection> {
  const shpPath = resolve(DATA_ROOT, folder, `${file}.shp`);
  const dbfPath = resolve(DATA_ROOT, folder, `${file}.dbf`);
  console.log(`  Local: ${shpPath}`);
  return (await read(shpPath, dbfPath)) as GeoJSON.FeatureCollection;
}

/**
 * Simplify GeoJSON using mapshaper (Visvalingam method).
 * - Preserves topology (shared borders stay aligned)
 * - Truncates coordinates to 5 decimal places (~1m precision)
 */
async function simplify(
  geojson: GeoJSON.FeatureCollection,
  pct: string,
): Promise<GeoJSON.FeatureCollection> {
  const input = { "input.geojson": geojson };
  const cmd =
    `-i input.geojson ` +
    `-proj from='+proj=utm +zone=32 +datum=WGS84' wgs84 ` +
    `-simplify visvalingam ${pct} keep-shapes ` +
    `-o output.geojson format=geojson precision=0.00001`;

  const output = await mapshaper.applyCommands(cmd, input);
  const result = output["output.geojson"];

  // mapshaper returns Buffer
  const str =
    result instanceof Buffer ? result.toString("utf-8") : String(result);
  return JSON.parse(str) as GeoJSON.FeatureCollection;
}

function writeGeoJSON(name: string, geojson: GeoJSON.FeatureCollection) {
  const outPath = resolve(OUTPUT_DIR, `${name}.geojson`);
  const json = JSON.stringify(geojson);
  writeFileSync(outPath, json);
  const sizeMB = (Buffer.byteLength(json) / 1e6).toFixed(1);
  console.log(
    `  → ${geojson.features.length} features, ${sizeMB} MB → ${outPath}`,
  );
}

async function main() {
  const useApi = process.argv.includes("--from-api");
  const skipSimplify = process.argv.includes("--no-simplify");
  console.log(
    `Mode: ${useApi ? "WFS API" : "local shapefiles"}` +
      `${skipSimplify ? " (no simplification)" : " + mapshaper simplification"}\n`,
  );

  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const boundary of BOUNDARIES) {
    console.log(`Processing ${boundary.name} ...`);

    let geojson = useApi
      ? await fetchFromWFS(boundary.wfsLayer)
      : await readLocal(boundary.folder, boundary.file);

    if (!skipSimplify) {
      const rawMB = (Buffer.byteLength(JSON.stringify(geojson)) / 1e6).toFixed(
        1,
      );
      console.log(
        `  Raw: ${geojson.features.length} features, ${rawMB} MB — simplifying ${boundary.simplifyPct} ...`,
      );
      geojson = await simplify(geojson, boundary.simplifyPct);
    }

    writeGeoJSON(boundary.name, geojson);

    if (useApi) await sleep(3000);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
