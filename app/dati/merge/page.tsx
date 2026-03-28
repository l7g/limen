"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, GitMerge, Download, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { datasets } from "@/lib/datasets/catalog";
import { getJoinGroups, mergeRows } from "@/lib/datasets/merge";
import type { DatasetMeta } from "@/lib/datasets/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type Row = Record<string, unknown>;

const joinGroups = getJoinGroups();

/** Resolve dataset.filePath → public URL */
function toUrl(d: DatasetMeta): string {
  return d.filePath.startsWith("public/")
    ? d.filePath.slice("public".length)
    : `/${d.filePath}`;
}

/** Load rows from a dataset (GeoJSON feature properties, or CSV rows). Preview only first N for CSV. */
async function loadRows(d: DatasetMeta): Promise<Row[]> {
  const url = toUrl(d);
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Impossibile caricare ${d.name} (HTTP ${res.status})`);

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
    preview: 5000, // cap at 5000 rows for browser merge
  });
  return result.data;
}

export default function MergePage() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(
    joinGroups[0]?.joinField ?? null,
  );
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  const [merged, setMerged] = useState<Row[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const group = useMemo(
    () => joinGroups.find((g) => g.joinField === selectedGroup) ?? null,
    [selectedGroup],
  );

  const leftDataset = useMemo(
    () => datasets.find((d) => d.id === leftId),
    [leftId],
  );
  const rightDataset = useMemo(
    () => datasets.find((d) => d.id === rightId),
    [rightId],
  );

  const canMerge = leftDataset && rightDataset && leftId !== rightId;

  const handleMerge = useCallback(async () => {
    if (!leftDataset || !rightDataset || !group) return;
    setLoading(true);
    setError(null);
    setMerged(null);

    try {
      const [leftRows, rightRows] = await Promise.all([
        loadRows(leftDataset),
        loadRows(rightDataset),
      ]);

      const joinField = group.joinField;
      // For GeoJSON, the join field is in properties directly.
      // For CSV, find the column that maps to the join field.
      const leftKey = findKeyColumn(leftRows, leftDataset, joinField);
      const rightKey = findKeyColumn(rightRows, rightDataset, joinField);

      if (!leftKey || !rightKey) {
        setError(
          `Campo di join "${joinField}" non trovato nei dati. Colonne disponibili: ${leftKey ? "" : Object.keys(leftRows[0] ?? {}).join(", ")}`,
        );
        return;
      }

      const result = mergeRows(leftRows, rightRows, leftKey, rightKey);
      const cols = result.length > 0 ? Object.keys(result[0]) : [];
      setColumns(cols);
      setMerged(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [leftDataset, rightDataset, group]);

  const handleDownload = useCallback(() => {
    if (!merged || merged.length === 0) return;
    const csv = Papa.unparse(merged);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `merge-${leftId}-${rightId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [merged, leftId, rightId]);

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 md:py-14">
        {/* Back */}
        <Link
          href="/dati"
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Catalogo Dati
        </Link>

        {/* Title */}
        <div className="mt-5 max-w-2xl">
          <div className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-[#00D9A3]" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">
              Merge Builder
            </h1>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-gray-500">
            Seleziona due dataset con un campo di join in comune, combinali e
            scarica il risultato. Il vero potere dei dati aperti è incrociarli.
          </p>
        </div>

        {/* Step 1: Choose join group */}
        <div className="mt-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
            1. Scegli il campo di unione
          </h2>
          <div className="flex flex-wrap gap-2">
            {joinGroups.map((g) => (
              <button
                key={g.joinField}
                type="button"
                onClick={() => {
                  setSelectedGroup(g.joinField);
                  setLeftId(null);
                  setRightId(null);
                  setMerged(null);
                  setError(null);
                }}
                className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
                  selectedGroup === g.joinField
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <code className="font-mono text-[12px]">{g.joinField}</code>
                <span className="ml-2 text-[11px] opacity-60">
                  ({g.datasets.length} dataset)
                </span>
              </button>
            ))}
          </div>
          {group && (
            <p className="mt-2 text-[12px] text-gray-400">
              {group.description}
            </p>
          )}
        </div>

        {/* Step 2: Pick datasets */}
        {group && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <DatasetPicker
              label="2a. Dataset sinistro (base)"
              datasets={group.datasets}
              selected={leftId}
              disabled={rightId}
              onSelect={(id) => {
                setLeftId(id);
                setMerged(null);
              }}
            />
            <DatasetPicker
              label="2b. Dataset destro (da unire)"
              datasets={group.datasets}
              selected={rightId}
              disabled={leftId}
              onSelect={(id) => {
                setRightId(id);
                setMerged(null);
              }}
            />
          </div>
        )}

        {/* Step 3: Merge + preview */}
        {canMerge && (
          <div className="mt-8">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              3. Unisci e anteprima
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleMerge}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00D9A3] px-5 py-2.5 text-[13px] font-semibold text-gray-900 shadow-sm transition-all hover:bg-[#00B386] hover:shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitMerge className="h-4 w-4" />
                )}
                Unisci Dati
              </button>
              <span className="text-[12px] text-gray-400">
                {leftDataset?.name} ← {rightDataset?.name} tramite{" "}
                <code className="font-mono text-[11px]">
                  {group?.joinField}
                </code>
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {/* Result table */}
        {merged && merged.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium text-gray-700">
                {merged.length.toLocaleString("it-IT")} righe risultanti
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Scarica CSV
              </button>
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {merged.slice(0, 20).map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 hover:bg-gray-50/50"
                      >
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                          >
                            {String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-400">
                Prime {Math.min(20, merged.length)} righe di{" "}
                {merged.length.toLocaleString("it-IT")} totali
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

/* ── Helper: find which column in a row set corresponds to the join field ── */

/** Known aliases: the catalog joinField might not match the actual CSV column name. */
const FIELD_ALIASES: Record<string, string[]> = {
  PRO_COM_T: ["PRO_COM_T", "codice_comune", "comune_residenza"],
  COD_PROV: ["COD_PROV", "cod_prov", "codice_provincia"],
  COD_REG: ["COD_REG", "cod_reg", "codice_regione"],
};

function findKeyColumn(
  rows: Row[],
  _dataset: DatasetMeta,
  joinField: string,
): string | null {
  if (rows.length === 0) return null;
  const availableCols = Object.keys(rows[0]);
  // Direct match first
  if (availableCols.includes(joinField)) return joinField;
  // Check aliases
  const aliases = FIELD_ALIASES[joinField] ?? [];
  for (const alias of aliases) {
    if (availableCols.includes(alias)) return alias;
  }
  return null;
}

/* ── Sub-component: dataset picker ── */

function DatasetPicker({
  label,
  datasets: options,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  datasets: DatasetMeta[];
  selected: string | null;
  disabled: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        {label}
      </h2>
      <div className="flex flex-col gap-2">
        {options.map((d) => {
          const isSelected = selected === d.id;
          const isDisabled = disabled === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => !isDisabled && onSelect(d.id)}
              className={`text-left rounded-lg border p-3 transition-all ${
                isSelected
                  ? "border-[#00D9A3] bg-[#00D9A3]/5 ring-1 ring-[#00D9A3]"
                  : isDisabled
                    ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <p className="text-[13px] font-semibold text-gray-900">
                {d.name}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {d.source} · {d.format.toUpperCase()} ·{" "}
                {d.coverage === "italy" ? "Italia" : "Sardegna"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
