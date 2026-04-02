import { create } from "zustand";
import type {
  ChartType,
  GeoScope,
  LegendData,
  ViewMode,
  WorkbenchDataset,
  WorkbenchState,
} from "./datasets/types";
import type { PaletteKey } from "./workbench/choropleth";

interface WorkbenchActions {
  // Dataset management
  addDataset: (dataset: WorkbenchDataset) => void;
  removeDataset: (id: string) => void;
  setActiveDataset: (id: string | null) => void;
  setDatasetField: (id: string, field: string) => void;
  setDatasetPalette: (id: string, palette: PaletteKey) => void;
  setDatasetOpacity: (id: string, opacity: number) => void;

  // Boundary layers
  toggleBoundary: (id: string) => void;
  setBoundaryOpacity: (id: string, opacity: number) => void;

  // Transit
  toggleTransitStops: () => void;

  // Map state
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  selectFeature: (
    featureId: string | null,
    properties?: Record<string, unknown>,
  ) => void;

  // UI state
  toggleBottomPanel: () => void;
  setViewMode: (mode: ViewMode) => void;
  setChartType: (type: ChartType) => void;
  setGeoScope: (scope: GeoScope | null) => void;
  setActiveLegend: (legend: LegendData | null) => void;
}

/** Initial map view: centered on Italy. */
const INITIAL_CENTER: [number, number] = [12.5, 41.9];
const INITIAL_ZOOM = 5.0;

export const useWorkbenchStore = create<WorkbenchState & WorkbenchActions>(
  (set) => ({
    // ── State ──────────────────────────────────────────────
    datasets: [],
    activeDatasetId: null,

    boundaries: [
      {
        id: "regioni",
        label: "Confini Regionali",
        visible: true,
        opacity: 0.6,
      },
      {
        id: "province",
        label: "Confini Provinciali",
        visible: true,
        opacity: 0.4,
      },
      { id: "comuni", label: "Confini Comunali", visible: false, opacity: 0.3 },
    ],

    transitStopsVisible: false,

    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    selectedFeatureId: null,
    selectedFeatureProperties: null,
    bottomPanelOpen: false,
    viewMode: "map",
    chartType: "ranking",
    geoScope: null,
    activeLegend: null,

    // ── Dataset actions ────────────────────────────────────
    addDataset: (dataset) =>
      set((state) => ({
        datasets: [...state.datasets, dataset],
        activeDatasetId:
          state.datasets.length === 0 ? dataset.id : state.activeDatasetId,
      })),

    removeDataset: (id) =>
      set((state) => {
        const remaining = state.datasets.filter((d) => d.id !== id);
        return {
          datasets: remaining,
          activeDatasetId:
            state.activeDatasetId === id
              ? (remaining[0]?.id ?? null)
              : state.activeDatasetId,
        };
      }),

    setActiveDataset: (id) => set({ activeDatasetId: id }),

    setDatasetField: (id, field) =>
      set((state) => ({
        datasets: state.datasets.map((d) =>
          d.id === id ? { ...d, activeField: field } : d,
        ),
      })),

    setDatasetPalette: (id, palette) =>
      set((state) => ({
        datasets: state.datasets.map((d) =>
          d.id === id ? { ...d, palette } : d,
        ),
      })),

    setDatasetOpacity: (id, opacity) =>
      set((state) => ({
        datasets: state.datasets.map((d) =>
          d.id === id ? { ...d, opacity } : d,
        ),
      })),

    // ── Boundary actions ───────────────────────────────────
    toggleBoundary: (id) =>
      set((state) => ({
        boundaries: state.boundaries.map((b) =>
          b.id === id ? { ...b, visible: !b.visible } : b,
        ),
      })),

    setBoundaryOpacity: (id, opacity) =>
      set((state) => ({
        boundaries: state.boundaries.map((b) =>
          b.id === id ? { ...b, opacity } : b,
        ),
      })),

    // ── Transit actions ────────────────────────────────────
    toggleTransitStops: () =>
      set((state) => ({ transitStopsVisible: !state.transitStopsVisible })),

    // ── Map actions ────────────────────────────────────────
    setCenter: (center) => set({ center }),
    setZoom: (zoom) => set({ zoom }),

    selectFeature: (featureId, properties) =>
      set({
        selectedFeatureId: featureId,
        selectedFeatureProperties: properties ?? null,
        bottomPanelOpen: featureId !== null,
      }),

    // ── UI actions ─────────────────────────────────────────
    toggleBottomPanel: () =>
      set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),

    setViewMode: (mode) => set({ viewMode: mode }),
    setChartType: (type) => set({ chartType: type }),
    setGeoScope: (scope) => set({ geoScope: scope }),
    setActiveLegend: (legend) => set({ activeLegend: legend }),
  }),
);
