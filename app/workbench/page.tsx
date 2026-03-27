"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Plus, Upload, Download, Eye } from "lucide-react";
import { useWorkbenchStore } from "@/lib/store";

/** Dynamic import — MapLibre needs DOM + WebGL, must never SSR. */
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
      Caricamento mappa…
    </div>
  ),
});

/**
 * Reads ?layer= param on mount to auto-enable a layer from catalog links.
 * URL is kept clean — no continuous write-back of map state.
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

export default function WorkbenchPage() {
  const layers = useWorkbenchStore((s) => s.layers);
  const toggleLayer = useWorkbenchStore((s) => s.toggleLayer);
  const setLayerOpacity = useWorkbenchStore((s) => s.setLayerOpacity);
  const bottomPanelOpen = useWorkbenchStore((s) => s.bottomPanelOpen);
  const toggleBottomPanel = useWorkbenchStore((s) => s.toggleBottomPanel);
  const selectedFeatureProperties = useWorkbenchStore(
    (s) => s.selectedFeatureProperties,
  );

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
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
            Workbench
          </span>
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
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Layer
              </p>
              <button
                type="button"
                className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                aria-label="Aggiungi layer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Store-driven layers */}
            <div className="mt-3 space-y-1">
              {layers.map((layer) => (
                <div key={layer.id} className="space-y-0.5">
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
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        layer.visible ? "bg-[#00D9A3]" : "bg-zinc-600"
                      }`}
                    />
                    {layer.label}
                  </button>
                  {layer.visible && (
                    <div className="flex items-center gap-1.5 px-2 pl-6 pb-1.5">
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
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Map viewport */}
        <main className="relative flex-1 min-w-0 bg-zinc-950">
          <Suspense>
            <LayerParamSync />
          </Suspense>
          <div className="absolute inset-0">
            <MapView />
          </div>
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
                  {Object.entries(selectedFeatureProperties).map(
                    ([key, value]) => (
                      <tr
                        key={key}
                        className="border-b border-zinc-800 text-zinc-300"
                      >
                        <td className="py-1 pr-4 font-mono text-zinc-400">
                          {key}
                        </td>
                        <td className="py-1">{String(value ?? "")}</td>
                      </tr>
                    ),
                  )}
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
