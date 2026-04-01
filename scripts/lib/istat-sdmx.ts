/**
 * ISTAT SDMX REST API client.
 *
 * Endpoint: https://esploradati.istat.it/SDMXWS/rest/
 * Protocol: SDMX-RI v2.0 path format (NOT v2.1 — no "dataflow/" context path)
 * CSV output: requires Accept header (format=csvdata query param is ignored)
 *
 * Rate limit: max 5 requests/minute — enforced via 13s minimum delay.
 * Exceeding the limit risks a 1–2 day IP block.
 *
 * Usage:
 *   import { fetchSdmxCsv, parseSdmxCsv } from "./lib/istat-sdmx";
 *   const csv = await fetchSdmxCsv({ dataflowId: "...", key: "..." });
 *   const rows = parseSdmxCsv(csv);
 */

const BASE_URL = "https://esploradati.istat.it/SDMXWS/rest/data";
const CSV_ACCEPT = "application/vnd.sdmx.data+csv;version=1.0.0";
const MIN_DELAY_MS = 13_000; // 13s between requests (well under 5/min)

export interface SdmxQuery {
  /** ISTAT dataflow identifier, e.g. "22_289_DF_DCIS_POPRES1_24" */
  dataflowId: string;
  /** Dot-separated dimension key. Empty position = wildcard. e.g. "A..JAN.9.TOTAL.99" */
  key: string;
  /** ISO year filter, e.g. "2024" */
  startPeriod?: string;
  /** Return only the N most recent observations per series */
  lastNObservations?: number;
}

export interface SdmxCsvRow {
  [key: string]: string;
}

let lastRequestTime = 0;

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (lastRequestTime > 0 && elapsed < MIN_DELAY_MS) {
    const waitMs = MIN_DELAY_MS - elapsed;
    console.log(`  Rate limit: waiting ${(waitMs / 1000).toFixed(1)}s...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestTime = Date.now();
}

const TIMEOUT_MS = 120_000; // 2 min per request (ISTAT is slow)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 30_000; // 30s between retries

/**
 * Fetch CSV data from the ISTAT SDMX REST API.
 * Enforces rate limiting, has a 2-min timeout, and retries up to 3 times.
 */
export async function fetchSdmxCsv(query: SdmxQuery): Promise<string> {
  const url = new URL(`${BASE_URL}/${query.dataflowId}/${query.key}`);
  if (query.startPeriod) url.searchParams.set("startPeriod", query.startPeriod);
  if (query.lastNObservations)
    url.searchParams.set("lastNObservations", String(query.lastNObservations));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await enforceRateLimit();
    console.log(
      `  GET ${url.toString()}${attempt > 1 ? ` (retry ${attempt}/${MAX_RETRIES})` : ""}`,
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: CSV_ACCEPT,
          "Accept-Language": "it",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.status === 500 && attempt < MAX_RETRIES) {
        console.log(
          `  ⚠ Server error 500 — retrying in ${RETRY_DELAY_MS / 1000}s...`,
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `SDMX API ${response.status} ${response.statusText}\n  URL: ${url}\n  Body: ${body.slice(0, 300)}`,
        );
      }

      return await response.text();
    } catch (err: unknown) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      if (
        (msg.includes("abort") || msg.includes("fetch failed")) &&
        attempt < MAX_RETRIES
      ) {
        console.log(
          `  ⚠ Timeout/network error — retrying in ${RETRY_DELAY_MS / 1000}s...`,
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw new Error(`SDMX fetch failed after ${attempt} attempts: ${msg}`);
    }
  }

  throw new Error("SDMX fetch failed: exhausted retries");
}

/**
 * Parse SDMX CSV into typed row objects.
 * Handles the standard SDMX CSV format with comma-separated columns.
 */
export function parseSdmxCsv(csv: string): SdmxCsvRow[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: SdmxCsvRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}
