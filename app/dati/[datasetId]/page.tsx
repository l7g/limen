import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Download, ExternalLink, Link2, Map } from "lucide-react";
import {
  datasets,
  getDataset,
  getRelatedDatasets,
} from "@/lib/datasets/catalog";
import {
  computeStatus,
  daysSinceUpdate,
  daysUntilUpdate,
} from "@/lib/datasets/freshness";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FreshnessBadge from "@/components/data/FreshnessBadge";
import DatasetPreviews from "@/components/data/DatasetPreviews";

export function generateStaticParams() {
  return datasets.map((d) => ({ datasetId: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}): Promise<Metadata> {
  const { datasetId } = await params;
  const dataset = getDataset(datasetId);
  if (!dataset) return { title: "Dataset non trovato — Limen" };

  const title = `${dataset.name} — Limen`;
  const description = `${dataset.description} Fonte: ${dataset.source}. Copertura: ${dataset.coverage === "italy" ? "Italia" : "Sardegna"}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Limen",
    },
  };
}

const tierLabels = {
  1: "Automatico (API)",
  2: "Manuale (Statico)",
  3: "Derivato (Calcolato)",
} as const;
const coverageLabels = {
  italy: "Italia",
  sardinia: "Sardegna",
  custom: "Custom",
} as const;
const cadenceLabels: Record<string, string> = {
  daily: "Giornaliera",
  weekly: "Settimanale",
  monthly: "Mensile",
  quarterly: "Trimestrale",
  annual: "Annuale",
  decennial: "Decennale",
  static: "Statico",
};
const categoryLabels: Record<string, string> = {
  confini: "Confini Amministrativi",
  demografia: "Demografia",
  trasporti: "Trasporto Pubblico",
  veicoli: "Parco Veicolare",
  economia: "Economia",
  ambiente: "Ambiente",
  servizi: "Servizi Pubblici",
  indicatori: "Indicatori Derivati",
};

export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  const dataset = getDataset(datasetId);
  if (!dataset) notFound();

  const status = computeStatus(dataset);
  const age = daysSinceUpdate(dataset);
  const untilNext = daysUntilUpdate(dataset);
  const related = getRelatedDatasets(datasetId);

  /** Convert filesystem path "public/data/..." → URL "/data/..." */
  const dataUrl = dataset.filePath.startsWith("public/")
    ? dataset.filePath.slice("public".length)
    : `/${dataset.filePath}`;

  const meta = [
    {
      label: "Tema",
      value: categoryLabels[dataset.category] ?? dataset.category,
    },
    { label: "Fonte", value: dataset.source },
    { label: "Copertura", value: coverageLabels[dataset.coverage] },
    { label: "Formato", value: dataset.format.toUpperCase() },
    { label: "Licenza", value: dataset.license },
    {
      label: "Cadenza",
      value: cadenceLabels[dataset.cadence] ?? dataset.cadence,
    },
    { label: "Aggiornamento", value: tierLabels[dataset.tier] },
    { label: "Ultimo aggiornamento", value: `${age} giorni fa` },
    ...(untilNext !== null
      ? [
          {
            label: "Prossimo aggiornamento",
            value: untilNext > 0 ? `tra ${untilNext} giorni` : "Scaduto",
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="mx-auto w-full max-w-4xl px-6 py-10 md:py-14">
        {/* Back link */}
        <Link
          href="/dati"
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Catalogo Dati
        </Link>

        {/* Title */}
        <div className="mt-5 flex items-start gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">
              {dataset.name}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-gray-500">
              {dataset.description}
            </p>
          </div>
          <FreshnessBadge status={status} className="mt-1 shrink-0" />
        </div>

        {/* Metadata grid */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50/50 p-5">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
            {meta.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  {label}
                </dt>
                <dd className="mt-1 text-[13px] font-medium text-gray-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {dataset.geometryType && dataset.geometryType !== "none" && (
            <Link
              href={`/workbench?layer=${dataset.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#00D9A3] px-4 py-2 text-[13px] font-semibold text-gray-900 transition-colors hover:bg-[#00C594]"
            >
              <Map className="h-4 w-4" />
              Apri nel Workbench
            </Link>
          )}
          <a
            href={dataUrl}
            download
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Scarica {dataset.format.toUpperCase()}
          </a>
          {dataset.sourceUrl && (
            <a
              href={dataset.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#00D9A3] transition-colors hover:text-[#00B386]"
            >
              Vai alla fonte originale
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Previews (map + data table) — client component */}
        <DatasetPreviews
          dataUrl={dataUrl}
          format={dataset.format}
          geometryType={dataset.geometryType}
        />

        {/* Related datasets (shared join key) */}
        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-4">
              <Link2 className="h-4 w-4" /> Dataset Collegati
              <span className="text-[11px] font-normal normal-case tracking-normal text-gray-400">
                — unibili tramite{" "}
                <code className="font-mono text-[11px] text-gray-500">
                  {dataset.joinField}
                </code>
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map((rel) => {
                const relStatus = computeStatus(rel);
                return (
                  <Link
                    key={rel.id}
                    href={`/dati/${rel.id}`}
                    className="group flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 group-hover:text-[#00B386] transition-colors truncate">
                        {rel.name}
                      </p>
                      <p className="mt-1 text-[12px] text-gray-500 line-clamp-2">
                        {rel.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{rel.source}</span>
                        <span>·</span>
                        <span>{rel.format.toUpperCase()}</span>
                      </div>
                    </div>
                    <FreshnessBadge status={relStatus} className="shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
