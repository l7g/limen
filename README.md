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

Raw data lives in `../DATA/` (shared workspace). Scripts in `scripts/` transform raw data into optimized formats:

```bash
npx tsx scripts/fetch-boundaries.ts    # ISTAT boundaries → GeoJSON
npx tsx scripts/fetch-population.ts    # ISTAT population → CSV
npx tsx scripts/fetch-gtfs.ts          # GTFS feeds → stops/routes GeoJSON
npx tsx scripts/check-freshness.ts     # Check all dataset statuses
```

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
