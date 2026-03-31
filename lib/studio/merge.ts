/**
 * Limen — data loading & preview utilities.
 *
 * Provides client-side dataset loading (CSV/GeoJSON), CSV export,
 * and column statistics for the DatasetPanel preview.
 */
import Papa from "papaparse";

/* ── Types ── */

export interface DataRow {
  [key: string]: string | number | null;
}

export interface ParsedDataset {
  id: string;
  name: string;
  columns: string[];
  rows: DataRow[];
  rowCount: number;
  format: "csv" | "geojson";
}

/* ── Dataset loading ── */

export async function loadDataset(
  id: string,
  name: string,
  filePath: string,
  format: string,
): Promise<ParsedDataset> {
  const url = filePath.startsWith("public/")
    ? filePath.slice("public".length)
    : `/${filePath}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);

  if (format === "csv") {
    const text = await resp.text();
    const result = Papa.parse<DataRow>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    return {
      id,
      name,
      columns: result.meta.fields ?? [],
      rows: result.data,
      rowCount: result.data.length,
      format: "csv",
    };
  }

  if (format === "geojson") {
    const geojson = await resp.json();
    const features: { properties?: DataRow }[] = geojson.features ?? [];
    const columns =
      features.length > 0 ? Object.keys(features[0].properties ?? {}) : [];
    const rows = features.map((f) => ({ ...f.properties }));
    return {
      id,
      name,
      columns,
      rows: rows as DataRow[],
      rowCount: rows.length,
      format: "geojson",
    };
  }

  throw new Error(`Unsupported format: ${format}`);
}

/* ── CSV export ── */

export function toCSV(columns: string[], rows: DataRow[]): string {
  return Papa.unparse({ fields: columns, data: rows });
}

/* ── Column stats (for preview) ── */

export interface ColumnStats {
  name: string;
  type: "number" | "string" | "mixed";
  nullCount: number;
  uniqueCount: number;
  sample: (string | number | null)[];
}

export function computeColumnStats(
  columns: string[],
  rows: DataRow[],
): ColumnStats[] {
  return columns.map((col) => {
    const values = rows.map((r) => r[col]);
    let numCount = 0;
    let strCount = 0;
    let nullCount = 0;
    const uniques = new Set<string>();

    for (const v of values) {
      if (v === null || v === undefined || v === "") {
        nullCount++;
      } else if (typeof v === "number") {
        numCount++;
        uniques.add(String(v));
      } else {
        strCount++;
        uniques.add(String(v));
      }
    }

    const type: "number" | "string" | "mixed" =
      numCount > 0 && strCount === 0
        ? "number"
        : strCount > 0 && numCount === 0
          ? "string"
          : "mixed";

    return {
      name: col,
      type,
      nullCount,
      uniqueCount: uniques.size,
      sample: values.slice(0, 3),
    };
  });
}
