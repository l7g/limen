"use client";

import dynamic from "next/dynamic";
import { Map, Table2 } from "lucide-react";

const MapPreview = dynamic(() => import("@/components/data/MapPreview"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-[13px] text-gray-400">
      Caricamento mappa…
    </div>
  ),
});
const DataPreview = dynamic(() => import("@/components/data/DataPreview"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-6 text-center text-[13px] text-gray-400">
      Caricamento anteprima…
    </div>
  ),
});

interface Props {
  dataUrl: string;
  format: string;
  geometryType?: "point" | "line" | "polygon" | "none";
}

export default function DatasetPreviews({
  dataUrl,
  format,
  geometryType,
}: Props) {
  const showMap =
    geometryType &&
    geometryType !== "none" &&
    (format === "geojson" || format === "gtfs") &&
    dataUrl;

  return (
    <>
      {showMap && (
        <div className="mt-8">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
            <Map className="h-4 w-4" /> Anteprima Mappa
          </h2>
          <MapPreview dataUrl={dataUrl} geometryType={geometryType} />
        </div>
      )}

      {dataUrl && (
        <div className="mt-8">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
            <Table2 className="h-4 w-4" /> Anteprima Dati
          </h2>
          <DataPreview dataUrl={dataUrl} format={format} />
        </div>
      )}
    </>
  );
}
