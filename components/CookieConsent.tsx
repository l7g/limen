"use client";

import { useState, useEffect } from "react";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "limen-cookie-consent";

export type ConsentValue = "granted" | "denied";

/** Read consent from localStorage (returns null if no choice yet) */
export function getStoredConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "granted" || v === "denied") return v;
  return null;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getStoredConsent() === null) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function handleChoice(choice: ConsentValue) {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
    window.dispatchEvent(
      new CustomEvent("cookie-consent-change", { detail: choice }),
    );
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[10000] animate-in slide-in-from-bottom duration-500 fill-mode-both"
    >
      <div className="mx-auto max-w-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Cookie size={18} className="text-gray-500" aria-hidden="true" />
            <h2 className="font-heading text-sm font-semibold text-gray-900">
              Cookie e Privacy
            </h2>
          </div>

          <p className="mb-4 text-xs leading-relaxed text-gray-500">
            Utilizziamo cookie analitici (Google Analytics) per capire come
            viene utilizzato il sito e migliorarne l&apos;esperienza. Nessun
            dato personale viene venduto a terzi.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => handleChoice("denied")}
              className="flex-1 cursor-pointer rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
            >
              Rifiuta
            </button>
            <button
              onClick={() => handleChoice("granted")}
              className="flex-1 cursor-pointer rounded-lg bg-[#00D9A3] px-4 py-2.5 text-xs font-semibold text-gray-900 transition-colors hover:bg-[#00B386]"
            >
              Accetta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
