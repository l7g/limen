"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  X,
  Download,
  ExternalLink,
  ChevronDown,
  Loader2,
  Map,
  Table2,
  AlertTriangle,
} from "lucide-react";
import type { DatasetMeta } from "@/lib/datasets/types";
import { useWorkbenchStore } from "@/lib/store";
import { daysSinceUpdate } from "@/lib/datasets/freshness";
import {
  loadDataset,
  computeColumnStats,
  toCSV,
  type ParsedDataset,
  type ColumnStats,
} from "@/lib/studio/merge";

/* ── Helpers ── */

const CATEGORY_LABELS: Record<string, string> = {
  confini: "Confini",
  demografia: "Demografia",
  trasporti: "Trasporti",
  veicoli: "Veicoli",
  economia: "Economia",
  ambiente: "Ambiente",
  servizi: "Servizi",
  indicatori: "Indicatori",
};

const COVERAGE_LABELS: Record<string, string> = {
  italy: "Italia",
  sardinia: "Sardegna",
};

const SCALE_LABELS: Record<string, string> = {
  comunale: "Comunale",
  provinciale: "Provinciale",
  regionale: "Regionale",
  nazionale: "Nazionale",
};

function formatUpdatedAgo(ds: DatasetMeta): string {
  const days = daysSinceUpdate(ds);
  if (days === 0) return "Aggiornato oggi";
  if (days === 1) return "Aggiornato ieri";
  if (days <= 30) return `Aggiornato ${days} giorni fa`;
  const d = new Date(ds.lastUpdated);
  return `Aggiornato il ${d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("it-IT");
}

function typeLabel(t: ColumnStats["type"]): string {
  return t === "number" ? "num" : t === "string" ? "testo" : "misto";
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Component ── */

interface DatasetPanelProps {
  dataset: DatasetMeta;
  onClose: () => void;
}

export default function DatasetPanel({ dataset, onClose }: DatasetPanelProps) {
  const [parsed, setParsed] = useState<ParsedDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /** Check if the workbench has a dataset for this item */
  const hasWorkbenchLayer = useWorkbenchStore((s) =>
    s.datasets.some((d) => d.datasetId === dataset.id),
  );

  /* Load data */
  useEffect(() => {
    let cancelled = false;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    setError(null);
    setParsed(null);
    setShowTable(false);

    loadDataset(dataset.id, dataset.name, dataset.filePath, dataset.format)
      .then((data) => {
        if (!cancelled) {
          setParsed(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dataset.id, dataset.name, dataset.filePath, dataset.format]);

  /* Column stats */
  const stats = useMemo(
    () => (parsed ? computeColumnStats(parsed.columns, parsed.rows) : []),
    [parsed],
  );

  /* Close on Escape */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  /* Close on click outside */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  /* Close dropdown on click outside */
  useEffect(() => {
    if (!downloadOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [downloadOpen]);

  /* Download handlers */
  const fileUrl = dataset.filePath.startsWith("public/")
    ? dataset.filePath.slice("public".length)
    : `/${dataset.filePath}`;

  const handleDownloadOriginal = useCallback(() => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = "";
    a.click();
    setDownloadOpen(false);
  }, [fileUrl]);

  const handleDownloadCSV = useCallback(() => {
    if (!parsed) return;
    const csv = toCSV(parsed.columns, parsed.rows);
    const safeName = dataset.name.replace(/\s+/g, "_").toLowerCase();
    downloadBlob(csv, `${safeName}.csv`, "text/csv");
    setDownloadOpen(false);
  }, [parsed, dataset.name]);

  const handleDownloadJSON = useCallback(() => {
    if (!parsed) return;
    const json = JSON.stringify(parsed.rows, null, 2);
    const safeName = dataset.name.replace(/\s+/g, "_").toLowerCase();
    downloadBlob(json, `${safeName}.json`, "application/json");
    setDownloadOpen(false);
  }, [parsed, dataset.name]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed z-50
          inset-0 sm:inset-auto sm:right-3 sm:top-3 sm:bottom-3 sm:w-[460px] sm:max-w-[calc(100vw-24px)]
          overflow-hidden sm:rounded-2xl border-0 sm:border sm:border-gray-200 bg-white shadow-2xl
          animate-in slide-in-from-right duration-300 ease-out
          flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold leading-tight text-gray-900">
              {dataset.name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
              <span>{dataset.source}</span>
              <span>·</span>
              <span className="font-mono uppercase">{dataset.format}</span>
              <span>·</span>
              <span>{formatUpdatedAgo(dataset)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          <p className="text-[13px] leading-relaxed text-gray-500">
            {dataset.description}
          </p>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <MetaItem
              label="Categoria"
              value={CATEGORY_LABELS[dataset.category] ?? dataset.category}
            />
            <MetaItem
              label="Copertura"
              value={COVERAGE_LABELS[dataset.coverage] ?? dataset.coverage}
            />
            {dataset.scale && dataset.scale !== "none" && (
              <MetaItem
                label="Scala"
                value={SCALE_LABELS[dataset.scale] ?? dataset.scale}
              />
            )}
            <MetaItem label="Licenza" value={dataset.license} />
            {dataset.cadence && (
              <MetaItem
                label="Aggiornamento"
                value={cadenceLabel(dataset.cadence)}
              />
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="text-[12px] text-red-600">
                Impossibile caricare i dati.
              </p>
            </div>
          )}

          {/* Data summary (df.info style) */}
          {parsed && (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="flex items-center gap-4 rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <span className="text-[20px] font-bold text-gray-900">
                    {formatNumber(parsed.rowCount)}
                  </span>
                  <span className="ml-1 text-[11px] text-gray-400">righe</span>
                </div>
                <div className="h-6 w-px bg-gray-200" />
                <div>
                  <span className="text-[20px] font-bold text-gray-900">
                    {parsed.columns.length}
                  </span>
                  <span className="ml-1 text-[11px] text-gray-400">
                    colonne
                  </span>
                </div>
                <div className="h-6 w-px bg-gray-200" />
                <div>
                  <span className="font-mono text-[11px] uppercase text-gray-500">
                    {parsed.format}
                  </span>
                </div>
              </div>

              {/* Column list — df.info style */}
              <div>
                <h3 className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  Struttura dati
                </h3>
                <div className="mt-2 space-y-0 divide-y divide-gray-50">
                  {stats.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center gap-3 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-gray-700">
                        {s.name}
                      </span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {typeLabel(s.type)}
                      </span>
                      <span className="w-16 text-right text-[10px] text-gray-400">
                        {formatNumber(s.uniqueCount)} unici
                      </span>
                      {s.nullCount > 0 && (
                        <span className="w-14 text-right text-[10px] text-amber-500">
                          {formatNumber(s.nullCount)} nulli
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Opt-in table preview */}
              {!showTable ? (
                <button
                  type="button"
                  onClick={() => setShowTable(true)}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Mostra anteprima righe
                </button>
              ) : (
                <div className="max-h-[260px] overflow-auto rounded-xl border border-gray-100">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm">
                      <tr>
                        <th className="px-2.5 py-1.5 text-[10px] font-medium text-gray-400 w-8">
                          #
                        </th>
                        {parsed.columns.map((col) => (
                          <th
                            key={col}
                            className="px-2.5 py-1.5 font-mono text-[10px] font-medium text-gray-500 whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 20).map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-50 hover:bg-gray-50/40"
                        >
                          <td className="px-2.5 py-1 text-[10px] text-gray-300">
                            {i + 1}
                          </td>
                          {parsed.columns.map((col) => (
                            <td
                              key={col}
                              className="max-w-[140px] truncate px-2.5 py-1 text-[10.5px] text-gray-700 whitespace-nowrap"
                            >
                              {row[col] !== null && row[col] !== undefined
                                ? String(row[col])
                                : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > 20 && (
                    <div className="px-3 py-2 text-center text-[10px] text-gray-400">
                      Mostrando 20 di {formatNumber(parsed.rows.length)} righe
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 border-t border-gray-100 px-6 py-4">
          {/* Download dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              type="button"
              onClick={() => setDownloadOpen(!downloadOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-gray-800"
            >
              <Download className="h-3.5 w-3.5" />
              Scarica
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {downloadOpen && (
              <div className="absolute bottom-full left-0 mb-1.5 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleDownloadOriginal}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] uppercase">
                    {dataset.format}
                  </span>
                  Originale
                </button>
                {parsed && dataset.format !== "csv" && (
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] uppercase">
                      csv
                    </span>
                    Tabella CSV
                  </button>
                )}
                {parsed && (
                  <button
                    type="button"
                    onClick={handleDownloadJSON}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] uppercase">
                      json
                    </span>
                    JSON
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Open full detail page */}
          <Link
            href={`/dati/${dataset.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Dettaglio
          </Link>

          {/* Workbench link — only for datasets with a matching layer */}
          {hasWorkbenchLayer && (
            <Link
              href={`/workbench?layer=${dataset.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Map className="h-3.5 w-3.5" />
              Mappa
            </Link>
          )}

          {/* Source link */}
          {dataset.sourceUrl && (
            <a
              href={dataset.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[11px] text-[#00D9A3] hover:text-[#00B386] transition-colors"
            >
              Fonte →
            </a>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Small helpers ── */

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-[12.5px] font-medium text-gray-800">
        {value}
      </dd>
    </div>
  );
}

function cadenceLabel(c: string): string {
  const labels: Record<string, string> = {
    daily: "Giornaliero",
    weekly: "Settimanale",
    monthly: "Mensile",
    quarterly: "Trimestrale",
    annual: "Annuale",
    decennial: "Decennale",
    static: "Statico",
  };
  return labels[c] ?? c;
}
