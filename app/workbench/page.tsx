"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  MapIcon,
  BarChart3,
  ChevronDown,
  Globe,
  X,
  Plus,
  Trash2,
  Palette,
} from "lucide-react";
import { useWorkbenchStore } from "@/lib/store";
import {
  INDICATORS,
  INDICATOR_PALETTES,
  PALETTES,
} from "@/lib/workbench/choropleth";
import type { PaletteKey } from "@/lib/workbench/choropleth";
import {
  TEMPLATES,
  datasetFromTemplate,
  datasetFromIndicator,
} from "@/lib/workbench/templates";
import type { WorkbenchTemplate } from "@/lib/workbench/templates";
import { REGIONS, PROVINCES } from "@/lib/workbench/geo-scope";
import type { WorkbenchDataset } from "@/lib/datasets/types";
import { datasets as catalogDatasets } from "@/lib/datasets/catalog";

/** Dynamic import — MapLibre needs DOM + WebGL, must never SSR. */
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
      Caricamento mappa…
    </div>
  ),
});

const ChartView = dynamic(() => import("@/components/charts/ChartView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
      Caricamento grafici…
    </div>
  ),
});

const PALETTE_OPTIONS: { key: PaletteKey; label: string }[] = [
  { key: "teal", label: "Verde" },
  { key: "blue", label: "Blu" },
  { key: "purple", label: "Viola" },
  { key: "orange", label: "Arancio" },
  { key: "red", label: "Rosso" },
  { key: "diverging", label: "Divergente" },
];

/**
 * Reads ?layer= param on mount to auto-add a dataset from catalog links.
 */
function LayerParamSync() {
  const searchParams = useSearchParams();
  const datasets = useWorkbenchStore((s) => s.datasets);
  const addDataset = useWorkbenchStore((s) => s.addDataset);

  useEffect(() => {
    const layerParam = searchParams.get("layer");
    if (!layerParam) return;
    // Don't add if already present
    if (datasets.some((d) => d.datasetId === layerParam)) return;
    const ds = datasetFromIndicator(layerParam);
    if (ds) addDataset(ds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** Catalog datasets that can be visualized (have joinField + CSV on known indicators). */
const ADDABLE_DATASETS = INDICATORS.map((ind) => {
  const cat = catalogDatasets.find(
    (d) => d.id === ind.id || d.filePath.includes(ind.csv.split("/").pop()!),
  );
  return {
    indicatorId: ind.id,
    label: ind.label,
    description: cat?.description ?? "",
    scale: ind.scale,
    palette: INDICATOR_PALETTES[ind.id] ?? "teal",
  };
});

export default function WorkbenchPage() {
  const wbDatasets = useWorkbenchStore((s) => s.datasets);
  const activeDatasetId = useWorkbenchStore((s) => s.activeDatasetId);
  const addDataset = useWorkbenchStore((s) => s.addDataset);
  const removeDataset = useWorkbenchStore((s) => s.removeDataset);
  const setActiveDataset = useWorkbenchStore((s) => s.setActiveDataset);
  const setDatasetField = useWorkbenchStore((s) => s.setDatasetField);
  const setDatasetPalette = useWorkbenchStore((s) => s.setDatasetPalette);
  const setDatasetOpacity = useWorkbenchStore((s) => s.setDatasetOpacity);

  const boundaries = useWorkbenchStore((s) => s.boundaries);
  const toggleBoundary = useWorkbenchStore((s) => s.toggleBoundary);
  const setBoundaryOpacity = useWorkbenchStore((s) => s.setBoundaryOpacity);

  const bottomPanelOpen = useWorkbenchStore((s) => s.bottomPanelOpen);
  const toggleBottomPanel = useWorkbenchStore((s) => s.toggleBottomPanel);
  const selectedFeatureProperties = useWorkbenchStore(
    (s) => s.selectedFeatureProperties,
  );
  const viewMode = useWorkbenchStore((s) => s.viewMode);
  const setViewMode = useWorkbenchStore((s) => s.setViewMode);
  const setChartType = useWorkbenchStore((s) => s.setChartType);
  const geoScope = useWorkbenchStore((s) => s.geoScope);
  const setGeoScope = useWorkbenchStore((s) => s.setGeoScope);
  const activeLegend = useWorkbenchStore((s) => s.activeLegend);

  const [showPicker, setShowPicker] = useState(false);

  const activeDs = useMemo(
    () => wbDatasets.find((d) => d.id === activeDatasetId) ?? null,
    [wbDatasets, activeDatasetId],
  );

  function handleTemplate(t: WorkbenchTemplate) {
    const ds = datasetFromTemplate(t);
    if (!ds) return;
    addDataset(ds);
    setViewMode(t.viewMode);
    if (t.chartType) setChartType(t.chartType);
  }

  function handleAddFromPicker(indicatorId: string) {
    // Don't add duplicates
    if (wbDatasets.some((d) => d.datasetId === indicatorId)) {
      setActiveDataset(wbDatasets.find((d) => d.datasetId === indicatorId)!.id);
      setShowPicker(false);
      return;
    }
    const ds = datasetFromIndicator(indicatorId);
    if (ds) {
      addDataset(ds);
      setShowPicker(false);
    }
  }

  function handleRegionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "") {
      setGeoScope(null);
      return;
    }
    const code = parseInt(val, 10);
    const region = REGIONS.find((r) => r.code === code);
    if (region) {
      setGeoScope({ type: "regione", code: region.code, name: region.name });
    }
  }

  function handleProvinceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "") {
      // Back to region scope
      if (geoScope) {
        const region = REGIONS.find(
          (r) =>
            r.code ===
            (geoScope.type === "provincia"
              ? PROVINCES.find((p) => p.code === geoScope.code)?.regionCode
              : geoScope.code),
        );
        if (region) {
          setGeoScope({
            type: "regione",
            code: region.code,
            name: region.name,
          });
        }
      }
      return;
    }
    const code = parseInt(val, 10);
    const prov = PROVINCES.find((p) => p.code === code);
    if (prov) {
      setGeoScope({ type: "provincia", code: prov.code, name: prov.name });
    }
  }

  // Provinces available for current region scope
  const availableProvinces = useMemo(() => {
    if (!geoScope) return [];
    const regionCode =
      geoScope.type === "regione"
        ? geoScope.code
        : PROVINCES.find((p) => p.code === geoScope.code)?.regionCode;
    if (!regionCode) return [];
    return PROVINCES.filter((p) => p.regionCode === regionCode);
  }, [geoScope]);

  function handleExportPng() {
    const canvas = document.querySelector(
      ".maplibregl-canvas",
    ) as HTMLCanvasElement | null;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `limen-mappa-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100 overflow-hidden fixed inset-0 z-50">
      {/* Toolbar */}
      <header className="flex h-11 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="font-heading text-[13px] font-semibold tracking-[-0.01em]">
              <span className="text-[#00D9A3]">L</span>
              <span>IMEN</span>
            </span>
          </Link>
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
            Beta
          </span>
          <span className="h-4 w-px bg-zinc-700" />

          {/* View mode toggle */}
          <div className="flex rounded-md bg-zinc-800 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                viewMode === "map"
                  ? "bg-zinc-700 text-[#00D9A3]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <MapIcon className="h-3 w-3" />
              Mappa
            </button>
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                viewMode === "chart"
                  ? "bg-zinc-700 text-[#00D9A3]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <BarChart3 className="h-3 w-3" />
              Grafico
            </button>
          </div>

          {/* Geo scope badge */}
          {geoScope && (
            <button
              type="button"
              onClick={() => setGeoScope(null)}
              className="flex items-center gap-1 rounded-full bg-[#00D9A3]/10 px-2 py-0.5 text-[10px] font-medium text-[#00D9A3] hover:bg-[#00D9A3]/20 transition-colors"
            >
              <Globe className="h-2.5 w-2.5" />
              {geoScope.name}
              <X className="h-2.5 w-2.5 ml-0.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleExportPng}
            disabled={viewMode !== "map"}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Camera className="h-3.5 w-3.5" />
            Esporta PNG
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900 flex flex-col">
          {/* Dataset attivi section */}
          <div className="p-3 flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Dataset attivi
              </span>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#00D9A3] hover:bg-[#00D9A3]/10 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Aggiungi
              </button>
            </div>

            {wbDatasets.length === 0 ? (
              <div className="space-y-3">
                {/* Quick-start templates */}
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
                  Inizia con
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {TEMPLATES.filter((t) => t.viewMode === "map")
                    .slice(0, 4)
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTemplate(t)}
                        className="group flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-800/40 p-2 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800"
                      >
                        <div
                          className="h-0.5 w-5 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="text-[10px] font-medium text-zinc-300 group-hover:text-white leading-tight">
                          {t.title}
                        </span>
                      </button>
                    ))}
                </div>
                {/* Chart templates */}
                {TEMPLATES.filter((t) => t.viewMode === "chart").length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {TEMPLATES.filter((t) => t.viewMode === "chart").map(
                      (t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTemplate(t)}
                          className="group flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-800/40 p-2 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800"
                        >
                          <BarChart3 className="h-2.5 w-2.5 text-zinc-600 group-hover:text-[#00D9A3]" />
                          <span className="text-[10px] font-medium text-zinc-300 group-hover:text-white leading-tight">
                            {t.title}
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                )}
                {/* Or pick manually */}
                <div className="pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#00D9A3]/10 px-3 py-2 text-[11px] font-medium text-[#00D9A3] hover:bg-[#00D9A3]/20 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Scegli dataset
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {wbDatasets.map((ds) => {
                  const isActive = ds.id === activeDatasetId;
                  return (
                    <div
                      key={ds.id}
                      className={`rounded-lg border transition-colors ${
                        isActive
                          ? "border-[#00D9A3]/30 bg-zinc-800"
                          : "border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800/70"
                      }`}
                    >
                      {/* Dataset header — click to activate */}
                      <button
                        type="button"
                        onClick={() => setActiveDataset(ds.id)}
                        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{
                            backgroundColor: isActive
                              ? PALETTES[ds.palette][3]
                              : "#3f3f46",
                          }}
                        />
                        <span
                          className={`flex-1 truncate text-[12px] font-medium ${
                            isActive ? "text-zinc-100" : "text-zinc-400"
                          }`}
                        >
                          {ds.label}
                        </span>
                        <span className="text-[9px] text-zinc-600 shrink-0">
                          {ds.scale === "comunale" ? "COM" : "PROV"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDataset(ds.id);
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </button>

                      {/* Expanded config — only for active dataset */}
                      {isActive && (
                        <div className="px-2.5 pb-2.5 space-y-2">
                          {/* Field selector */}
                          {ds.numericFields.length > 1 && (
                            <div>
                              <label className="text-[10px] text-zinc-500 mb-0.5 block">
                                Campo
                              </label>
                              <div className="relative">
                                <select
                                  value={ds.activeField}
                                  onChange={(e) =>
                                    setDatasetField(ds.id, e.target.value)
                                  }
                                  className="w-full appearance-none rounded bg-zinc-700 px-2 py-1 pr-6 text-[11px] text-zinc-300 outline-none focus:ring-1 focus:ring-[#00D9A3]/50"
                                >
                                  {ds.numericFields.map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label}
                                      {f.unit ? ` (${f.unit})` : ""}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
                              </div>
                            </div>
                          )}

                          {/* Palette selector */}
                          <div>
                            <label className="text-[10px] text-zinc-500 mb-0.5 block">
                              Palette
                            </label>
                            <div className="flex gap-1">
                              {PALETTE_OPTIONS.map((p) => (
                                <button
                                  key={p.key}
                                  type="button"
                                  onClick={() =>
                                    setDatasetPalette(ds.id, p.key)
                                  }
                                  title={p.label}
                                  className={`h-5 flex-1 rounded transition-all ${
                                    ds.palette === p.key
                                      ? "ring-2 ring-white/40 scale-105"
                                      : "opacity-60 hover:opacity-100"
                                  }`}
                                  style={{
                                    background: `linear-gradient(to right, ${PALETTES[p.key][0]}, ${PALETTES[p.key][2]}, ${PALETTES[p.key][4]})`,
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Opacity slider */}
                          <div>
                            <label className="text-[10px] text-zinc-500 mb-0.5 block">
                              Opacità
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={ds.opacity}
                                onChange={(e) =>
                                  setDatasetOpacity(
                                    ds.id,
                                    Number(e.target.value),
                                  )
                                }
                                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00D9A3]"
                              />
                              <span className="text-[10px] text-zinc-500 tabular-nums w-7 text-right">
                                {Math.round(ds.opacity * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Separator */}
            <div className="my-3 border-t border-zinc-800" />

            {/* Boundary layers */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Confini
              </span>
            </div>
            <div className="space-y-0.5">
              {boundaries.map((b) => (
                <div key={b.id}>
                  <button
                    type="button"
                    onClick={() => toggleBoundary(b.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-left transition-colors ${
                      b.visible
                        ? "bg-zinc-800/60 text-zinc-300"
                        : "text-zinc-600 hover:bg-zinc-800/30"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-4 shrink-0 rounded-full ${
                        b.visible ? "bg-[#00D9A3]" : "bg-zinc-700"
                      }`}
                    />
                    {b.label}
                  </button>
                  {b.visible && (
                    <div className="flex items-center gap-1.5 px-2 pl-8 pb-1">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={b.opacity}
                        onChange={(e) =>
                          setBoundaryOpacity(b.id, Number(e.target.value))
                        }
                        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00D9A3]"
                        aria-label={`Opacità ${b.label}`}
                      />
                      <span className="text-[10px] text-zinc-500 tabular-nums w-7 text-right shrink-0">
                        {Math.round(b.opacity * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="my-3 border-t border-zinc-800" />

            {/* Geographic scope */}
            <div className="flex items-center gap-1.5 mb-2">
              <Globe className="h-3 w-3 text-zinc-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Ambito Geografico
              </span>
            </div>
            <div className="space-y-1.5">
              {/* Region selector */}
              <div className="relative">
                <select
                  value={
                    geoScope?.type === "regione"
                      ? geoScope.code
                      : geoScope?.type === "provincia"
                        ? (PROVINCES.find((p) => p.code === geoScope.code)
                            ?.regionCode ?? "")
                        : ""
                  }
                  onChange={handleRegionChange}
                  className="w-full appearance-none rounded-md bg-zinc-800 border border-zinc-700 px-2.5 py-1.5 pr-7 text-[12px] text-zinc-200 outline-none focus:ring-1 focus:ring-[#00D9A3]/50 focus:border-[#00D9A3]/30 transition-colors"
                >
                  <option value="">Tutta Italia</option>
                  {REGIONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
              </div>

              {/* Province drill-down — appears when a region is selected */}
              {geoScope && availableProvinces.length > 1 && (
                <div className="relative">
                  <select
                    value={geoScope.type === "provincia" ? geoScope.code : ""}
                    onChange={handleProvinceChange}
                    className="w-full appearance-none rounded-md bg-zinc-800 border border-zinc-700 px-2.5 py-1.5 pr-7 text-[11px] text-zinc-300 outline-none focus:ring-1 focus:ring-[#00D9A3]/50 focus:border-[#00D9A3]/30 transition-colors"
                  >
                    <option value="">Tutta la regione</option>
                    {availableProvinces.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.sigla})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
                </div>
              )}
            </div>
          </div>

          {/* Legend — pinned to bottom of sidebar */}
          {activeLegend && (
            <div className="border-t border-zinc-800 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Legenda
              </p>
              <p className="text-[11px] text-zinc-300 mb-1.5">
                {activeLegend.label}
                {activeLegend.unit ? (
                  <span className="text-zinc-500"> ({activeLegend.unit})</span>
                ) : null}
              </p>
              <div className="flex gap-0">
                {activeLegend.palette.map((color, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full h-3 first:rounded-l last:rounded-r"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[8px] text-zinc-500 mt-0.5 tabular-nums">
                      {i < activeLegend.breaks.length
                        ? formatLegendValue(activeLegend.breaks[i])
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[8px] text-zinc-600">min</span>
                <span className="text-[8px] text-zinc-600">max</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main viewport — map or chart */}
        <main className="relative flex-1 min-w-0 bg-zinc-950">
          <Suspense>
            <LayerParamSync />
          </Suspense>
          {/* Map always mounted, hidden when chart mode */}
          <div
            className="absolute inset-0"
            style={{ display: viewMode === "map" ? "block" : "none" }}
          >
            <MapView />
          </div>
          {/* Chart view */}
          {viewMode === "chart" && (
            <div className="absolute inset-0 overflow-auto">
              <ChartView />
            </div>
          )}
        </main>
      </div>

      {/* Bottom panel — feature attribute table */}
      <div
        className={`shrink-0 border-t border-zinc-800 bg-zinc-900 transition-[height] duration-200 ${bottomPanelOpen ? "h-48" : "h-8"}`}
      >
        <div className="flex h-8 items-center px-3">
          <button
            type="button"
            onClick={toggleBottomPanel}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {bottomPanelOpen ? "▼" : "▲"} Tabella dati
          </button>
        </div>
        {bottomPanelOpen && (
          <div className="h-[calc(100%-2rem)] overflow-auto px-3 pb-2">
            {selectedFeatureProperties ? (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-400">
                    <th className="py-1 pr-4 text-left font-medium">Campo</th>
                    <th className="py-1 text-left font-medium">Valore</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedFeatureProperties)
                    .filter(([key]) => key !== "_joined")
                    .map(([key, value]) => (
                      <tr
                        key={key}
                        className="border-b border-zinc-800 text-zinc-300"
                      >
                        <td className="py-1 pr-4 font-mono text-zinc-400">
                          {key}
                        </td>
                        <td className="py-1">
                          {typeof value === "number"
                            ? value.toLocaleString("it-IT")
                            : String(value ?? "")}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[11px] text-zinc-500 italic">
                Clicca un elemento sulla mappa per vedere i suoi attributi.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Dataset Picker Modal ──────────────────────────────── */}
      {showPicker && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
              <h3 className="text-sm font-medium text-zinc-200">
                Aggiungi dataset
              </h3>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-3">
              <div className="space-y-1">
                {ADDABLE_DATASETS.map((item) => {
                  const alreadyAdded = wbDatasets.some(
                    (d) => d.datasetId === item.indicatorId,
                  );
                  return (
                    <button
                      key={item.indicatorId}
                      type="button"
                      onClick={() => handleAddFromPicker(item.indicatorId)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        alreadyAdded
                          ? "bg-zinc-800/50 text-zinc-500"
                          : "hover:bg-zinc-800 text-zinc-200"
                      }`}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{
                          backgroundColor:
                            PALETTES[item.palette as PaletteKey][3],
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {item.scale === "comunale"
                            ? "Comunale"
                            : "Provinciale"}
                          {alreadyAdded && " · Già aggiunto"}
                        </p>
                      </div>
                      {!alreadyAdded && (
                        <Plus className="h-4 w-4 shrink-0 text-zinc-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Format legend break values compactly. */
function formatLegendValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
}
