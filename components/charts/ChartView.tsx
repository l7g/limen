"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useWorkbenchStore } from "@/lib/store";
import {
  INDICATORS,
  PALETTES,
  type IndicatorDef,
} from "@/lib/workbench/choropleth";
import { rowMatchesScope } from "@/lib/workbench/geo-scope";
import type { GeoScope } from "@/lib/datasets/types";
import Papa from "papaparse";
import { BarChart3 } from "lucide-react";

/** Parsed row from CSV. */
interface DataRow {
  name: string;
  value: number;
}

/** Load CSV and extract name + value columns, optionally filtered by geoScope. */
function useCsvData(
  indicator: IndicatorDef | undefined,
  field: string,
  geoScope: GeoScope | null,
) {
  const [data, setData] = useState<DataRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!indicator) return;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    setError(null);
    let cancelled = false;

    fetch(`/data/${indicator.csv}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        const { data: rows } = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
        });

        // Find a "name" column — comune, provincia, or first string column
        const nameCol =
          Object.keys(rows[0] ?? {}).find((k) =>
            ["comune", "provincia", "COMUNE", "DEN_PROV"].includes(k),
          ) ?? Object.keys(rows[0] ?? {})[1];

        setTotalCount(rows.length);

        const parsed: DataRow[] = [];
        for (const row of rows) {
          // Apply geographic filter
          if (geoScope && !rowMatchesScope(row, geoScope, indicator.joinKey)) {
            continue;
          }
          const v = parseFloat(row[field]);
          if (isNaN(v)) continue;
          parsed.push({ name: row[nameCol] ?? "?", value: v });
        }
        setData(parsed);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [indicator, field, geoScope]);

  return { data, totalCount, loading, error };
}

export default function ChartView() {
  const datasets = useWorkbenchStore((s) => s.datasets);
  const activeDatasetId = useWorkbenchStore((s) => s.activeDatasetId);
  const chartType = useWorkbenchStore((s) => s.chartType);
  const setChartType = useWorkbenchStore((s) => s.setChartType);
  const geoScope = useWorkbenchStore((s) => s.geoScope);

  // Find active dataset + its indicator
  const activeDs = datasets.find((d) => d.id === activeDatasetId) ?? null;
  const indicator = activeDs
    ? INDICATORS.find((i) => i.id === activeDs.datasetId)
    : undefined;
  const activeField = activeDs?.activeField ?? indicator?.defaultField ?? "";

  const fieldDef = indicator?.fields.find((f) => f.key === activeField);
  const palette = activeDs ? PALETTES[activeDs.palette] : PALETTES.teal;

  const { data, totalCount, loading, error } = useCsvData(
    indicator,
    activeField,
    geoScope,
  );

  // Sort for ranking (top 50)
  const rankingData = useMemo(() => {
    if (chartType !== "ranking") return [];
    return [...data].sort((a, b) => b.value - a.value).slice(0, 50);
  }, [data, chartType]);

  // Histogram bins
  const histogramData = useMemo(() => {
    if (chartType !== "histogram" || data.length === 0) return [];
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const nBins = 20;
    const binWidth = (max - min) / nBins || 1;

    const bins: { range: string; count: number; midValue: number }[] = [];
    for (let i = 0; i < nBins; i++) {
      const lo = min + i * binWidth;
      const hi = lo + binWidth;
      bins.push({
        range: `${Math.round(lo)}–${Math.round(hi)}`,
        count: 0,
        midValue: (lo + hi) / 2,
      });
    }
    for (const v of values) {
      const idx = Math.min(Math.floor((v - min) / binWidth), nBins - 1);
      bins[idx].count++;
    }
    return bins;
  }, [data, chartType]);

  if (!activeDs || !indicator) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        <div className="text-center space-y-2">
          <BarChart3 className="h-8 w-8 mx-auto text-zinc-600" />
          <p className="text-sm">
            Aggiungi un dataset per visualizzare i grafici.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        Caricamento dati…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-400">
            Errore nel caricamento dei dati
          </p>
          <p className="text-xs text-zinc-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 gap-4">
      {/* Chart type toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">
            {fieldDef?.label ?? activeField}
          </h2>
          <p className="text-[11px] text-zinc-500">
            {geoScope ? (
              <span className="text-[#00D9A3] font-medium">
                {geoScope.name}
              </span>
            ) : (
              <span>Italia</span>
            )}
            {" · "}
            {indicator.label} · {data.length.toLocaleString("it-IT")}
            {geoScope && totalCount > data.length
              ? ` / ${totalCount.toLocaleString("it-IT")}`
              : ""}
            {" elementi"}
            {fieldDef?.unit ? ` · ${fieldDef.unit}` : ""}
          </p>
        </div>
        <div className="flex rounded-md bg-zinc-800 p-0.5">
          <button
            type="button"
            onClick={() => setChartType("ranking")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
              chartType === "ranking"
                ? "bg-zinc-700 text-[#00D9A3]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Top 50
          </button>
          <button
            type="button"
            onClick={() => setChartType("histogram")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
              chartType === "histogram"
                ? "bg-zinc-700 text-[#00D9A3]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Distribuzione
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {chartType === "ranking" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rankingData}
              layout="vertical"
              margin={{ left: 10, right: 20, top: 5, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickFormatter={(v: number) => v.toLocaleString("it-IT")}
                label={{
                  value: fieldDef?.unit ?? fieldDef?.label ?? activeField,
                  position: "insideBottom",
                  offset: -10,
                  fill: "#71717a",
                  fontSize: 11,
                }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: "#e4e4e7" }}
                formatter={(v) => [
                  Number(v).toLocaleString("it-IT"),
                  fieldDef?.label ?? activeField,
                ]}
              />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {rankingData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      palette[Math.min(Math.floor(i / 10), palette.length - 1)]
                    }
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={histogramData}
              margin={{ left: 10, right: 20, top: 5, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                horizontal
              />
              <XAxis
                dataKey="range"
                tick={{ fill: "#71717a", fontSize: 9 }}
                interval={Math.max(0, Math.floor(histogramData.length / 8) - 1)}
                label={{
                  value: fieldDef?.label ?? activeField,
                  position: "insideBottom",
                  offset: -10,
                  fill: "#71717a",
                  fontSize: 11,
                }}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickFormatter={(v: number) => v.toLocaleString("it-IT")}
                label={{
                  value: "Comuni",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  fill: "#71717a",
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: "#e4e4e7" }}
                formatter={(v) => [Number(v).toLocaleString("it-IT"), "Comuni"]}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {histogramData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      palette[
                        Math.min(
                          Math.floor(
                            (i / histogramData.length) * palette.length,
                          ),
                          palette.length - 1,
                        )
                      ]
                    }
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
