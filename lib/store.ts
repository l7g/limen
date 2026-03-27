import { create } from "zustand";
import type { LayerConfig, WorkbenchState } from "./datasets/types";

interface WorkbenchActions {
  toggleLayer: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  addLayer: (layer: LayerConfig) => void;
  removeLayer: (layerId: string) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  selectFeature: (
    featureId: string | null,
    properties?: Record<string, unknown>,
  ) => void;
  toggleBottomPanel: () => void;
}

/** Initial map view: centered on Italy. */
const INITIAL_CENTER: [number, number] = [12.5, 41.9];
const INITIAL_ZOOM = 5.5;

export const useWorkbenchStore = create<WorkbenchState & WorkbenchActions>(
  (set) => ({
    // ── State ──────────────────────────────────────────────
    layers: [
      {
        id: "boundaries-regioni",
        datasetId: "istat-boundaries-regioni",
        label: "Confini Regionali",
        visible: true,
        opacity: 0.6,
        type: "line",
      },
      {
        id: "boundaries-province",
        datasetId: "istat-boundaries-province",
        label: "Confini Provinciali",
        visible: true,
        opacity: 0.4,
        type: "line",
      },
      {
        id: "boundaries-comuni",
        datasetId: "istat-boundaries-comuni",
        label: "Confini Comunali",
        visible: false,
        opacity: 0.3,
        type: "line",
      },
      {
        id: "population",
        datasetId: "istat-population",
        label: "Popolazione",
        visible: false,
        opacity: 0.8,
        type: "fill",
      },
      {
        id: "gtfs-stops",
        datasetId: "gtfs-arst",
        label: "Fermate GTFS",
        visible: false,
        opacity: 0.9,
        type: "circle",
      },
      {
        id: "vehicles",
        datasetId: "aci-vehicles",
        label: "Parco Veicolare",
        visible: false,
        opacity: 0.8,
        type: "fill",
      },
    ],
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    selectedFeatureId: null,
    selectedFeatureProperties: null,
    bottomPanelOpen: false,

    // ── Actions ────────────────────────────────────────────
    toggleLayer: (layerId) =>
      set((state) => ({
        layers: state.layers.map((l) =>
          l.id === layerId ? { ...l, visible: !l.visible } : l,
        ),
      })),

    setLayerOpacity: (layerId, opacity) =>
      set((state) => ({
        layers: state.layers.map((l) =>
          l.id === layerId ? { ...l, opacity } : l,
        ),
      })),

    addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),

    removeLayer: (layerId) =>
      set((state) => ({
        layers: state.layers.filter((l) => l.id !== layerId),
      })),

    setCenter: (center) => set({ center }),

    setZoom: (zoom) => set({ zoom }),

    selectFeature: (featureId, properties) =>
      set({
        selectedFeatureId: featureId,
        selectedFeatureProperties: properties ?? null,
        bottomPanelOpen: featureId !== null,
      }),

    toggleBottomPanel: () =>
      set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),
  }),
);
