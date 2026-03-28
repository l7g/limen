"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

interface DataPreviewProps {
  /** URL to a GeoJSON or CSV file in /public/data/ */
  dataUrl: string;
  format: string;
  /** Max rows to display */
  maxRows?: number;
}

type Row = Record<string, unknown>;

export default function DataPreview({
  dataUrl,
  format,
  maxRows = 10,
}: DataPreviewProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(dataUrl);
        if (res.status === 404) {
          if (!cancelled)
            setError(
              "Dati non ancora disponibili. Questo dataset sarà aggiunto prossimamente.",
            );
          return;
        }
        if (!res.ok) throw new Error(`Errore di caricamento (${res.status})`);

        if (format === "geojson" || format === "gtfs") {
          const geojson = await res.json();
          const features = geojson.features ?? [];
          setTotalCount(features.length);

          const sample = features
            .slice(0, maxRows)
            .map(
              (f: { properties: Record<string, unknown> }) =>
                f.properties ?? {},
            );
          if (sample.length > 0) {
            setColumns(Object.keys(sample[0]));
          }
          if (!cancelled) setRows(sample);
        } else if (format === "csv") {
          const text = await res.text();
          const result = Papa.parse<Row>(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            preview: maxRows,
          });
          if (!cancelled) {
            const previewRows = result.data;
            // preview option limits parsing — estimate total from line count
            const lineCount = text.split("\n").length - 1;
            setTotalCount(lineCount);
            if (previewRows.length > 0) {
              setColumns(Object.keys(previewRows[0]));
            }
            setRows(previewRows);
          }
        } else {
          if (!cancelled)
            setError("Anteprima non disponibile per questo formato.");
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [dataUrl, format, maxRows]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-6 text-center text-[13px] text-gray-400">
        Caricamento anteprima…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-6 text-center text-[13px] text-gray-400">
        {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-6 text-center text-[13px] text-gray-400">
        Nessun dato disponibile.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 hover:bg-gray-50/50"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                  >
                    {String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-400">
        Prime {rows.length} righe di {totalCount.toLocaleString("it-IT")} totali
      </div>
    </div>
  );
}
