"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Download,
  Eye,
  MapIcon,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { useWorkbenchStore } from "@/lib/store";
import { INDICATORS } from "@/lib/workbench/choropleth";
import { TEMPLATES, buildTemplateLayers } from "@/lib/workbench/templates";
import type { WorkbenchTemplate } from "@/lib/workbench/templates";

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

/**
 * Reads ?layer= param on mount to auto-enable a layer from catalog links.
 */
function LayerParamSync() {
  const searchParams = useSearchParams();
  const layers = useWorkbenchStore((s) => s.layers);
  const toggleLayer = useWorkbenchStore((s) => s.toggleLayer);

  useEffect(() => {
    const layerParam = searchParams.get("layer");
    if (!layerParam) return;
    const target = layers.find((l) => l.datasetId === layerParam);
    if (target && !target.visible) toggleLayer(target.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** Field selector for choropleth layers. */
function FieldSelector({ layerId }: { layerId: string }) {
  const layer = useWorkbenchStore((s) =>
    s.layers.find((l) => l.id === layerId),
  );
  const setChoropleth = useWorkbenchStore((s) => s.setChoropleth);

  const indicator = INDICATORS.find((i) => i.id === layerId);
  if (!indicator || indicator.fields.length <= 1) return null;

  const activeField = layer?.choropleth?.field ?? indicator.defaultField;

  return (
    <div className="px-2 pl-6 pb-1.5">
      <div className="relative">
        <select
          value={activeField}
          onChange={(e) =>
            setChoropleth(layerId, {
              field: e.target.value,
              scale: "quantile",
              colors: [],
            })
          }
          className="w-full appearance-none rounded bg-zinc-700 px-2 py-1 pr-6 text-[10px] text-zinc-300 outline-none focus:ring-1 focus:ring-[#00D9A3]/50"
        >
          {indicator.fields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
              {f.unit ? ` (${f.unit})` : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
      </div>
    </div>
  );
}

export default function WorkbenchPage() {
  const layers = useWorkbenchStore((s) => s.layers);
  const toggleLayer = useWorkbenchStore((s) => s.toggleLayer);
  const setLayerOpacity = useWorkbenchStore((s) => s.setLayerOpacity);
  const bottomPanelOpen = useWorkbenchStore((s) => s.bottomPanelOpen);
  const toggleBottomPanel = useWorkbenchStore((s) => s.toggleBottomPanel);
  const selectedFeatureProperties = useWorkbenchStore(
    (s) => s.selectedFeatureProperties,
  );
  const viewMode = useWorkbenchStore((s) => s.viewMode);
  const setViewMode = useWorkbenchStore((s) => s.setViewMode);
  const setChartType = useWorkbenchStore((s) => s.setChartType);
  const applyTemplate = useWorkbenchStore((s) => s.applyTemplate);

  const boundaryLayers = layers.filter((l) => l.type === "line");
  const dataLayers = layers.filter((l) => l.type !== "line");
  const hasActiveData = dataLayers.some((l) => l.visible);

  function handleTemplate(t: WorkbenchTemplate) {
    const newLayers = buildTemplateLayers(layers, t);
    applyTemplate(t.id, newLayers);
    setViewMode(t.viewMode);
    if (t.chartType) setChartType(t.chartType);
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
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Upload className="h-3 w-3" />
            Carica
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Download className="h-3 w-3" />
            Esporta
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Layer panel */}
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900">
          <div className="p-3">
            {/* Boundary layers */}
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
              Confini
            </p>
            <div className="space-y-0.5">
              {boundaryLayers.map((layer) => (
                <div key={layer.id}>
                  <button
                    type="button"
                    onClick={() => toggleLayer(layer.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-left transition-colors ${
                      layer.visible
                        ? "bg-zinc-800 text-zinc-200"
                        : "text-zinc-500 hover:bg-zinc-800/50"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        layer.visible ? "bg-[#00D9A3]" : "bg-zinc-600"
                      }`}
                    />
                    {layer.label}
                  </button>
                  {layer.visible && (
                    <div className="flex items-center gap-1.5 px-2 pl-5 pb-1">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={layer.opacity}
                        onChange={(e) =>
                          setLayerOpacity(layer.id, Number(e.target.value))
                        }
                        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00D9A3]"
                        aria-label={`Opacità ${layer.label}`}
                      />
                      <span className="text-[10px] text-zinc-500 tabular-nums w-7 text-right shrink-0">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="my-3 border-t border-zinc-800" />

            {/* Data / indicator layers */}
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
              Indicatori
            </p>
            <div className="space-y-0.5">
              {dataLayers.map((layer) => (
                <div key={layer.id}>
                  <button
                    type="button"
                    onClick={() => toggleLayer(layer.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-left transition-colors ${
                      layer.visible
                        ? "bg-zinc-800 text-zinc-200"
                        : "text-zinc-500 hover:bg-zinc-800/50"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-sm ${
                        layer.visible
                          ? layer.type === "circle"
                            ? "bg-amber-400"
                            : "bg-[#00D9A3]"
                          : "bg-zinc-600"
                      }`}
                    />
                    {layer.label}
                  </button>
                  {layer.visible && (
                    <>
                      <div className="flex items-center gap-1.5 px-2 pl-6 pb-0.5">
                        <Eye className="h-3 w-3 shrink-0 text-zinc-500" />
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={layer.opacity}
                          onChange={(e) =>
                            setLayerOpacity(layer.id, Number(e.target.value))
                          }
                          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00D9A3]"
                          aria-label={`Opacità ${layer.label}`}
                        />
                        <span className="text-[10px] text-zinc-500 tabular-nums w-7 text-right shrink-0">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </div>
                      {layer.type === "fill" && (
                        <FieldSelector layerId={layer.id} />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
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

          {/* Template gallery — shown when no data layers active */}
          {!hasActiveData && viewMode === "map" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
              <div className="max-w-2xl px-6">
                <h2 className="text-center text-lg font-medium text-zinc-200 mb-1">
                  Esplora i dati italiani
                </h2>
                <p className="text-center text-[12px] text-zinc-500 mb-6">
                  Scegli un template per iniziare, oppure attiva i layer dal
                  pannello.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTemplate(t)}
                      className="group flex flex-col gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800/80"
                    >
                      <div
                        className="h-1 w-8 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-[12px] font-medium text-zinc-200 group-hover:text-white">
                        {t.title}
                      </span>
                      <span className="text-[10px] text-zinc-500 leading-snug">
                        {t.subtitle}
                      </span>
                      <span className="mt-auto text-[10px] font-medium text-zinc-600 group-hover:text-[#00D9A3] transition-colors">
                        {t.viewMode === "map" ? "🗺 Mappa" : "📊 Grafico"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
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
    </div>
  );
}
