"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  Check,
  ChevronRight,
} from "lucide-react";
import { datasets, getGroupMembers } from "@/lib/datasets/catalog";
import { computeStatus } from "@/lib/datasets/freshness";
import type {
  DatasetStatus,
  DatasetCategory,
  DatasetMeta,
} from "@/lib/datasets/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FreshnessBadge from "@/components/data/FreshnessBadge";
import SelectionPanel from "@/components/data/SelectionPanel";

/* ── Category metadata ── */
const CATEGORIES: {
  id: DatasetCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: { pill: string; pillActive: string };
}[] = [
  {
    id: "confini",
    label: "Confini",
    icon: MapPin,
    color: {
      pill: "bg-teal-50 text-teal-700",
      pillActive: "bg-teal-600 text-white",
    },
  },
  {
    id: "demografia",
    label: "Demografia",
    icon: Users,
    color: {
      pill: "bg-blue-50 text-blue-700",
      pillActive: "bg-blue-600 text-white",
    },
  },
  {
    id: "trasporti",
    label: "Trasporti",
    icon: Train,
    color: {
      pill: "bg-emerald-50 text-emerald-700",
      pillActive: "bg-emerald-600 text-white",
    },
  },
  {
    id: "veicoli",
    label: "Veicoli",
    icon: Car,
    color: {
      pill: "bg-amber-50 text-amber-700",
      pillActive: "bg-amber-600 text-white",
    },
  },
  {
    id: "economia",
    label: "Economia",
    icon: Coins,
    color: {
      pill: "bg-violet-50 text-violet-700",
      pillActive: "bg-violet-600 text-white",
    },
  },
  {
    id: "ambiente",
    label: "Ambiente",
    icon: Leaf,
    color: {
      pill: "bg-rose-50 text-rose-700",
      pillActive: "bg-rose-600 text-white",
    },
  },
  {
    id: "servizi",
    label: "Servizi",
    icon: Building2,
    color: {
      pill: "bg-indigo-50 text-indigo-700",
      pillActive: "bg-indigo-600 text-white",
    },
  },
  {
    id: "indicatori",
    label: "Indicatori",
    icon: TrendingUp,
    color: {
      pill: "bg-pink-50 text-pink-700",
      pillActive: "bg-pink-600 text-white",
    },
  },
];

const CATEGORY_BADGE: Record<DatasetCategory, string> = {
  confini: "bg-teal-50 text-teal-700",
  demografia: "bg-blue-50 text-blue-700",
  trasporti: "bg-emerald-50 text-emerald-700",
  veicoli: "bg-amber-50 text-amber-700",
  economia: "bg-violet-50 text-violet-700",
  ambiente: "bg-rose-50 text-rose-700",
  servizi: "bg-indigo-50 text-indigo-700",
  indicatori: "bg-pink-50 text-pink-700",
};

const CATEGORY_LABEL: Record<DatasetCategory, string> = {
  confini: "Confini",
  demografia: "Demografia",
  trasporti: "Trasporti",
  veicoli: "Veicoli",
  economia: "Economia",
  ambiente: "Ambiente",
  servizi: "Servizi",
  indicatori: "Indicatori",
};

const FORMAT_BADGE: Record<string, string> = {
  geojson: "bg-emerald-50 text-emerald-600",
  csv: "bg-sky-50 text-sky-600",
  gtfs: "bg-amber-50 text-amber-600",
  json: "bg-gray-100 text-gray-600",
  pbf: "bg-gray-100 text-gray-600",
  raster: "bg-gray-100 text-gray-600",
};

type EnrichedDataset = DatasetMeta & { computedStatus: DatasetStatus };

const enriched: EnrichedDataset[] = datasets.map((d) => ({
  ...d,
  computedStatus: computeStatus(d) as DatasetStatus,
}));

/** A display row: either a standalone dataset or a collapsible group header. */
interface DisplayRow {
  /** Representative dataset (the one with groupLabel, or the standalone dataset). */
  dataset: EnrichedDataset;
  /** If this is a group header, the group key and member IDs. */
  group?: { key: string; label: string; memberIds: string[] };
}

/** Build display rows: one per standalone dataset, one per group. */
function buildDisplayRows(items: EnrichedDataset[]): DisplayRow[] {
  const seenGroups = new Set<string>();
  const rows: DisplayRow[] = [];

  for (const d of items) {
    if (!d.group) {
      rows.push({ dataset: d });
    } else if (!seenGroups.has(d.group)) {
      seenGroups.add(d.group);
      const members = getGroupMembers(d.group);
      const memberIds = members.map((m) => m.id);
      // Use the member with groupLabel as the representative
      const repr =
        enriched.find((e) => e.group === d.group && e.groupLabel) ?? d;
      const label = repr.groupLabel ?? repr.name;
      rows.push({
        dataset: repr,
        group: { key: d.group, label, memberIds },
      });
    }
  }

  return rows;
}

/* ── Reusable data row renderer (shared by catalog + future admin) ── */

function DatasetRow({
  d,
  isSelected,
  onToggleSelect,
  indent,
}: {
  d: EnrichedDataset;
  isSelected: boolean;
  onToggleSelect: () => void;
  indent?: boolean;
}) {
  return (
    <tr
      className={`group border-b border-gray-100 transition-colors last:border-b-0 ${
        isSelected ? "bg-[#00D9A3]/5" : "hover:bg-gray-50/60"
      }`}
    >
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={onToggleSelect}
          className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
            isSelected
              ? "border-[#00D9A3] bg-[#00D9A3]"
              : "border-gray-300 bg-white hover:border-gray-400"
          } ${indent ? "ml-4" : ""}`}
          aria-label={`Seleziona ${d.name}`}
        >
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </button>
      </td>
      <td className="px-3 py-3">
        <Link href={`/dati/${d.id}`} className="block min-w-0">
          <p
            className={`truncate text-[13px] font-medium text-gray-900 transition-colors group-hover:text-[#00D9A3] ${indent ? "pl-4" : ""}`}
          >
            {d.name}
          </p>
          <p
            className={`mt-0.5 text-[11px] text-gray-400 ${indent ? "pl-4" : ""}`}
          >
            {d.source}
          </p>
        </Link>
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[d.category]}`}
        >
          {CATEGORY_LABEL[d.category]}
        </span>
      </td>
      <td className="hidden px-3 py-3 sm:table-cell">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            d.coverage === "italy"
              ? "bg-blue-50 text-blue-600"
              : "bg-teal-50 text-teal-600"
          }`}
        >
          {d.coverage === "italy"
            ? "Italia"
            : d.coverage === "sardinia"
              ? "Sardegna"
              : "Custom"}
        </span>
      </td>
      <td className="hidden px-3 py-3 lg:table-cell">
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${FORMAT_BADGE[d.format] ?? "bg-gray-100 text-gray-600"}`}
        >
          {d.format}
        </span>
      </td>
      <td className="px-3 py-3">
        <FreshnessBadge status={d.computedStatus} />
      </td>
      <td className="px-3 py-3">
        <Link
          href={`/dati/${d.id}`}
          className="text-[12px] text-gray-400 transition-colors group-hover:text-gray-600"
          aria-label={`Dettaglio ${d.name}`}
        >
          →
        </Link>
      </td>
    </tr>
  );
}

function GroupRows({
  representative,
  isGroup,
  groupLabel,
  memberCount,
  isExpanded,
  allSelected,
  someSelected,
  children,
  selectedIds,
  onToggleExpand,
  onToggleSelect,
  onToggleChildSelect,
}: {
  representative: EnrichedDataset;
  isGroup: boolean;
  groupLabel?: string;
  memberCount: number;
  isExpanded: boolean;
  allSelected: boolean;
  someSelected: boolean;
  children: EnrichedDataset[];
  selectedIds: Set<string>;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onToggleChildSelect: (id: string) => void;
}) {
  if (!isGroup) {
    return (
      <DatasetRow
        d={representative}
        isSelected={selectedIds.has(representative.id)}
        onToggleSelect={onToggleSelect}
      />
    );
  }

  return (
    <>
      {/* Group header row */}
      <tr
        className={`group border-b border-gray-100 transition-colors ${
          allSelected
            ? "bg-[#00D9A3]/5"
            : someSelected
              ? "bg-[#00D9A3]/[0.02]"
              : "hover:bg-gray-50/60"
        }`}
      >
        <td className="px-3 py-3">
          <button
            type="button"
            onClick={onToggleSelect}
            className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
              allSelected
                ? "border-[#00D9A3] bg-[#00D9A3]"
                : someSelected
                  ? "border-[#00D9A3] bg-[#00D9A3]/40"
                  : "border-gray-300 bg-white hover:border-gray-400"
            }`}
            aria-label={`Seleziona ${groupLabel}`}
          >
            {allSelected && <Check className="h-3 w-3 text-white" />}
          </button>
        </td>
        <td className="px-3 py-3">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 min-w-0"
          >
            <ChevronRight
              className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
            <div className="min-w-0 text-left">
              <p className="truncate text-[13px] font-semibold text-gray-900 transition-colors group-hover:text-[#00D9A3]">
                {groupLabel}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {memberCount} dataset · {representative.source}
              </p>
            </div>
          </button>
        </td>
        <td className="hidden px-3 py-3 md:table-cell">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[representative.category]}`}
          >
            {CATEGORY_LABEL[representative.category]}
          </span>
        </td>
        <td className="hidden px-3 py-3 sm:table-cell">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              representative.coverage === "italy"
                ? "bg-blue-50 text-blue-600"
                : "bg-teal-50 text-teal-600"
            }`}
          >
            {representative.coverage === "italy"
              ? "Italia"
              : representative.coverage === "sardinia"
                ? "Sardegna"
                : "Custom"}
          </span>
        </td>
        <td className="hidden px-3 py-3 lg:table-cell">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${FORMAT_BADGE[representative.format] ?? "bg-gray-100 text-gray-600"}`}
          >
            {representative.format}
          </span>
        </td>
        <td className="px-3 py-3">
          <FreshnessBadge status={representative.computedStatus} />
        </td>
        <td className="px-3 py-3">
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-[12px] text-gray-400 transition-colors group-hover:text-gray-600"
            aria-label={isExpanded ? "Comprimi" : "Espandi"}
          >
            {isExpanded ? "−" : "+"}
          </button>
        </td>
      </tr>

      {/* Expanded child rows */}
      {isExpanded &&
        children.map((child) => (
          <DatasetRow
            key={child.id}
            d={child}
            isSelected={selectedIds.has(child.id)}
            onToggleSelect={() => onToggleChildSelect(child.id)}
            indent
          />
        ))}
    </>
  );
}

export default function DatiPage() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DatasetCategory | null>(
    null,
  );
  const [coverageFilter, setCoverageFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const hasSelection = selectedIds.size > 0;

  // "/" to focus search, Escape to deselect
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && hasSelection) {
        setSelectedIds(new Set());
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [hasSelection]);

  /** Filtered datasets (individual items, before grouping). */
  const filtered = useMemo(() => {
    let result = enriched;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.source.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          (d.groupLabel && d.groupLabel.toLowerCase().includes(q)),
      );
    }
    if (categoryFilter)
      result = result.filter((d) => d.category === categoryFilter);
    if (coverageFilter)
      result = result.filter((d) => d.coverage === coverageFilter);
    return result;
  }, [query, categoryFilter, coverageFilter]);

  /** Display rows: collapsed groups + standalone items. */
  const displayRows = useMemo(() => buildDisplayRows(filtered), [filtered]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Toggle all members of a group. */
  const toggleGroupSelect = useCallback((memberIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = memberIds.every((id) => next.has(id));
      if (allSelected) {
        memberIds.forEach((id) => next.delete(id));
      } else {
        memberIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const toggleGroupExpand = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((d) => d.id)));
    }
  }, [filtered, selectedIds.size]);

  const allSelected =
    filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-[#00D9A3]">
            Catalogo
          </p>
          <h1 className="mt-1.5 font-heading text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Dati pubblici italiani
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
            {displayRows.length} voci da{" "}
            {new Set(enriched.map((d) => d.source)).size} fonti ufficiali —
            esplora, seleziona e combina.
          </p>
        </div>

        {/* Search + coverage pills */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              ref={searchRef}
              placeholder="Cerca dataset, fonte, tema…  /"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-[#00D9A3] focus:outline-none focus:ring-1 focus:ring-[#00D9A3]"
            />
          </div>
          <div className="flex gap-1.5">
            {([null, "italy", "sardinia"] as const).map((c) => (
              <button
                key={c ?? "all"}
                type="button"
                onClick={() => setCoverageFilter(c)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
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
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              categoryFilter === null
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tutti
          </button>
          {CATEGORIES.map((cat) => {
            const count = filtered.filter((d) => d.category === cat.id).length;
            const isActive = categoryFilter === cat.id;
            const isDisabled = count === 0 && !isActive;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  !isDisabled && setCategoryFilter(isActive ? null : cat.id)
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  isActive
                    ? cat.color.pillActive
                    : isDisabled
                      ? "cursor-default bg-gray-50 text-gray-300"
                      : `${cat.color.pill} hover:opacity-80`
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
          <p className="mt-3 text-[11px] text-gray-400">
            {filtered.length} di {enriched.length} dataset
          </p>
        )}

        {/* Main content: Table + Selection Panel */}
        <div className="mt-5 flex gap-0">
          {/* Data table */}
          <div className="min-w-0 flex-1">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* Table head */}
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="w-10 px-3 py-3">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                            allSelected
                              ? "border-[#00D9A3] bg-[#00D9A3]"
                              : "border-gray-300 bg-white hover:border-gray-400"
                          }`}
                          aria-label="Seleziona tutti"
                        >
                          {allSelected && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </button>
                      </th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        Dataset
                      </th>
                      <th className="hidden px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 md:table-cell">
                        Tema
                      </th>
                      <th className="hidden px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 sm:table-cell">
                        Copertura
                      </th>
                      <th className="hidden px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 lg:table-cell">
                        Formato
                      </th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        Stato
                      </th>
                      <th className="w-10 px-3 py-3" />
                    </tr>
                  </thead>

                  {/* Table body */}
                  <tbody>
                    {displayRows.map((row) => {
                      const d = row.dataset;
                      const isGroup = !!row.group;
                      const isExpanded =
                        isGroup && expandedGroups.has(row.group!.key);
                      const memberIds = row.group?.memberIds ?? [d.id];
                      const groupAllSelected = memberIds.every((id) =>
                        selectedIds.has(id),
                      );
                      const groupSomeSelected =
                        !groupAllSelected &&
                        memberIds.some((id) => selectedIds.has(id));

                      // Get group members for expanded display
                      const children = isExpanded
                        ? enriched.filter((e) => e.group === row.group!.key)
                        : [];

                      return (
                        <GroupRows
                          key={d.id}
                          representative={d}
                          isGroup={isGroup}
                          groupLabel={row.group?.label}
                          memberCount={memberIds.length}
                          isExpanded={isExpanded}
                          allSelected={groupAllSelected}
                          someSelected={groupSomeSelected}
                          children={children}
                          selectedIds={selectedIds}
                          onToggleExpand={() =>
                            row.group && toggleGroupExpand(row.group.key)
                          }
                          onToggleSelect={() =>
                            isGroup
                              ? toggleGroupSelect(memberIds)
                              : toggleSelect(d.id)
                          }
                          onToggleChildSelect={toggleSelect}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 && (
                <div className="py-16 text-center">
                  <p className="text-[13px] text-gray-400">
                    Nessun dataset trovato.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selection Panel — slides in */}
          <div
            className={`shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
              hasSelection ? "ml-4 w-[320px] opacity-100" : "ml-0 w-0 opacity-0"
            }`}
          >
            <div className="w-[320px]">
              <div className="sticky top-20 h-[calc(100vh-8rem)] rounded-xl border border-gray-200 bg-white/90 shadow-sm backdrop-blur-md">
                <SelectionPanel
                  selectedIds={selectedIds}
                  onDeselect={(id) =>
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      next.delete(id);
                      return next;
                    })
                  }
                  onDeselectAll={() => setSelectedIds(new Set())}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
