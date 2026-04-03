# Roadmap

Limen is under active development. Here's what's planned — priorities may shift based on community feedback, usage patterns, and data availability.

## Completed

- **Data Catalog** — 20 datasets from 6 official Italian sources (ISTAT, ACI, MEF, ISPRA, GTFS operators). Search, filter by category/coverage, inline merge across datasets, download CSV.
- **Dataset detail pages** — inline table preview, map preview for geographic data, related datasets, download.
- **Workbench** — interactive MapLibre map with choropleth rendering, 7 computed indicators, boundary layers, GeoScope filtering (region/province drill-down), chart view (ranking + histogram).
- **Transit stops** — Sardinia GTFS stops rendered as point layer with 6 operators (ARST, CTM, ATP, ASPO, Trenitalia).
- **Derived indicators** — population density, motorization rate, income per capita, commuter balance, emissions estimates, demographic indices — all pre-computed and downloadable.

## In Progress

- **National GTFS expansion** — collecting feeds from major operators across Italy to extend transit stop coverage beyond Sardinia.
- **Additional national datasets** — MIUR school locations, Ministero della Salute healthcare facilities, ISPRA environmental data.
- **GitHub Actions automation** — scheduled cron workflows for Tier 1 API-fed datasets (ISTAT boundaries, population), automatic freshness alerts.

## Planned

- **Workbench enhancements** — file upload (CSV/GeoJSON drag-and-drop), share links (URL-encoded map state), PNG export improvements.
- **Catalog improvements** — chart previews on dataset detail pages, multi-format download, improved mobile experience.
- **Map creator features** — OSM feature layers (buildings, roads, land use), basemap style presets, label and annotation controls.
- **More derived indicators** — service desert index, depopulation risk, modal split estimates (where commuter + transit data overlap).

## Ideas Under Consideration

These are directions we're exploring — not commitments. Community interest helps prioritize.

- Layout mode for publication-ready map exports (map + title + legend + credits)
- Real-time GTFS integration (live vehicle positions where operators provide feeds)
- Historical data comparisons (population trends, vehicle fleet evolution)
- API access for programmatic dataset queries
- Embeddable map widgets for journalists and researchers

---

Have a suggestion or dataset request? Open an [issue](https://github.com/l7g/limen/issues) or email [info@limen.city](mailto:info@limen.city).
