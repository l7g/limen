# Limen — Data Directory

This directory holds **build-time generated** data files.

- `catalog.json` — Auto-generated dataset catalog (created by build scripts)

Raw data lives in `../DATA/` (shared workspace data warehouse).
Processed data lives in `../public/data/` (served as static assets).

Scripts in `../scripts/` transform raw → processed.
