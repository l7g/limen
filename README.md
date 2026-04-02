# Limen — Open Civic Data Platform

> Italian open data, made visible.

**Limen** is an open-source civic data platform that makes Italian public data explorable through maps and visualizations. Boundaries, demographics, transit, vehicles, emissions — all in an interactive browser-based workbench.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

- **No backend** — all data is static files served from `/public/data/`
- **Client-side processing** — CSV/GeoJSON/SHP parsed in the browser
- **MapLibre GL JS** — vector-based map rendering
- **Zustand** — lightweight state management for the workbench
- **Three-tier data**: API-fed (auto-updated) → Curated static (expiry alerts) → Computed/derived

## Data Pipeline

Processed data in `public/data/` is **committed to the repo** — you don't need to run any scripts to develop locally. Scripts in `scripts/` are used to refresh or add data.

### Script categories

**Fetch** — download from public APIs (anyone can run these):

```bash
npx tsx scripts/fetch-boundaries.ts        # ISTAT WFS → GeoJSON boundaries
npx tsx scripts/fetch-population.ts        # ISTAT SDMX → population CSV
npx tsx scripts/fetch-demographics.ts      # ISTAT demographic structure
```

**Process** — transform raw source files into `public/data/`. These require raw data files (GTFS ZIPs, ACI CSVs, etc.) that are **not included in the repo**. See [Adding a new dataset](#adding-a-new-dataset) below.

```bash
npx tsx scripts/process-gtfs-stops.ts      # GTFS feeds → stops GeoJSON
npx tsx scripts/process-vehicles.ts        # ACI vehicle fleet (Sardinia)
npx tsx scripts/process-vehicles-national.ts # ACI vehicle fleet (national)
npx tsx scripts/process-population.ts      # Population by comune
npx tsx scripts/process-pendolarismo.ts    # ISTAT commuter matrix
npx tsx scripts/process-income.ts          # MEF income data
```

**Compute** — derive indicators from already-processed data in `public/data/` (anyone can run these):

```bash
npx tsx scripts/compute-population-density.ts    # Pop ÷ area
npx tsx scripts/compute-motorization.ts          # Vehicles ÷ population
npx tsx scripts/compute-income-per-capita.ts     # Income ÷ population
npx tsx scripts/compute-emissions.ts             # ISPRA emission factors
npx tsx scripts/compute-demographic-indicators.ts # Age indices
npx tsx scripts/compute-commuter-balance.ts      # Net commuter flows
```

**Utility:**

```bash
npx tsx scripts/check-freshness.ts         # Check all dataset statuses
```

### Adding a new dataset

1. **Download the raw data** from the official source (link it in your PR description)
2. **Write a script** in `scripts/` — either a `fetch-*` (if the source has a public API) or `process-*` (if manual download)
3. **Output** goes to the appropriate folder in `public/data/` (e.g. `public/data/boundaries/`, `public/data/population/`)
4. **Add metadata** to the dataset catalog in `lib/datasets/catalog.ts`
5. **Commit the processed output** — raw source files stay out of the repo, processed data goes in
6. **Open a PR** with the script + processed data + catalog entry

See [CONTRIBUTING.md](CONTRIBUTING.md) for code conventions and PR workflow.

## Pages

| Route        | Purpose                            |
| ------------ | ---------------------------------- |
| `/`          | Landing page                       |
| `/workbench` | Split-panel map workbench          |
| `/dati`      | Data catalog with freshness badges |
| `/dati/[id]` | Dataset detail page                |
| `/info`      | About the project                  |

## Tech Stack

Next.js · React · TypeScript · Tailwind CSS v4 · MapLibre GL JS · Zustand · Papa Parse

## License

Code: MIT. Derived data: CC BY 4.0.
