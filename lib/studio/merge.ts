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

/* ── Join-key detection ── */

/**
 * Detect shared join keys across multiple datasets.
 * Returns e.g. ["PRO_COM_T"] if all datasets share that column.
 */
export function detectJoinKeys(datasets: ParsedDataset[]): string[] {
  if (datasets.length < 2) return [];
  const columnSets = datasets.map((d) => new Set(d.columns));
  const shared = datasets[0].columns.filter((col) =>
    columnSets.every((s) => s.has(col)),
  );
  // Prefer known ISTAT join keys
  const preferred = ["PRO_COM_T", "COD_PROV", "COD_REG"];
  const sorted = [
    ...shared.filter((k) => preferred.includes(k)),
    ...shared.filter((k) => !preferred.includes(k)),
  ];
  return sorted;
}

/* ── Merge execution ── */

/**
 * Chained left-join: merge N datasets on a common key.
 * First dataset is the base; subsequent datasets are joined onto it.
 */
export function executeMerge(
  datasets: ParsedDataset[],
  joinKey: string,
): ParsedDataset {
  if (datasets.length === 0) throw new Error("No datasets to merge");
  if (datasets.length === 1) return datasets[0];

  let baseRows = datasets[0].rows.map((r) => ({ ...r }));
  let baseColumns = [...datasets[0].columns];

  for (let i = 1; i < datasets.length; i++) {
    const right = datasets[i];
    // Build lookup by join key
    const lookup = new Map<string, DataRow>();
    for (const row of right.rows) {
      const key = String(row[joinKey] ?? "");
      if (key) lookup.set(key, row);
    }

    // Add columns from right (skip duplicates and the join key)
    const newCols = right.columns.filter(
      (c) => c !== joinKey && !baseColumns.includes(c),
    );
    // Suffix duplicates that aren't the join key
    const renamedCols: { orig: string; dest: string }[] = [];
    for (const col of right.columns) {
      if (col === joinKey) continue;
      if (baseColumns.includes(col)) {
        const dest = `${col}_${right.id}`;
        renamedCols.push({ orig: col, dest });
        if (!baseColumns.includes(dest)) baseColumns.push(dest);
      } else {
        renamedCols.push({ orig: col, dest: col });
        baseColumns.push(col);
      }
    }

    // Join
    baseRows = baseRows.map((row) => {
      const key = String(row[joinKey] ?? "");
      const match = lookup.get(key);
      const merged = { ...row };
      for (const { orig, dest } of renamedCols) {
        merged[dest] = match ? (match[orig] ?? null) : null;
      }
      return merged;
    });
  }

  return {
    id: datasets.map((d) => d.id).join("+"),
    name: datasets.map((d) => d.name).join(" + "),
    columns: baseColumns,
    rows: baseRows,
    rowCount: baseRows.length,
    format: "csv",
  };
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
