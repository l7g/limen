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
  /** Geographic aggregation level of data rows. */
  scale?: DatasetScale;
  /** True for boundary/geometry datasets — not data to be merged, but geographic base layers. */
  isBoundary?: boolean;
  /** How the raw data was obtained. */
  acquisitionMethod?: DatasetAcquisitionMethod;
  /** Group ID for collection display (e.g. "confini", "gtfs-sardegna"). Datasets sharing a group appear as one row in the catalog, with drill-down to individual members. */
  group?: string;
  /** Display label for the group — set only on one member per group. */
  groupLabel?: string;
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

/** Geographic aggregation level of a dataset's rows. */
export type DatasetScale = "comunale" | "provinciale" | "regionale" | "none";

/** How raw data was obtained. */
export type DatasetAcquisitionMethod = "api" | "download" | "derived";

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

/** Workbench view mode. */
export type ViewMode = "map" | "chart";

/** Chart type for chart view. */
export type ChartType = "ranking" | "histogram";

/** Geographic scope filter for workbench. */
export interface GeoScope {
  type: "regione" | "provincia";
  code: number;
  name: string;
}

/** Legend data computed from choropleth breaks. */
export interface LegendData {
  field: string;
  label: string;
  unit?: string;
  breaks: number[];
  palette: readonly string[];
}

/** Workbench state stored in Zustand. */
export interface WorkbenchState {
  layers: LayerConfig[];
  center: [number, number];
  zoom: number;
  selectedFeatureId: string | null;
  selectedFeatureProperties: Record<string, unknown> | null;
  bottomPanelOpen: boolean;
  viewMode: ViewMode;
  chartType: ChartType;
  activeTemplate: string | null;
  geoScope: GeoScope | null;
  activeLegend: LegendData | null;
}
