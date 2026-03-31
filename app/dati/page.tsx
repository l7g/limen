"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Search, Download, Database, Check } from "lucide-react";
import { datasets } from "@/lib/datasets/catalog";
import { daysSinceUpdate } from "@/lib/datasets/freshness";
import type { DatasetCategory, DatasetMeta } from "@/lib/datasets/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GeoFilter, { type GeoSelection } from "@/components/data/GeoFilter";
import DatasetPanel from "@/components/data/DatasetPanel";
import SelectionBar from "@/components/data/SelectionBar";

/* ── Category system ── */
const CATEGORY_LABELS: Record<DatasetCategory, string> = {
  confini: "Confini",
  demografia: "Demografia",
  trasporti: "Trasporti",
  veicoli: "Veicoli",
  economia: "Economia",
  ambiente: "Ambiente",
  servizi: "Servizi",
  indicatori: "Indicatori",
};

const CATEGORY_COLORS: Record<DatasetCategory, string> = {
  confini: "bg-teal-400",
  demografia: "bg-blue-400",
  trasporti: "bg-emerald-400",
  veicoli: "bg-amber-400",
  economia: "bg-violet-400",
  ambiente: "bg-rose-400",
  servizi: "bg-indigo-400",
  indicatori: "bg-pink-400",
};

const CATEGORY_ORDER: DatasetCategory[] = [
  "confini",
  "demografia",
  "trasporti",
  "veicoli",
  "economia",
  "ambiente",
  "servizi",
  "indicatori",
];

const TIER_LABELS: Record<number, string> = {
  1: "API",
  2: "Curato",
  3: "Calcolato",
};

const SARDEGNA_COD = "20";

type EnrichedDataset = DatasetMeta & { ageDays: number };

const enriched: EnrichedDataset[] = datasets.map((d) => ({
  ...d,
  ageDays: daysSinceUpdate(d),
}));

function formatUpdatedAgo(days: number, lastUpdated: string): string {
  if (days === 0) return "Oggi";
  if (days === 1) return "Ieri";
  if (days <= 30) return `${days}g fa`;
  const d = new Date(lastUpdated);
  return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ── Single dataset row ── */
function DatasetRow({
  d,
  onOpen,
  selected,
  onToggleSelect,
}: {
  d: EnrichedDataset;
  onOpen: (d: DatasetMeta) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const dataUrl = d.filePath.startsWith("public/")
    ? d.filePath.slice("public".length)
    : `/${d.filePath}`;

  return (
    <div
      className={`group flex items-stretch border-b border-gray-100 last:border-b-0 transition-colors ${
        selected ? "bg-gray-50" : "hover:bg-gray-50/60"
      }`}
    >
      {/* Category color indicator */}
      <div
        className={`w-0.5 shrink-0 ${CATEGORY_COLORS[d.category]} opacity-60`}
      />

      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(d.id);
        }}
        className="flex shrink-0 items-center pl-3.5 pr-2"
        aria-label={`Seleziona ${d.name}`}
      >
        <div
          className={`flex h-4.5 w-4.5 items-center justify-center rounded-[5px] border transition-all ${
            selected
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 bg-white group-hover:border-gray-400"
          }`}
        >
          {selected && <Check className="h-3 w-3" strokeWidth={2.5} />}
        </div>
      </button>

      {/* Main — clickable to open panel */}
      <button
        type="button"
        onClick={() => onOpen(d)}
        className="flex min-w-0 flex-1 items-center gap-4 py-3 pr-2 text-left"
      >
        {/* Name + source + freshness */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
              {d.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span>{d.source}</span>
            <span className="text-gray-200">·</span>
            <span>{formatUpdatedAgo(d.ageDays, d.lastUpdated)}</span>
          </div>
        </div>

        {/* Metadata badges — right side */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10.5px] font-medium text-gray-500">
            {d.coverage === "italy" ? "IT" : "SRD"}
          </span>
          <span className="w-12 text-right font-mono text-[10.5px] uppercase text-gray-400">
            {d.format}
          </span>
          <span className="w-14 text-right text-[10.5px] text-gray-400">
            {TIER_LABELS[d.tier]}
          </span>
        </div>
      </button>

      {/* Download — always visible but subtle */}
      <div className="flex shrink-0 items-center pr-3.5">
        <a
          href={dataUrl}
          download
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-300 hover:bg-gray-100 hover:text-gray-600 transition-all"
          title={`Scarica ${d.format.toUpperCase()}`}
          aria-label={`Scarica ${d.name}`}
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

export default function DatiPage() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DatasetCategory | null>(
    null,
  );
  const [geoSelection, setGeoSelection] = useState<GeoSelection>({
    regione: null,
    provincia: null,
    comune: null,
  });
  const [panelDataset, setPanelDataset] = useState<DatasetMeta | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const handleOpenPanel = useCallback((d: DatasetMeta) => {
    setPanelDataset(d);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelDataset(null);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleRemoveFromSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const selectedDatasets = useMemo(
    () => enriched.filter((d) => selectedIds.has(d.id)),
    [selectedIds],
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    let result = enriched;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.source.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q),
      );
    }

    if (categoryFilter)
      result = result.filter((d) => d.category === categoryFilter);

    // Geo-scope: resolve effective region from regione OR provincia selection
    const effectiveRegionCod =
      geoSelection.regione?.cod ?? geoSelection.provincia?.regioneCod ?? null;

    if (effectiveRegionCod) {
      const isSardegna = effectiveRegionCod === SARDEGNA_COD;
      if (!isSardegna) {
        result = result.filter((d) => d.coverage === "italy");
      }
    }

    return result;
  }, [query, categoryFilter, geoSelection.regione, geoSelection.provincia]);

  /* Category counts for pills */
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<DatasetCategory, number>> = {};
    for (const d of filtered) {
      counts[d.category] = (counts[d.category] ?? 0) + 1;
    }
    return counts;
  }, [filtered]);

  const totalDatasets = enriched.length;
  const totalSources = new Set(enriched.map((d) => d.source)).size;
  const hasActiveFilters = !!(query || categoryFilter || geoSelection.regione);

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main
        className={`mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14 ${selectedDatasets.length > 0 ? "pb-28" : ""}`}
      >
        {/* ── Header ── */}
        <h1 className="font-heading text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
          Catalogo Dati
        </h1>
        <p className="mt-1.5 max-w-lg text-[14px] leading-relaxed text-gray-400">
          {totalDatasets} dataset da {totalSources} fonti istituzionali.
          Seleziona e scarica.
        </p>

        {/* ── Search + Geo row ── */}
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              ref={searchRef}
              placeholder="Cerca dataset…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-100 transition-all"
            />
          </div>
          <GeoFilter value={geoSelection} onChange={setGeoSelection} />
        </div>

        {/* ── Category filter pills ── */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition-all ${
              categoryFilter === null
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:text-gray-700"
            }`}
          >
            Tutti
            <span className="ml-1 text-[10px] opacity-60">
              {filtered.length}
            </span>
          </button>
          {CATEGORY_ORDER.map((catId) => {
            const count = categoryCounts[catId] ?? 0;
            const isActive = categoryFilter === catId;
            const isDisabled = count === 0 && !isActive;
            return (
              <button
                key={catId}
                type="button"
                onClick={() =>
                  !isDisabled && setCategoryFilter(isActive ? null : catId)
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-all ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : isDisabled
                      ? "cursor-default bg-gray-50 text-gray-300"
                      : "bg-gray-100 text-gray-500 hover:text-gray-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white/60" : CATEGORY_COLORS[catId]} ${isDisabled ? "opacity-30" : "opacity-70"}`}
                />
                {CATEGORY_LABELS[catId]}
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <p className="mt-3 text-[12px] text-gray-400">
            {filtered.length} di {enriched.length} dataset
            {geoSelection.regione && <> · {geoSelection.regione.nome}</>}
          </p>
        )}

        {/* ── Table ── */}
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Column header */}
          <div className="flex items-center border-b border-gray-100 bg-gray-50/80 px-4 py-2.5">
            <div className="pl-8 flex-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">
              Dataset
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="w-10 text-center text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Cop.
              </span>
              <span className="w-12 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Formato
              </span>
              <span className="w-14 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Tipo
              </span>
            </div>
            <div className="w-10 shrink-0" />
          </div>

          {/* Rows */}
          {filtered.length > 0 ? (
            filtered.map((d) => (
              <DatasetRow
                key={d.id}
                d={d}
                onOpen={handleOpenPanel}
                selected={selectedIds.has(d.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))
          ) : (
            <div className="py-20 text-center">
              <Database className="mx-auto h-6 w-6 text-gray-300" />
              <p className="mt-3 text-[13px] text-gray-400">
                Nessun dataset trovato.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Slide-over panel */}
      {panelDataset && (
        <DatasetPanel dataset={panelDataset} onClose={handleClosePanel} />
      )}

      {/* Selection action bar */}
      {selectedDatasets.length > 0 && (
        <SelectionBar
          selected={selectedDatasets}
          onClear={handleClearSelection}
          onRemove={handleRemoveFromSelection}
        />
      )}
    </div>
  );
}
