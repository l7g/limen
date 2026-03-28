import type { DatasetMeta } from "./types";
import { datasets } from "./catalog";

/** Group of datasets that share the same joinField. */
export interface JoinGroup {
  joinField: string;
  description: string;
  datasets: DatasetMeta[];
}

const JOIN_DESCRIPTIONS: Record<string, string> = {
  PRO_COM_T: "Codice ISTAT del comune (6 cifre) — unisce dati a scala comunale",
  COD_PROV: "Codice della provincia — unisce dati a scala provinciale",
  COD_REG: "Codice della regione — unisce dati a scala regionale",
};

/** Get all groups of datasets that can be joined. */
export function getJoinGroups(): JoinGroup[] {
  const byField = new Map<string, DatasetMeta[]>();
  for (const d of datasets) {
    if (!d.joinField) continue;
    const list = byField.get(d.joinField) ?? [];
    list.push(d);
    byField.set(d.joinField, list);
  }
  return Array.from(byField.entries())
    .filter(([, list]) => list.length >= 2)
    .map(([field, list]) => ({
      joinField: field,
      description: JOIN_DESCRIPTIONS[field] ?? field,
      datasets: list,
    }));
}

type Row = Record<string, unknown>;

/**
 * Perform a left join of two arrays of rows on the given key fields.
 * `leftKey` and `rightKey` are the column names to join on.
 * Columns from `right` are added to `left` rows, prefixed with `rightPrefix_` if there are name collisions.
 */
export function mergeRows(
  left: Row[],
  right: Row[],
  leftKey: string,
  rightKey: string,
): Row[] {
  // Index right by key
  const index = new Map<string, Row>();
  for (const row of right) {
    const key = String(row[rightKey] ?? "").trim();
    if (key) index.set(key, row);
  }

  const leftCols = new Set(left.length > 0 ? Object.keys(left[0]) : []);
  const rightCols =
    right.length > 0 ? Object.keys(right[0]).filter((c) => c !== rightKey) : [];

  return left.map((lRow) => {
    const key = String(lRow[leftKey] ?? "").trim();
    const rRow = index.get(key);
    const merged: Row = { ...lRow };
    for (const col of rightCols) {
      const finalCol = leftCols.has(col) ? `${col}_2` : col;
      merged[finalCol] = rRow ? rRow[col] : null;
    }
    return merged;
  });
}
