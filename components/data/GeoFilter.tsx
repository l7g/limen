"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { MapPin, ChevronDown, X } from "lucide-react";

interface GeoHierarchy {
  regioni: { cod: string; nome: string }[];
  province: { cod: string; nome: string; sigla: string; regione: string }[];
  comuni: { cod: string; nome: string; provincia: string }[];
}

export interface GeoSelection {
  regione: { cod: string; nome: string } | null;
  provincia: {
    cod: string;
    nome: string;
    sigla: string;
    regioneCod: string;
  } | null;
  comune: { cod: string; nome: string } | null;
}

interface GeoFilterProps {
  value: GeoSelection;
  onChange: (selection: GeoSelection) => void;
}

const EMPTY: GeoSelection = { regione: null, provincia: null, comune: null };

export default function GeoFilter({ value, onChange }: GeoFilterProps) {
  const [hierarchy, setHierarchy] = useState<GeoHierarchy | null>(null);

  useEffect(() => {
    fetch("/data/geo-hierarchy.json")
      .then((r) => r.json())
      .then((d) => setHierarchy(d as GeoHierarchy))
      .catch(() => {});
  }, []);

  const filteredProvince = useMemo(() => {
    if (!hierarchy) return [];
    if (!value.regione) return hierarchy.province;
    return hierarchy.province.filter((p) => p.regione === value.regione!.cod);
  }, [hierarchy, value.regione]);

  const filteredComuni = useMemo(() => {
    if (!hierarchy) return [];
    if (!value.provincia) {
      if (!value.regione) return hierarchy.comuni;
      const provCods = new Set(filteredProvince.map((p) => p.cod));
      return hierarchy.comuni.filter((c) => provCods.has(c.provincia));
    }
    return hierarchy.comuni.filter((c) => c.provincia === value.provincia!.cod);
  }, [hierarchy, value.regione, value.provincia, filteredProvince]);

  const hasSelection = value.regione || value.provincia || value.comune;

  return (
    <div className="flex items-center gap-1.5">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />

      <GeoDropdown
        label="Regione"
        placeholder="Tutte le regioni"
        items={hierarchy?.regioni ?? []}
        value={value.regione?.nome ?? null}
        onSelect={(item) =>
          onChange({ regione: item, provincia: null, comune: null })
        }
        renderItem={(r) => r.nome}
        filterFn={(r, q) => r.nome.toLowerCase().includes(q)}
      />

      <GeoDropdown
        label="Provincia"
        placeholder="Tutte le province"
        items={filteredProvince}
        value={
          value.provincia
            ? `${value.provincia.nome} (${value.provincia.sigla})`
            : null
        }
        onSelect={(item) =>
          onChange({
            ...value,
            provincia: item
              ? {
                  cod: item.cod,
                  nome: item.nome,
                  sigla: item.sigla,
                  regioneCod: item.regione,
                }
              : null,
            comune: null,
          })
        }
        renderItem={(p) => `${p.nome} (${p.sigla})`}
        filterFn={(p, q) =>
          p.nome.toLowerCase().includes(q) || p.sigla.toLowerCase().includes(q)
        }
        disabled={!hierarchy}
      />

      <GeoDropdown
        label="Comune"
        placeholder="Tutti i comuni"
        items={filteredComuni}
        value={value.comune?.nome ?? null}
        onSelect={(item) =>
          onChange({
            ...value,
            comune: item ? { cod: item.cod, nome: item.nome } : null,
          })
        }
        renderItem={(c) => c.nome}
        filterFn={(c, q) => c.nome.toLowerCase().includes(q)}
        disabled={!hierarchy}
      />

      {hasSelection && (
        <button
          type="button"
          onClick={() => onChange(EMPTY)}
          className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Resetta filtri geografici"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ── Generic dropdown with search ── */
function GeoDropdown<T>({
  label,
  placeholder,
  items,
  value,
  onSelect,
  renderItem,
  filterFn,
  disabled,
}: {
  label: string;
  placeholder: string;
  items: T[];
  value: string | null;
  onSelect: (item: T | null) => void;
  renderItem: (item: T) => string;
  filterFn: (item: T, query: string) => boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return items.slice(0, 50);
    const q = search.toLowerCase();
    return items.filter((item) => filterFn(item, q)).slice(0, 50);
  }, [items, search, filterFn]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] transition-all ${
          value
            ? "border-[#00D9A3]/40 bg-[#00D9A3]/5 text-gray-900 font-medium"
            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        aria-label={label}
      >
        <span className="max-w-[120px] truncate">{value ?? placeholder}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-gray-100 p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Cerca ${label.toLowerCase()}…`}
              className="w-full rounded-lg bg-gray-50 px-2.5 py-1.5 text-[12px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto overscroll-contain py-1">
            {/* "All" option */}
            {value && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center px-3 py-1.5 text-[12px] text-gray-500 hover:bg-gray-50"
              >
                {placeholder}
              </button>
            )}

            {filtered.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-gray-400">
                Nessun risultato
              </p>
            )}

            {filtered.map((item, i) => {
              const text = renderItem(item);
              const isActive = text === value;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center px-3 py-1.5 text-[12px] transition-colors ${
                    isActive
                      ? "bg-[#00D9A3]/10 font-medium text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {text}
                </button>
              );
            })}

            {items.length > 50 && !search && (
              <p className="px-3 py-2 text-[10px] text-gray-400">
                Digita per filtrare ({items.length} totali)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
