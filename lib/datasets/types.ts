/** Dataset freshness metadata — every dataset in the catalog conforms to this shape. */
export interface DatasetMeta {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  source: string;
  sourceUrl: string;
  description: string;
  cadence: DatasetCadence;
  lastUpdated: string;
  nextExpectedUpdate?: string;
  expectedPublishMonth?: number;
  expiryWarningDays: number;
  status: DatasetStatus;
  coverage: DatasetCoverage;
  format: DatasetFormat;
  category: DatasetCategory;
  license: string;
  fetchScript?: string;
  filePath: string;
  geometryType?: GeometryType;
  joinField?: string;
}

export type DatasetCadence =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annual"
  | "decennial"
  | "static";

export type DatasetStatus = "current" | "expiring" | "stale" | "error";

export type DatasetCoverage = "italy" | "sardinia" | "custom";

export type DatasetFormat =
  | "geojson"
  | "csv"
  | "gtfs"
  | "json"
  | "pbf"
  | "raster";

export type DatasetCategory =
  | "confini"
  | "demografia"
  | "trasporti"
  | "veicoli"
  | "economia"
  | "ambiente"
  | "servizi"
  | "indicatori";

export type GeometryType = "point" | "line" | "polygon" | "none";

/** Configuration for a single map layer in the workbench. */
export interface LayerConfig {
  id: string;
  datasetId: string;
  label: string;
  visible: boolean;
  opacity: number;
  type: "fill" | "line" | "circle" | "symbol" | "heatmap";
  paint?: Record<string, unknown>;
  choropleth?: ChoroplethConfig;
}

/** Choropleth rendering configuration. */
export interface ChoroplethConfig {
  field: string;
  scale: "linear" | "quantile" | "quantize" | "threshold";
  colors: string[];
  breaks?: number[];
  legend?: string;
}

/** Workbench state stored in Zustand. */
export interface WorkbenchState {
  layers: LayerConfig[];
  center: [number, number];
  zoom: number;
  selectedFeatureId: string | null;
  selectedFeatureProperties: Record<string, unknown> | null;
  bottomPanelOpen: boolean;
}
