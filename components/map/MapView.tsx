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
import type { LngLatBoundsLike } from "maplibre-gl";
import { useWorkbenchStore } from "@/lib/store";

/** Free CARTO Dark Matter — no API key, dark theme for workbench. */
const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Bounding box: SW corner to NE corner covering Italy + padding. */
const ITALY_BOUNDS: LngLatBoundsLike = [
  [5.5, 35.0],
  [19.5, 48.0],
];

/** Layer IDs that support click-to-inspect. */
const INTERACTIVE_LAYER_IDS = [
  "boundaries-regioni",
  "boundaries-province",
  "boundaries-comuni",
  "gtfs-stops",
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

export default function MapView() {
  const mapRef = useRef<MapRef>(null);

  const layers = useWorkbenchStore((s) => s.layers);
  const setCenter = useWorkbenchStore((s) => s.setCenter);
  const setZoom = useWorkbenchStore((s) => s.setZoom);
  const selectFeature = useWorkbenchStore((s) => s.selectFeature);

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

  // Fetch GeoJSON data as objects — more reliable than passing URLs to Source
  const regioniData = useGeoJson("/data/boundaries/regioni.geojson", true);
  const provinceData = useGeoJson("/data/boundaries/province.geojson", true);
  const comuniData = useGeoJson("/data/boundaries/comuni.geojson", true);
  const gtfsData = useGeoJson(
    "/data/transit/all-stops.geojson",
    !!gtfsStops?.visible,
  );

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
      interactiveLayerIds={INTERACTIVE_LAYER_IDS}
      attributionControl={false}
    >
      <NavigationControl position="top-right" />
      <AttributionControl compact position="bottom-right" />

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
