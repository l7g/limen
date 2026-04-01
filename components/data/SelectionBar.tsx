"use client";

import { useState, useCallback, useMemo } from "react";
import { X, Download, Loader2, Merge, Link2, Info } from "lucide-react";
import type { DatasetMeta } from "@/lib/datasets/types";
import {
  loadDataset,
  detectJoinKeys,
  executeMerge,
  toCSV,
} from "@/lib/studio/merge";

/** Human-readable labels for join field codes */
const JOIN_FIELD_LABELS: Record<string, string> = {
  PRO_COM_T: "codice comune",
  COD_PROV: "codice provincia",
  COD_REG: "codice regione",
};

interface MergeGroup {
  joinField: string;
  label: string;
  datasets: DatasetMeta[];
}

interface SelectionBarProps {
  selected: DatasetMeta[];
  onClear: () => void;
  onRemove: (id: string) => void;
}

export default function SelectionBar({
  selected,
  onClear,
  onRemove,
}: SelectionBarProps) {
  const [downloading, setDownloading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Group selected datasets: mergeable groups (2+ sharing a joinField) + ungrouped */
  const { mergeGroups, ungrouped, crossScale } = useMemo(() => {
    const byField = new Map<string, DatasetMeta[]>();
    const noField: DatasetMeta[] = [];

    for (const d of selected) {
      if (d.joinField) {
        const arr = byField.get(d.joinField) ?? [];
        arr.push(d);
        byField.set(d.joinField, arr);
      } else {
        noField.push(d);
      }
    }

    const groups: MergeGroup[] = [];
    const leftover: DatasetMeta[] = [...noField];

    for (const [field, datasets] of byField) {
      if (datasets.length >= 2) {
        groups.push({
          joinField: field,
          label: JOIN_FIELD_LABELS[field] ?? field,
          datasets,
        });
      } else {
        leftover.push(...datasets);
      }
    }

    // Detect cross-scale situation (comunale + provinciale datasets selected)
    const hasComunale = selected.some((d) => d.joinField === "PRO_COM_T");
    const hasProvinciale = selected.some((d) => d.joinField === "COD_PROV");
    const crossScale = hasComunale && hasProvinciale;

    return { mergeGroups: groups, ungrouped: leftover, crossScale };
  }, [selected]);

  const hasMerge = mergeGroups.length > 0;

  /** Download a single file by triggering a browser download */
  function triggerDownload(ds: DatasetMeta) {
    const url = ds.filePath.startsWith("public/")
      ? ds.filePath.slice("public".length)
      : `/${ds.filePath}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.click();
  }

  /** Download all selected files individually — no merge */
  const handleDownloadAll = useCallback(async () => {
    setDownloading(true);
    setError(null);
    for (const ds of selected) {
      triggerDownload(ds);
      await new Promise((r) => setTimeout(r, 300));
    }
    setDownloading(false);
  }, [selected]);

  /** Merge each group into a CSV + download ungrouped files individually */
  const handleMergeAndDownload = useCallback(async () => {
    setMerging(true);
    setError(null);
    try {
      // 1. Merge each group
      for (const group of mergeGroups) {
        const loaded = await Promise.all(
          group.datasets.map((d) =>
            loadDataset(d.id, d.name, d.filePath, d.format),
          ),
        );
        const keys = detectJoinKeys(loaded);
        const joinKey = keys.includes(group.joinField)
          ? group.joinField
          : keys[0];
        if (!joinKey) {
          setError(`Nessuna chiave di unione trovata per ${group.label}`);
          continue;
        }

        const merged = executeMerge(loaded, joinKey);
        const csv = toCSV(merged.columns, merged.rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `limen-unione-${group.joinField.toLowerCase()}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        await new Promise((r) => setTimeout(r, 300));
      }

      // 2. Download ungrouped files individually
      for (const ds of ungrouped) {
        triggerDownload(ds);
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err) {
      console.error("Merge failed:", err);
      setError("Errore durante l'unione dei dataset");
    } finally {
      setMerging(false);
    }
  }, [mergeGroups, ungrouped]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-2 sm:px-4 sm:pb-4 animate-in slide-in-from-bottom duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-sm">
        {/* ── Merge detail panel (only when merge groups exist) ── */}
        {hasMerge && (
          <div className="border-b border-gray-100 px-5 pt-3.5 pb-2.5">
            <div className="space-y-2">
              {mergeGroups.map((group) => (
                <div key={group.joinField}>
                  <div className="mb-1 flex items-center gap-1.5">
                    <Link2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-[11px] font-medium text-emerald-600">
                      Unibili su {group.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.datasets.map((d) => (
                      <span
                        key={d.id}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 py-0.5 pl-2 pr-1 text-[11px] text-emerald-700 ring-1 ring-emerald-200/60"
                      >
                        <span className="max-w-28 truncate">{d.name}</span>
                        <button
                          type="button"
                          onClick={() => onRemove(d.id)}
                          className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-emerald-100 transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {ungrouped.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5">
                    <Download className="h-3 w-3 text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-400">
                      Solo download
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ungrouped.map((d) => (
                      <span
                        key={d.id}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-2 pr-1 text-[11px] text-gray-500"
                      >
                        <span className="max-w-28 truncate">{d.name}</span>
                        <button
                          type="button"
                          onClick={() => onRemove(d.id)}
                          className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cross-scale hint: comunale CSVs include COD_PROV for aggregation */}
            {crossScale && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5">
                <Info className="mt-px h-3 w-3 shrink-0 text-blue-500" />
                <span className="text-[11px] leading-tight text-blue-600">
                  I dataset comunali contengono la colonna COD_PROV — puoi
                  aggregarli per provincia dopo il download.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Cross-scale hint when no merge panel is showing */}
        {!hasMerge && crossScale && (
          <div className="border-b border-gray-100 px-5 pt-3 pb-2.5">
            <div className="flex items-start gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5">
              <Info className="mt-px h-3 w-3 shrink-0 text-blue-500" />
              <span className="text-[11px] leading-tight text-blue-600">
                I dataset comunali contengono la colonna COD_PROV — puoi
                aggregarli per provincia dopo il download.
              </span>
            </div>
          </div>
        )}

        {/* ── Action bar ── */}
        <div className="flex items-center gap-3 px-5 py-3">
          {/* Left: count + chips (only when no merge detail panel) */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-[13px] font-semibold text-gray-900">
              {selected.length} selezionat{selected.length === 1 ? "o" : "i"}
            </span>

            {/* Chips only in compact mode (no merge panel showing them already) */}
            {!hasMerge && (
              <div className="hidden min-w-0 flex-wrap gap-1 sm:flex">
                {selected.slice(0, 3).map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-2 pr-1 text-[11px] text-gray-600"
                  >
                    <span className="max-w-25 truncate">{d.name}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(d.id)}
                      className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                {selected.length > 3 && (
                  <span className="self-center text-[11px] text-gray-400">
                    +{selected.length - 3}
                  </span>
                )}
              </div>
            )}

            {error && <span className="text-[11px] text-red-500">{error}</span>}
          </div>

          {/* Right: action buttons */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={downloading || merging}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3.5 py-2 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {hasMerge ? "Scarica singoli" : "Scarica"}
              </span>
              <span className="sm:hidden">
                <Download className="h-3.5 w-3.5" />
              </span>
            </button>

            {hasMerge && (
              <button
                type="button"
                onClick={handleMergeAndDownload}
                disabled={merging || downloading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {merging ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Merge className="h-3.5 w-3.5" />
                )}
                Unisci + Scarica
              </button>
            )}

            <button
              type="button"
              onClick={onClear}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Deseleziona tutto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
