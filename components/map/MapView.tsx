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
  INDICATOR_PALETTES,
  PALETTES,
  enrichGeoJSON,
  extractValues,
  quantileBreaks,
  buildStepExpression,
  type IndicatorDef,
} from "@/lib/workbench/choropleth";

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
      setEnriched(null);
      return;
    }
    let cancelled = false;
    enrichGeoJSON(geojson, indicator).then((result) => {
      if (!cancelled) setEnriched(result);
    });
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

  const layers = useWorkbenchStore((s) => s.layers);
  const setCenter = useWorkbenchStore((s) => s.setCenter);
  const setZoom = useWorkbenchStore((s) => s.setZoom);
  const selectFeature = useWorkbenchStore((s) => s.selectFeature);
  const setActiveLegend = useWorkbenchStore((s) => s.setActiveLegend);
  const geoScope = useWorkbenchStore((s) => s.geoScope);

  const { center, zoom } = useWorkbenchStore.getState();

  /** Lookup store layer config by id. */
  const layerMap = useMemo(() => {
    const m: Record<string, (typeof layers)[number]> = {};
    for (const l of layers) m[l.id] = l;
    return m;
  }, [layers]);

  const regioni = layerMap["boundaries-regioni"];
  const province = layerMap["boundaries-province"];
  const comuni = layerMap["boundaries-comuni"];
  const gtfsStops = layerMap["gtfs-stops"];

  // ── Which fill layers are active? ──────────────────────────────
  const activeFillLayers = useMemo(
    () => layers.filter((l) => l.type === "fill" && l.visible),
    [layers],
  );

  // Determine which boundary levels we need for active fills
  const needsComuniBoundary = activeFillLayers.some((l) => {
    const ind = INDICATORS.find((i) => i.id === l.id);
    return ind?.scale === "comunale";
  });
  const needsProvinceBoundary = activeFillLayers.some((l) => {
    const ind = INDICATORS.find((i) => i.id === l.id);
    return ind?.scale === "provinciale";
  });

  // Fetch GeoJSON data — always for line layers, conditionally for fills
  const regioniData = useGeoJson("/data/boundaries/regioni.geojson", true);
  const provinceData = useGeoJson("/data/boundaries/province.geojson", true);
  const comuniData = useGeoJson(
    "/data/boundaries/comuni.geojson",
    !!(comuni?.visible || needsComuniBoundary),
  );
  const gtfsData = useGeoJson(
    "/data/transit/all-stops.geojson",
    !!gtfsStops?.visible,
  );

  // ── Choropleth: enrich boundaries with CSV data ────────────────
  // Find the first active comunale and provinciale indicators
  const activeComunaleInd = useMemo(
    () =>
      INDICATORS.find(
        (ind) =>
          ind.scale === "comunale" &&
          activeFillLayers.some((l) => l.id === ind.id),
      ),
    [activeFillLayers],
  );
  const activeProvincialeInd = useMemo(
    () =>
      INDICATORS.find(
        (ind) =>
          ind.scale === "provinciale" &&
          activeFillLayers.some((l) => l.id === ind.id),
      ),
    [activeFillLayers],
  );

  const enrichedComuni = useEnrichedGeoJson(
    comuniData,
    activeComunaleInd,
    !!activeComunaleInd,
  );
  const enrichedProvince = useEnrichedGeoJson(
    provinceData,
    activeProvincialeInd,
    !!activeProvincialeInd,
  );

  // ── Compute color expressions for each active fill layer ───────
  const fillExpressions = useMemo(() => {
    const result: Record<
      string,
      { expr: unknown[]; breaks: number[]; palette: readonly string[] }
    > = {};

    for (const layer of activeFillLayers) {
      const ind = INDICATORS.find((i) => i.id === layer.id);
      if (!ind) continue;

      const field = layer.choropleth?.field ?? ind.defaultField;
      const data = ind.scale === "comunale" ? enrichedComuni : enrichedProvince;
      if (!data) continue;

      const values = extractValues(data, field);
      if (values.length === 0) continue;

      const breaks = quantileBreaks(values, NUM_CLASSES);
      const palKey = INDICATOR_PALETTES[ind.id] ?? "teal";
      const palette = PALETTES[palKey];
      const expr = buildStepExpression(field, breaks, palette);

      result[layer.id] = { expr, breaks, palette };
    }

    return result;
  }, [activeFillLayers, enrichedComuni, enrichedProvince]);

  // ── Sync legend data into store for sidebar ─────────────────────
  useEffect(() => {
    // Find the first active fill with expressions
    const firstActive = activeFillLayers[0];
    if (!firstActive) {
      setActiveLegend(null);
      return;
    }
    const expr = fillExpressions[firstActive.id];
    const ind = INDICATORS.find((i) => i.id === firstActive.id);
    if (!expr || !ind) {
      setActiveLegend(null);
      return;
    }
    const field = firstActive.choropleth?.field ?? ind.defaultField;
    const fieldDef = ind.fields.find((f) => f.key === field);
    setActiveLegend({
      field,
      label: fieldDef?.label ?? field,
      unit: fieldDef?.unit,
      breaks: expr.breaks,
      palette: expr.palette,
    });
  }, [fillExpressions, activeFillLayers, setActiveLegend]);

  // ── Fly to geoScope region bounds ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!geoScope) {
      // Reset to Italy
      map.fitBounds(ITALY_BOUNDS, { padding: 20, duration: 800 });
      return;
    }
    // Find the region in regioni GeoJSON and compute its bbox
    if (geoScope.type === "regione" && regioniData) {
      const feature = regioniData.features.find(
        (f) => Number(f.properties?.COD_REG) === geoScope.code,
      );
      if (feature) {
        const bounds = bboxOfFeature(feature);
        if (bounds) map.fitBounds(bounds, { padding: 40, duration: 800 });
      }
    }
  }, [geoScope, regioniData]);

  // ── Interactive layer IDs (include fills for click) ────────────
  const interactiveLayerIds = useMemo(() => {
    const ids = [
      "boundaries-regioni",
      "boundaries-province",
      "boundaries-comuni",
      "gtfs-stops",
    ];
    for (const l of activeFillLayers) {
      ids.push(`fill-${l.id}`);
    }
    return ids;
  }, [activeFillLayers]);

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
      maxBounds={ITALY_BOUNDS}
      onMoveEnd={onMoveEnd}
      onClick={onClick}
      interactiveLayerIds={interactiveLayerIds}
      attributionControl={false}
    >
      <NavigationControl position="top-right" />
      <AttributionControl compact position="bottom-right" />

      {/* ── Choropleth fill layers (render below lines) ─────────── */}

      {/* Comunale-level fills (enriched comuni boundaries) */}
      {enrichedComuni &&
        activeFillLayers
          .filter((l) => {
            const ind = INDICATORS.find((i) => i.id === l.id);
            return ind?.scale === "comunale";
          })
          .map((layer) => {
            const expr = fillExpressions[layer.id];
            if (!expr) return null;
            return (
              <Source
                key={`fill-src-${layer.id}`}
                id={`fill-src-${layer.id}`}
                type="geojson"
                data={enrichedComuni}
              >
                <Layer
                  id={`fill-${layer.id}`}
                  type="fill"
                  paint={{
                    "fill-color": expr.expr as unknown as string,
                    "fill-opacity": layer.opacity * 0.85,
                  }}
                />
                <Layer
                  id={`fill-outline-${layer.id}`}
                  type="line"
                  paint={{
                    "line-color": "rgba(255,255,255,0.15)",
                    "line-width": 0.3,
                  }}
                  minzoom={8}
                />
              </Source>
            );
          })}

      {/* Provinciale-level fills (enriched province boundaries) */}
      {enrichedProvince &&
        activeFillLayers
          .filter((l) => {
            const ind = INDICATORS.find((i) => i.id === l.id);
            return ind?.scale === "provinciale";
          })
          .map((layer) => {
            const expr = fillExpressions[layer.id];
            if (!expr) return null;
            return (
              <Source
                key={`fill-src-${layer.id}`}
                id={`fill-src-${layer.id}`}
                type="geojson"
                data={enrichedProvince}
              >
                <Layer
                  id={`fill-${layer.id}`}
                  type="fill"
                  paint={{
                    "fill-color": expr.expr as unknown as string,
                    "fill-opacity": layer.opacity * 0.85,
                  }}
                />
                <Layer
                  id={`fill-outline-${layer.id}`}
                  type="line"
                  paint={{
                    "line-color": "rgba(255,255,255,0.25)",
                    "line-width": 0.5,
                  }}
                />
              </Source>
            );
          })}

      {/* ── Boundary line layers (render above fills) ─────────── */}

      {/* Regioni */}
      {regioniData && (
        <Source id="boundaries-regioni" type="geojson" data={regioniData}>
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
      {provinceData && (
        <Source id="boundaries-province" type="geojson" data={provinceData}>
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

      {/* Comuni — only visible at zoom >= 8 */}
      {comuniData && (
        <Source id="boundaries-comuni" type="geojson" data={comuniData}>
          <Layer
            id="boundaries-comuni"
            type="line"
            minzoom={8}
            paint={{
              "line-color": "#00D9A3",
              "line-width": 0.5,
              "line-opacity": comuni?.opacity ?? 0.25,
            }}
            layout={{ visibility: comuni?.visible ? "visible" : "none" }}
          />
        </Source>
      )}

      {/* GTFS stops — all Sardinia operators combined */}
      {gtfsData && (
        <Source id="gtfs-stops" type="geojson" data={gtfsData}>
          <Layer
            id="gtfs-stops"
            type="circle"
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                6,
                1.5,
                10,
                3,
                14,
                6,
              ],
              "circle-color": "#F59E0B",
              "circle-opacity": gtfsStops?.opacity ?? 0.9,
              "circle-stroke-width": 0.5,
              "circle-stroke-color": "#92400E",
            }}
            layout={{ visibility: gtfsStops?.visible ? "visible" : "none" }}
          />
        </Source>
      )}
    </Map>
  );
}
