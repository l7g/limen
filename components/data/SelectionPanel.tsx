"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { X, Download, GitMerge, Map, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { datasets } from "@/lib/datasets/catalog";
import { getJoinGroups, mergeRows } from "@/lib/datasets/merge";
import type { DatasetMeta } from "@/lib/datasets/types";

type Row = Record<string, unknown>;

function toUrl(d: DatasetMeta): string {
  return d.filePath.startsWith("public/")
    ? d.filePath.slice("public".length)
    : `/${d.filePath}`;
}

async function loadRows(d: DatasetMeta): Promise<Row[]> {
  const url = toUrl(d);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (d.format === "geojson" || d.format === "gtfs") {
    const json = await res.json();
    return (json.features ?? []).map(
      (f: { properties: Record<string, unknown> }) => f.properties ?? {},
    );
  }
  const text = await res.text();
  const result = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    preview: 5000,
  });
  return result.data;
}

const FIELD_ALIASES: Record<string, string[]> = {
  PRO_COM_T: ["PRO_COM_T", "codice_comune", "comune_residenza"],
  COD_PROV: ["COD_PROV", "cod_prov", "codice_provincia"],
  COD_REG: ["COD_REG", "cod_reg", "codice_regione"],
};

function findKeyColumn(rows: Row[], joinField: string): string | null {
  if (rows.length === 0) return null;
  const cols = Object.keys(rows[0]);
  if (cols.includes(joinField)) return joinField;
  const aliases = FIELD_ALIASES[joinField] ?? [];
  for (const alias of aliases) {
    if (cols.includes(alias)) return alias;
  }
  return null;
}

interface SelectionPanelProps {
  selectedIds: Set<string>;
  onDeselect: (id: string) => void;
  onDeselectAll: () => void;
}

export default function SelectionPanel({
  selectedIds,
  onDeselect,
  onDeselectAll,
}: SelectionPanelProps) {
  const selected = useMemo(
    () => datasets.filter((d) => selectedIds.has(d.id)),
    [selectedIds],
  );

  const mergeInfo = useMemo(() => {
    if (selected.length < 2) return null;
    const joinGroups = getJoinGroups();
    for (const group of joinGroups) {
      const compatible = selected.filter((d) =>
        group.datasets.some((gd) => gd.id === d.id),
      );
      if (compatible.length >= 2) {
        return {
          joinField: group.joinField,
          description: group.description,
          datasets: compatible,
        };
      }
    }
    return null;
  }, [selected]);

  const [mergeResult, setMergeResult] = useState<{
    rows: Row[];
    columns: string[];
  } | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const handleMerge = useCallback(async () => {
    if (!mergeInfo || mergeInfo.datasets.length < 2) return;
    setMerging(true);
    setMergeError(null);
    setMergeResult(null);
    try {
      const allRows = await Promise.all(mergeInfo.datasets.map(loadRows));
      let result = allRows[0];
      for (let i = 1; i < allRows.length; i++) {
        const leftKey = findKeyColumn(result, mergeInfo.joinField);
        const rightKey = findKeyColumn(allRows[i], mergeInfo.joinField);
        if (!leftKey || !rightKey) {
          setMergeError(
            `Campo "${mergeInfo.joinField}" non trovato in uno dei dataset`,
          );
          return;
        }
        result = mergeRows(result, allRows[i], leftKey, rightKey);
      }
      setMergeResult({
        rows: result,
        columns: result.length > 0 ? Object.keys(result[0]) : [],
      });
    } catch (e) {
      setMergeError((e as Error).message);
    } finally {
      setMerging(false);
    }
  }, [mergeInfo]);

  const handleDownloadMerged = useCallback(() => {
    if (!mergeResult) return;
    const csv = Papa.unparse(mergeResult.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `limen-merge-${mergeInfo?.joinField ?? "data"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mergeResult, mergeInfo]);

  const coverageSet = useMemo(() => {
    const set = new Set<string>();
    for (const d of selected) set.add(d.coverage);
    return set;
  }, [selected]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200/60 px-5 py-4">
        <p className="text-[13px] font-semibold text-gray-900">
          {selected.length} selezionat
          {selected.length === 1 ? "o" : "i"}
        </p>
        <button
          type="button"
          onClick={onDeselectAll}
          className="text-[11px] text-gray-400 transition-colors hover:text-gray-600"
        >
          Deseleziona
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {/* Selected list */}
        <div className="flex flex-col gap-1.5">
          {selected.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-gray-900">
                  {d.name}
                </p>
                <p className="text-[10px] text-gray-400">{d.source}</p>
              </div>
              <button
                type="button"
                onClick={() => onDeselect(d.id)}
                className="shrink-0 text-gray-300 transition-colors hover:text-gray-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Coverage */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Copertura
          </span>
          <div className="flex gap-1.5">
            {coverageSet.has("italy") && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                Italia
              </span>
            )}
            {coverageSet.has("sardinia") && (
              <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-600">
                Sardegna
              </span>
            )}
          </div>
        </div>

        {/* Merge info */}
        {mergeInfo && (
          <div className="mt-4 rounded-xl border border-[#00D9A3]/20 bg-[#00D9A3]/5 p-3">
            <div className="flex items-center gap-2">
              <GitMerge className="h-3.5 w-3.5 text-[#00D9A3]" />
              <p className="text-[12px] font-semibold text-gray-900">
                Merge disponibile
              </p>
            </div>
            <p className="mt-1 text-[10px] text-gray-500">
              {mergeInfo.datasets.length} dataset unibili via{" "}
              <code className="font-mono text-[10px] text-[#00D9A3]">
                {mergeInfo.joinField}
              </code>
            </p>
            <button
              type="button"
              onClick={handleMerge}
              disabled={merging}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#00D9A3] px-3 py-1.5 text-[11px] font-semibold text-gray-900 transition-all hover:bg-[#00B386] disabled:opacity-50"
            >
              {merging ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitMerge className="h-3.5 w-3.5" />
              )}
              Unisci {mergeInfo.datasets.length} dataset
            </button>
          </div>
        )}

        {mergeError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-600">
            {mergeError}
          </div>
        )}

        {/* Merge result preview */}
        {mergeResult && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-medium text-gray-600">
                {mergeResult.rows.length.toLocaleString("it-IT")} righe
              </p>
              <button
                type="button"
                onClick={handleDownloadMerged}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-[#00D9A3] transition-colors hover:text-[#00B386]"
              >
                <Download className="h-3 w-3" />
                CSV
              </button>
            </div>
            <div className="max-h-48 overflow-hidden overflow-y-auto rounded-lg border border-gray-200">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {mergeResult.columns.slice(0, 4).map((col) => (
                      <th
                        key={col}
                        className="whitespace-nowrap px-2 py-1.5 text-left font-semibold uppercase tracking-wider text-gray-500"
                      >
                        {col}
                      </th>
                    ))}
                    {mergeResult.columns.length > 4 && (
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-400">
                        +{mergeResult.columns.length - 4}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {mergeResult.rows.slice(0, 6).map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {mergeResult.columns.slice(0, 4).map((col) => (
                        <td
                          key={col}
                          className="max-w-[80px] truncate whitespace-nowrap px-2 py-1 text-gray-600"
                        >
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-2 border-t border-gray-200/60 px-5 py-4">
        <Link
          href={`/workbench?layers=${selected.map((d) => d.id).join(",")}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-[12px] font-semibold text-white transition-all hover:bg-gray-800"
        >
          <Map className="h-3.5 w-3.5" />
          Apri nel Workbench
        </Link>
        <button
          type="button"
          onClick={() => {
            for (const d of selected) {
              const url = d.filePath.startsWith("public/")
                ? d.filePath.slice("public".length)
                : `/${d.filePath}`;
              const a = document.createElement("a");
              a.href = url;
              a.download = url.split("/").pop() ?? "data";
              a.click();
            }
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[12px] font-semibold text-gray-700 transition-all hover:bg-gray-50"
        >
          <Download className="h-3.5 w-3.5" />
          Scarica{selected.length > 1 ? ` (${selected.length})` : ""}
        </button>
      </div>
    </div>
  );
}
