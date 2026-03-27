import type { DatasetStatus } from "@/lib/datasets/types";

const styles: Record<DatasetStatus, string> = {
  current: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  expiring: "bg-amber-50 text-amber-700 ring-amber-600/20",
  stale: "bg-red-50 text-red-700 ring-red-600/20",
  error: "bg-red-50 text-red-700 ring-red-600/20",
};

const labels: Record<DatasetStatus, string> = {
  current: "Aggiornato",
  expiring: "In scadenza",
  stale: "Scaduto",
  error: "Errore",
};

interface FreshnessBadgeProps {
  status: DatasetStatus;
  className?: string;
}

export default function FreshnessBadge({
  status,
  className = "",
}: FreshnessBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${styles[status]} ${className}`}
    >
      {labels[status]}
    </span>
  );
}
