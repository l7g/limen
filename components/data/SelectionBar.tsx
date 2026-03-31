"use client";

import { useState, useCallback } from "react";
import { X, Download, Loader2 } from "lucide-react";
import type { DatasetMeta } from "@/lib/datasets/types";

interface SelectionBarProps {
  selected: DatasetMeta[];
  onClear: () => void;
  onRemove: (id: string) => void;
}

export default function SelectionBar({
  selected,
  onClear,
  onRemove,
}: SelectionBarProps) {
  const [downloading, setDownloading] = useState(false);

  /* Sequential file downloads */
  const handleBundle = useCallback(async () => {
    setDownloading(true);
    for (const ds of selected) {
      const url = ds.filePath.startsWith("public/")
        ? ds.filePath.slice("public".length)
        : `/${ds.filePath}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      a.click();
      await new Promise((r) => setTimeout(r, 300));
    }
    setDownloading(false);
  }, [selected]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-2 sm:px-4 sm:pb-4 animate-in slide-in-from-bottom duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-3 px-5 py-3">
          {/* Count + chips */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-[13px] font-semibold text-gray-900">
              {selected.length} selezionat{selected.length === 1 ? "o" : "i"}
            </span>
            <div className="hidden min-w-0 flex-wrap gap-1 sm:flex">
              {selected.slice(0, 3).map((d) => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-2 pr-1 text-[11px] text-gray-600"
                >
                  <span className="max-w-25 truncate">{d.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(d.id)}
                    className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {selected.length > 3 && (
                <span className="self-center text-[11px] text-gray-400">
                  +{selected.length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleBundle}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Scarica tutto
            </button>

            <button
              type="button"
              onClick={onClear}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Deseleziona tutto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
