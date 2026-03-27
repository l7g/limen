import Link from "next/link";
import { ArrowRight, Search, Map, GitMerge } from "lucide-react";
import { datasets } from "@/lib/datasets/catalog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  const totalDatasets = datasets.length;
  const sardinia = datasets.filter((d) => d.coverage === "sardinia").length;
  const italy = datasets.filter((d) => d.coverage === "italy").length;
  const sources = [...new Set(datasets.map((d) => d.source))].length;
  const categories = [...new Set(datasets.map((d) => d.category))].length;

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #111 1px, transparent 1px), linear-gradient(to bottom, #111 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-24 md:pb-28 md:pt-32">
          <div className="max-w-2xl">
            <p className="text-[13px] font-medium tracking-wide uppercase text-[#00D9A3]">
              Open Civic Data Platform
            </p>
            <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-[56px] lg:leading-[1.1]">
              I dati pubblici italiani,{" "}
              <span className="text-[#00D9A3]">
                finalmente in un unico posto.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-gray-500">
              ISTAT, ACI, ISPRA, MEF, MIUR — decine di portali, formati diversi,
              nessun modo semplice per trovarli e combinarli. Limen li
              raccoglie, li cataloga e li rende esplorabili. Sfoglia il catalogo
              per scoprire e combinare i dati, oppure apri il workbench per
              visualizzarli su mappa.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dati"
                className="inline-flex items-center gap-2 rounded-lg bg-[#00D9A3] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#00B386] hover:shadow-md"
              >
                Esplora il Catalogo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/workbench"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
              >
                Apri il Workbench
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What it does — three pillars */}
      <section className="border-t border-gray-100 bg-gray-50/50 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00D9A3]/10">
                <Search className="h-[18px] w-[18px] text-[#00D9A3]" />
              </div>
              <h3 className="font-heading text-[15px] font-semibold text-gray-900">
                Trova i dati
              </h3>
              <p className="text-[13px] leading-relaxed text-gray-500">
                Un catalogo strutturato con {totalDatasets} dataset ufficiali
                italiani. Anteprima dei dati inline, freschezza trasparente, e
                merge builder per combinare dataset da fonti diverse.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00D9A3]/10">
                <Map className="h-[18px] w-[18px] text-[#00D9A3]" />
              </div>
              <h3 className="font-heading text-[15px] font-semibold text-gray-900">
                Esplora su mappa
              </h3>
              <p className="text-[13px] leading-relaxed text-gray-500">
                Workbench visuale con layer multipli, choropleth e stili. Oggi è
                un viewer di dati, domani un tool per creare mappe pronte alla
                pubblicazione.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00D9A3]/10">
                <GitMerge className="h-[18px] w-[18px] text-[#00D9A3]" />
              </div>
              <h3 className="font-heading text-[15px] font-semibold text-gray-900">
                Combina e analizza
              </h3>
              <p className="text-[13px] leading-relaxed text-gray-500">
                Incrocia dataset diversi — veicoli ÷ popolazione, scuole ×
                territori, GTFS × confini. Indicatori derivati pronti o
                personalizzabili.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-gray-100 py-14 md:py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-6 md:grid-cols-4">
          {[
            { value: totalDatasets, label: "Dataset catalogati" },
            { value: sources, label: "Fonti ufficiali" },
            { value: categories, label: "Temi coperti" },
            { value: italy + sardinia, label: "Dataset con dati" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-heading text-2xl font-bold text-gray-900">
                {value}
              </p>
              <p className="mt-1 text-[12px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Coverage note */}
      <section className="border-t border-gray-100 bg-gray-50/50 py-14 md:py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-heading text-xl font-semibold text-gray-900">
            Copertura onesta
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-gray-500">
            Ogni dataset mostra la sua reale copertura geografica. Confini,
            popolazione, redditi, veicoli e scuole coprono tutta l&apos;Italia.
            Dati GTFS e indicatori derivati sono oggi disponibili per la
            Sardegna — l&apos;espansione ad altre regioni è in corso.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/dati"
              className="text-[13px] font-medium text-[#00D9A3] transition-colors hover:text-[#00B386]"
            >
              Esplora il catalogo →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
