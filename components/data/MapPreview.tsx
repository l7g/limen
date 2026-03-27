"use client";

import { Map, Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

interface MapPreviewProps {
  /** URL to a GeoJSON file in /public/data/ */
  dataUrl: string;
  geometryType: "point" | "line" | "polygon";
}

export default function MapPreview({ dataUrl, geometryType }: MapPreviewProps) {
  const layerType =
    geometryType === "polygon"
      ? "fill"
      : geometryType === "line"
        ? "line"
        : "circle";

  return (
    <div className="h-64 w-full overflow-hidden rounded-lg border border-gray-200">
      <Map
        initialViewState={{ longitude: 12.5, latitude: 41.9, zoom: 4.8 }}
        mapStyle={BASEMAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        interactive={false}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Source id="preview" type="geojson" data={dataUrl}>
          {layerType === "fill" && (
            <Layer
              id="preview-fill"
              type="fill"
              paint={{
                "fill-color": "#00D9A3",
                "fill-opacity": 0.3,
              }}
            />
          )}
          {layerType === "fill" && (
            <Layer
              id="preview-fill-outline"
              type="line"
              paint={{
                "line-color": "#00D9A3",
                "line-width": 1,
              }}
            />
          )}
          {layerType === "line" && (
            <Layer
              id="preview-line"
              type="line"
              paint={{
                "line-color": "#00D9A3",
                "line-width": 1.5,
              }}
            />
          )}
          {layerType === "circle" && (
            <Layer
              id="preview-circle"
              type="circle"
              paint={{
                "circle-radius": 3,
                "circle-color": "#00D9A3",
                "circle-opacity": 0.8,
              }}
            />
          )}
        </Source>
      </Map>
    </div>
  );
}
