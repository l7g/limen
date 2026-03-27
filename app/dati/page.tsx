"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Users,
  Train,
  Car,
  Coins,
  Leaf,
  Building2,
  TrendingUp,
} from "lucide-react";
import { datasets } from "@/lib/datasets/catalog";
import { computeStatus } from "@/lib/datasets/freshness";
import type { DatasetStatus, DatasetCategory } from "@/lib/datasets/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FreshnessBadge from "@/components/data/FreshnessBadge";

/** Human-readable category metadata — order defines display order. */
const CATEGORIES: {
  id: DatasetCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "confini",
    label: "Confini Amministrativi",
    description: "Regioni, province, comuni — le basi geografiche",
    icon: MapPin,
  },
  {
    id: "demografia",
    label: "Demografia",
    description: "Popolazione, pendolarismo, struttura demografica",
    icon: Users,
  },
  {
    id: "trasporti",
    label: "Trasporto Pubblico",
    description: "Feed GTFS di bus, treni e servizi urbani",
    icon: Train,
  },
  {
    id: "veicoli",
    label: "Parco Veicolare",
    description: "Flotta veicolare per provincia, classe Euro e alimentazione",
    icon: Car,
  },
  {
    id: "economia",
    label: "Economia",
    description: "Redditi, dichiarazioni fiscali per comune",
    icon: Coins,
  },
  {
    id: "ambiente",
    label: "Ambiente",
    description: "Emissioni, fattori di impatto ambientale",
    icon: Leaf,
  },
  {
    id: "servizi",
    label: "Servizi Pubblici",
    description: "Scuole, sanità, infrastrutture di servizio",
    icon: Building2,
  },
  {
    id: "indicatori",
    label: "Indicatori Derivati",
    description: "Indici calcolati incrociando dataset di base",
    icon: TrendingUp,
  },
];

const coverageLabels = {
  italy: "Italia",
  sardinia: "Sardegna",
  custom: "Custom",
} as const;

const enriched = datasets.map((d) => ({
  ...d,
  computedStatus: computeStatus(d) as DatasetStatus,
}));

export default function DatiPage() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DatasetCategory | null>(
    null,
  );
  const [coverageFilter, setCoverageFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = enriched;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.source.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q),
      );
    }
    if (categoryFilter)
      result = result.filter((d) => d.category === categoryFilter);
    if (coverageFilter)
      result = result.filter((d) => d.coverage === coverageFilter);
    return result;
  }, [query, categoryFilter, coverageFilter]);

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 md:py-14">
        <div className="max-w-2xl">
          <p className="text-[13px] font-medium tracking-wide uppercase text-[#00D9A3]">
            Catalogo
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gray-900">
            Dati pubblici italiani
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-gray-500">
            {enriched.length} dataset da{" "}
            {new Set(enriched.map((d) => d.source)).size} fonti ufficiali. Ogni
            dataset mostra la sua reale copertura geografica e freschezza.
            Esplora, scarica o apri nel workbench.
          </p>
        </div>

        {/* Search + filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca dataset, fonte, tema..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-[#00D9A3] focus:outline-none focus:ring-1 focus:ring-[#00D9A3]"
            />
          </div>
          <div className="flex gap-2">
            {([null, "italy", "sardinia"] as const).map((c) => (
              <button
                key={c ?? "all"}
                type="button"
                onClick={() => setCoverageFilter(c)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  coverageFilter === c
                    ? "bg-[#00D9A3] text-gray-900"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c === null ? "Tutte" : c === "italy" ? "Italia" : "Sardegna"}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              categoryFilter === null
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tutti i temi
          </button>
          {CATEGORIES.map((cat) => {
            const count = filtered.filter((d) => d.category === cat.id).length;
            if (count === 0 && categoryFilter !== cat.id) return null;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setCategoryFilter(categoryFilter === cat.id ? null : cat.id)
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  categoryFilter === cat.id
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Results count */}
        {(query || categoryFilter || coverageFilter) && (
          <p className="mt-4 text-[12px] text-gray-400">
            {filtered.length} di {enriched.length} dataset
          </p>
        )}

        {/* Grouped by category */}
        {CATEGORIES.map((cat) => {
          const catDatasets = filtered.filter((d) => d.category === cat.id);
          if (catDatasets.length === 0) return null;
          const Icon = cat.icon;

          return (
            <section key={cat.id} className="mt-10">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100">
                  <Icon className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div>
                  <h2 className="font-heading text-[15px] font-semibold text-gray-900">
                    {cat.label}
                  </h2>
                  <p className="text-[11px] text-gray-400">{cat.description}</p>
                </div>
              </div>

              <div className="grid gap-3">
                {catDatasets.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dati/${d.id}`}
                    className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-medium text-gray-900 group-hover:text-[#00D9A3] transition-colors">
                          {d.name}
                        </p>
                        <FreshnessBadge status={d.computedStatus} />
                      </div>
                      <p className="mt-1 text-[12px] text-gray-500">
                        {d.source} · {coverageLabels[d.coverage]} ·{" "}
                        <span className="uppercase">{d.format}</span>
                      </p>
                    </div>
                    <span className="ml-4 text-[12px] text-gray-400 group-hover:text-gray-600 transition-colors">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {filtered.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-[14px] text-gray-400">
              Nessun dataset trovato per questa ricerca.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
