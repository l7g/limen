import type {
  ViewMode,
  ChartType,
  WorkbenchDataset,
} from "@/lib/datasets/types";
import { INDICATORS, INDICATOR_PALETTES } from "./choropleth";
import type { PaletteKey } from "./choropleth";

export interface WorkbenchTemplate {
  id: string;
  title: string;
  subtitle: string;
  /** Which indicator id to add. */
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
 * Build a WorkbenchDataset from a template's indicator definition.
 * Returns null if the indicator is unknown.
 */
export function datasetFromTemplate(
  template: WorkbenchTemplate,
): WorkbenchDataset | null {
  const ind = INDICATORS.find((i) => i.id === template.indicator);
  if (!ind) return null;

  return {
    id: `tpl-${template.id}-${Date.now()}`,
    datasetId: template.indicator,
    type: "choropleth" as const,
    label: ind.label,
    csvPath: ind.csv,
    joinKey: ind.joinKey,
    scale: ind.scale,
    numericFields: ind.fields,
    activeField: template.field ?? ind.defaultField,
    palette: (INDICATOR_PALETTES[ind.id] ?? "teal") as PaletteKey,
    opacity: 0.8,
  };
}

/**
 * Build a WorkbenchDataset from a known indicator id.
 * Used by "Apri nel Workbench" from the catalog.
 */
export function datasetFromIndicator(
  indicatorId: string,
): WorkbenchDataset | null {
  const ind = INDICATORS.find((i) => i.id === indicatorId);
  if (!ind) return null;

  return {
    id: `ind-${indicatorId}-${Date.now()}`,
    datasetId: indicatorId,
    type: "choropleth" as const,
    label: ind.label,
    csvPath: ind.csv,
    joinKey: ind.joinKey,
    scale: ind.scale,
    numericFields: ind.fields,
    activeField: ind.defaultField,
    palette: (INDICATOR_PALETTES[ind.id] ?? "teal") as PaletteKey,
    opacity: 0.8,
  };
}
