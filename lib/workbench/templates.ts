import type { LayerConfig, ViewMode, ChartType } from "@/lib/datasets/types";

export interface WorkbenchTemplate {
  id: string;
  title: string;
  subtitle: string;
  /** Which indicator layer to activate + optional field override. */
  indicator: string;
  field?: string;
  viewMode: ViewMode;
  chartType?: ChartType;
  /** Accent color for the template card. */
  color: string;
}

export const TEMPLATES: WorkbenchTemplate[] = [
  {
    id: "density-map",
    title: "Densità Demografica",
    subtitle: "7.896 comuni italiani colorati per densità abitativa",
    indicator: "density",
    field: "densita_ab_km2",
    viewMode: "map",
    color: "#f97316",
  },
  {
    id: "income-map",
    title: "Reddito Pro Capite",
    subtitle: "Mappa del reddito medio per comune",
    indicator: "income",
    field: "reddito_pro_capite",
    viewMode: "map",
    color: "#3b82f6",
  },
  {
    id: "commuters-map",
    title: "Attrattori e Dormitori",
    subtitle: "Bilancio pendolari: chi attrae e chi perde lavoratori",
    indicator: "commuters",
    field: "bilancio_per_1000",
    viewMode: "map",
    color: "#ef4444",
  },
  {
    id: "motorization-map",
    title: "Tasso di Motorizzazione",
    subtitle: "Veicoli per 1.000 abitanti per provincia",
    indicator: "vehicles",
    field: "veicoli_per_1000",
    viewMode: "map",
    color: "#8b5cf6",
  },
  {
    id: "income-ranking",
    title: "Top 50 Comuni per Reddito",
    subtitle: "Classifica dei comuni più ricchi d'Italia",
    indicator: "income",
    field: "reddito_pro_capite",
    viewMode: "chart",
    chartType: "ranking",
    color: "#3b82f6",
  },
  {
    id: "density-histogram",
    title: "Distribuzione Densità",
    subtitle: "Come si distribuisce la densità tra i comuni",
    indicator: "density",
    field: "densita_ab_km2",
    viewMode: "chart",
    chartType: "histogram",
    color: "#f97316",
  },
];

/**
 * Build the layer state for a template.
 * Activates the specified indicator and boundary lines, keeps everything else off.
 */
export function buildTemplateLayers(
  currentLayers: LayerConfig[],
  template: WorkbenchTemplate,
): LayerConfig[] {
  return currentLayers.map((l) => {
    // Activate boundary lines for context
    if (l.id === "boundaries-regioni") {
      return { ...l, visible: true, opacity: 0.5 };
    }
    if (l.id === "boundaries-province") {
      return { ...l, visible: true, opacity: 0.3 };
    }
    // Activate the template's indicator
    if (l.id === template.indicator) {
      return {
        ...l,
        visible: true,
        opacity: 0.8,
        choropleth: template.field
          ? { field: template.field, scale: "quantile", colors: [] }
          : undefined,
      };
    }
    // Everything else off
    return { ...l, visible: false };
  });
}
