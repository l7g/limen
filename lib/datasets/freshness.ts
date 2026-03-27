import type { DatasetMeta, DatasetStatus } from "./types";

/**
 * Calculate the freshness status of a dataset based on its metadata.
 * Returns "current", "expiring", or "stale" based on dates and cadence.
 */
export function computeStatus(
  dataset: DatasetMeta,
  now: Date = new Date(),
): DatasetStatus {
  if (dataset.status === "error") return "error";

  const { nextExpectedUpdate, expiryWarningDays, lastUpdated } = dataset;

  // If we have a known next update date, use it
  if (nextExpectedUpdate) {
    const nextDate = new Date(nextExpectedUpdate);
    const warningDate = new Date(nextDate);
    warningDate.setDate(warningDate.getDate() - expiryWarningDays);

    if (now > nextDate) return "stale";
    if (now > warningDate) return "expiring";
    return "current";
  }

  // Fallback: estimate staleness from cadence + lastUpdated
  const last = new Date(lastUpdated);
  const ageMs = now.getTime() - last.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  const maxAgeDays = cadenceToMaxDays(dataset.cadence);
  if (maxAgeDays === null) return "current"; // "static" or "decennial" — no auto-expiry

  if (ageDays > maxAgeDays) return "stale";
  if (ageDays > maxAgeDays - expiryWarningDays) return "expiring";
  return "current";
}

function cadenceToMaxDays(cadence: DatasetMeta["cadence"]): number | null {
  switch (cadence) {
    case "daily":
      return 2;
    case "weekly":
      return 10;
    case "monthly":
      return 45;
    case "quarterly":
      return 120;
    case "annual":
      return 400;
    case "decennial":
    case "static":
      return null;
    default:
      return null;
  }
}

/** Days until next expected update, or null if unknown. */
export function daysUntilUpdate(
  dataset: DatasetMeta,
  now: Date = new Date(),
): number | null {
  if (!dataset.nextExpectedUpdate) return null;
  const next = new Date(dataset.nextExpectedUpdate);
  const diff = next.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Days since last update. */
export function daysSinceUpdate(
  dataset: DatasetMeta,
  now: Date = new Date(),
): number {
  const last = new Date(dataset.lastUpdated);
  const diff = now.getTime() - last.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
