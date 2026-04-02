"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Map,
  Source,
  Layer,
  NavigationControl,
  AttributionControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  LngLatBoundsLike,
  LngLatBounds as LngLatBoundsType,
} from "maplibre-gl";
import { LngLatBounds } from "maplibre-gl";
import { useWorkbenchStore } from "@/lib/store";
import {
  INDICATORS,
  PALETTES,
  enrichGeoJSON,
  extractValues,
  quantileBreaks,
  buildStepExpression,
  type IndicatorDef,
} from "@/lib/workbench/choropleth";
import { filterFeaturesByScope } from "@/lib/workbench/geo-scope";

/** Free CARTO Dark Matter — no API key, dark theme for workbench. */
const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Bounding box: SW corner to NE corner covering Italy + padding. */
const ITALY_BOUNDS: LngLatBoundsLike = [
  [5.5, 35.0],
  [19.5, 48.0],
];

/** Fetch GeoJSON and cache in state. Returns null until loaded. */
function useGeoJson(url: string, enabled: boolean) {
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url, enabled]);
  return data;
}

/** Enrich GeoJSON with CSV data for choropleth rendering. */
function useEnrichedGeoJson(
  geojson: GeoJSON.FeatureCollection | null,
  indicator: IndicatorDef | undefined,
  enabled: boolean,
) {
  const [enriched, setEnriched] = useState<GeoJSON.FeatureCollection | null>(
    null,
  );
  useEffect(() => {
    if (!enabled || !geojson || !indicator) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnriched(null);
      return;
    }
    let cancelled = false;
    enrichGeoJSON(geojson, indicator)
      .then((result) => {
        if (!cancelled) setEnriched(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [geojson, indicator, enabled]);
  return enriched;
}

const NUM_CLASSES = 5;

/** Compute bounding box of a GeoJSON feature. */
function bboxOfFeature(feature: GeoJSON.Feature): LngLatBoundsType | null {
  const bounds = new LngLatBounds();
  function addCoord(c: number[]) {
    bounds.extend([c[0], c[1]]);
  }
  function walk(coords: unknown) {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number") {
      addCoord(coords as number[]);
    } else {
      for (const c of coords) walk(c);
    }
  }
  if (!feature.geometry) return null;
  walk((feature.geometry as GeoJSON.Polygon).coordinates);
  return bounds.isEmpty() ? null : bounds;
}

export default function MapView() {
  const mapRef = useRef<MapRef>(null);

  const datasets = useWorkbenchStore((s) => s.datasets);
  const activeDatasetId = useWorkbenchStore((s) => s.activeDatasetId);
  const boundaries = useWorkbenchStore((s) => s.boundaries);
  const setCenter = useWorkbenchStore((s) => s.setCenter);
  const setZoom = useWorkbenchStore((s) => s.setZoom);
  const selectFeature = useWorkbenchStore((s) => s.selectFeature);
  const setActiveLegend = useWorkbenchStore((s) => s.setActiveLegend);
  const geoScope = useWorkbenchStore((s) => s.geoScope);
  const transitStopsVisible = useWorkbenchStore((s) => s.transitStopsVisible);

  const { center, zoom } = useWorkbenchStore.getState();

  // Boundary lookup
  const regioni = boundaries.find((b) => b.id === "regioni");
  const province = boundaries.find((b) => b.id === "province");
  const comuni = boundaries.find((b) => b.id === "comuni");

  // Active dataset (single dataset rendered at a time)
  const activeDs = useMemo(
    () => datasets.find((d) => d.id === activeDatasetId) ?? null,
    [datasets, activeDatasetId],
  );

  // Resolve indicator def for active dataset
  const activeIndicator = useMemo(
    () =>
      activeDs ? INDICATORS.find((i) => i.id === activeDs.datasetId) : null,
    [activeDs],
  );

  // Determine which boundary GeoJSON we need for the active fill
  const needsComuniBoundary =
    activeIndicator?.scale === "comunale" || !!comuni?.visible;
  const needsProvinceBoundary =
    activeIndicator?.scale === "provinciale" || !!province?.visible;

  // Fetch GeoJSON data
  const regioniData = useGeoJson("/data/boundaries/regioni.geojson", true);
  const provinceData = useGeoJson(
    "/data/boundaries/province.geojson",
    needsProvinceBoundary || true,
  );
  const comuniData = useGeoJson(
    "/data/boundaries/comuni.geojson",
    needsComuniBoundary,
  );

  // Transit stops (Sardinia GTFS)
  const transitStopsData = useGeoJson(
    "/data/transit/all-stops.geojson",
    transitStopsVisible,
  );

  // ── Scope-filtered boundaries (only show features within geoScope) ──
  const scopedRegioniData = useMemo(() => {
    if (!regioniData || !geoScope) return regioniData;
    return filterFeaturesByScope(regioniData, geoScope);
  }, [regioniData, geoScope]);

  const scopedProvinceData = useMemo(() => {
    if (!provinceData || !geoScope) return provinceData;
    return filterFeaturesByScope(provinceData, geoScope);
  }, [provinceData, geoScope]);

  const scopedComuniData = useMemo(() => {
    if (!comuniData || !geoScope) return comuniData;
    return filterFeaturesByScope(comuniData, geoScope);
  }, [comuniData, geoScope]);

  // ── Choropleth: enrich boundaries with CSV data ────────────────
  const enrichedComuni = useEnrichedGeoJson(
    comuniData,
    activeIndicator?.scale === "comunale" ? activeIndicator : undefined,
    activeIndicator?.scale === "comunale",
  );
  const enrichedProvince = useEnrichedGeoJson(
    provinceData,
    activeIndicator?.scale === "provinciale" ? activeIndicator : undefined,
    activeIndicator?.scale === "provinciale",
  );

  // Scope-filter enriched choropleth data too
  const scopedEnrichedComuni = useMemo(() => {
    if (!enrichedComuni || !geoScope) return enrichedComuni;
    return filterFeaturesByScope(enrichedComuni, geoScope);
  }, [enrichedComuni, geoScope]);

  const scopedEnrichedProvince = useMemo(() => {
    if (!enrichedProvince || !geoScope) return enrichedProvince;
    return filterFeaturesByScope(enrichedProvince, geoScope);
  }, [enrichedProvince, geoScope]);

  // ── Compute color expression for active dataset ────────────────
  const fillExpression = useMemo(() => {
    if (!activeDs || !activeIndicator) return null;

    const field = activeDs.activeField;
    const data =
      activeIndicator.scale === "comunale"
        ? scopedEnrichedComuni
        : scopedEnrichedProvince;
    if (!data) return null;

    const values = extractValues(data, field);
    if (values.length === 0) return null;

    const breaks = quantileBreaks(values, NUM_CLASSES);
    const palette = PALETTES[activeDs.palette];
    const expr = buildStepExpression(field, breaks, palette);

    return { expr, breaks, palette };
  }, [activeDs, activeIndicator, scopedEnrichedComuni, scopedEnrichedProvince]);

  // ── Sync legend data into store for sidebar ─────────────────────
  useEffect(() => {
    if (!fillExpression || !activeDs || !activeIndicator) {
      setActiveLegend(null);
      return;
    }
    const fieldDef = activeIndicator.fields.find(
      (f) => f.key === activeDs.activeField,
    );
    setActiveLegend({
      field: activeDs.activeField,
      label: fieldDef?.label ?? activeDs.activeField,
      unit: fieldDef?.unit,
      breaks: fillExpression.breaks,
      palette: fillExpression.palette,
    });
  }, [fillExpression, activeDs, activeIndicator, setActiveLegend]);

  // ── Fly to geoScope bounds ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!geoScope) {
      // Reset to Italy
      map.fitBounds(ITALY_BOUNDS, { padding: 20, duration: 800 });
      return;
    }
    if (geoScope.type === "regione" && regioniData) {
      const feature = regioniData.features.find(
        (f) => Number(f.properties?.COD_REG) === geoScope.code,
      );
      if (feature) {
        const bounds = bboxOfFeature(feature);
        if (bounds) map.fitBounds(bounds, { padding: 40, duration: 800 });
      }
    } else if (geoScope.type === "provincia" && provinceData) {
      const feature = provinceData.features.find(
        (f) => Number(f.properties?.COD_PROV) === geoScope.code,
      );
      if (feature) {
        const bounds = bboxOfFeature(feature);
        if (bounds) map.fitBounds(bounds, { padding: 40, duration: 800 });
      }
    }
  }, [geoScope, regioniData, provinceData]);

  // ── Interactive layer IDs (include fills for click) ────────────
  const interactiveLayerIds = useMemo(() => {
    const ids = [
      "boundaries-regioni",
      "boundaries-province",
      "boundaries-comuni",
    ];
    if (activeDs) {
      ids.push(`fill-active`);
    }
    if (transitStopsVisible) {
      ids.push("transit-stops-circle");
    }
    return ids;
  }, [activeDs, transitStopsVisible]);

  const onMoveEnd = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setCenter([c.lng, c.lat]);
    setZoom(map.getZoom());
  }, [setCenter, setZoom]);

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const f = e.features[0];
        selectFeature(
          f.id?.toString() ?? null,
          f.properties as Record<string, unknown>,
        );
      } else {
        selectFeature(null);
      }
    },
    [selectFeature],
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: center[0], latitude: center[1], zoom }}
      mapStyle={BASEMAP_STYLE}
      style={{ width: "100%", height: "100%" }}
      minZoom={3}
      onMoveEnd={onMoveEnd}
      onClick={onClick}
      interactiveLayerIds={interactiveLayerIds}
      attributionControl={false}
    >
      <NavigationControl position="top-right" />
      <AttributionControl compact position="bottom-right" />

      {/* ── Active dataset choropleth fill ──────────────────────── */}

      {/* Comunale-level fill */}
      {activeDs &&
        activeIndicator?.scale === "comunale" &&
        scopedEnrichedComuni &&
        fillExpression && (
          <Source
            id="fill-src-active"
            type="geojson"
            data={scopedEnrichedComuni}
          >
            <Layer
              id="fill-active"
              type="fill"
              paint={{
                "fill-color": fillExpression.expr as unknown as string,
                "fill-opacity": activeDs.opacity * 0.85,
              }}
            />
            <Layer
              id="fill-outline-active"
              type="line"
              paint={{
                "line-color": "rgba(255,255,255,0.15)",
                "line-width": 0.3,
              }}
              minzoom={8}
            />
          </Source>
        )}

      {/* Provinciale-level fill */}
      {activeDs &&
        activeIndicator?.scale === "provinciale" &&
        scopedEnrichedProvince &&
        fillExpression && (
          <Source
            id="fill-src-active"
            type="geojson"
            data={scopedEnrichedProvince}
          >
            <Layer
              id="fill-active"
              type="fill"
              paint={{
                "fill-color": fillExpression.expr as unknown as string,
                "fill-opacity": activeDs.opacity * 0.85,
              }}
            />
            <Layer
              id="fill-outline-active"
              type="line"
              paint={{
                "line-color": "rgba(255,255,255,0.25)",
                "line-width": 0.5,
              }}
            />
          </Source>
        )}

      {/* ── Boundary line layers (render above fills) ─────────── */}

      {/* Regioni */}
      {scopedRegioniData && (
        <Source id="boundaries-regioni" type="geojson" data={scopedRegioniData}>
          <Layer
            id="boundaries-regioni"
            type="line"
            paint={{
              "line-color": "#00D9A3",
              "line-width": 2,
              "line-opacity": regioni?.opacity ?? 0.7,
            }}
            layout={{ visibility: regioni?.visible ? "visible" : "none" }}
          />
        </Source>
      )}

      {/* Province */}
      {scopedProvinceData && (
        <Source
          id="boundaries-province"
          type="geojson"
          data={scopedProvinceData}
        >
          <Layer
            id="boundaries-province"
            type="line"
            paint={{
              "line-color": "#00D9A3",
              "line-width": 1,
              "line-opacity": province?.opacity ?? 0.4,
            }}
            layout={{ visibility: province?.visible ? "visible" : "none" }}
          />
        </Source>
      )}

      {/* Comuni — only visible at zoom >= 8 when viewing all Italy */}
      {scopedComuniData && (
        <Source id="boundaries-comuni" type="geojson" data={scopedComuniData}>
          <Layer
            id="boundaries-comuni"
            type="line"
            {...(!geoScope ? { minzoom: 8 } : {})}
            paint={{
              "line-color": "#00D9A3",
              "line-width": 0.5,
              "line-opacity": comuni?.opacity ?? 0.25,
            }}
            layout={{ visibility: comuni?.visible ? "visible" : "none" }}
          />
        </Source>
      )}

      {/* ── Transit stops (point layer) ─────────────────────── */}
      {transitStopsVisible && transitStopsData && (
        <Source id="transit-stops" type="geojson" data={transitStopsData}>
          <Layer
            id="transit-stops-circle"
            type="circle"
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                5,
                1.5,
                8,
                3,
                12,
                6,
              ],
              "circle-color": "#00D9A3",
              "circle-opacity": 0.8,
              "circle-stroke-width": 0.5,
              "circle-stroke-color": "rgba(255,255,255,0.3)",
            }}
          />
        </Source>
      )}
    </Map>
  );
}
