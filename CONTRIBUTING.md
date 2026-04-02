# Contributing to Limen

Thanks for your interest in contributing! Limen is an open-source civic data platform for Italian open data.

## Getting Started

```bash
git clone https://github.com/l7g/limen.git
cd limen
npm install
cp .env.example .env.local
npm run dev
```

## Development Rules

- **Branch from `main`** — create a feature branch (`feat/...`, `fix/...`)
- **One concern per PR** — don't mix unrelated changes
- **Build must pass** — run `npm run build` before opening a PR
- **TypeScript strict** — no `any`, no `@ts-ignore`
- **Tailwind only** — no inline styles, no CSS modules

## Data Pipeline

Raw data lives outside the repo (ISTAT, ACI, ISPRA sources). Processed data goes in `public/data/`.

Scripts in `scripts/` transform raw → processed. If you change a script, verify the output:

```bash
npm run compute:all          # regenerate derived indicators
npm run check:freshness      # verify dataset statuses
```

## What We Accept

- Bug fixes with clear reproduction steps
- Data quality improvements (better processing, new official sources)
- Accessibility improvements
- Performance improvements with benchmarks
- Translations (catalog descriptions, UI labels)

## What We Don't Accept

- Features without prior discussion — open an issue first
- Dependencies without justification
- Breaking changes to the data schema without migration
- AI-generated PRs without human review

## Code Style

- Prettier + ESLint (run `npm run lint`)
- Italian for user-facing text, English for code/comments
- Components in `components/`, utilities in `lib/`, data scripts in `scripts/`

## Issues

Use GitHub Issues for bugs and feature requests. Include:

- What you expected vs what happened
- Browser + OS
- Screenshot if visual

## License

By contributing, you agree that your contributions are licensed under MIT (code) and CC BY 4.0 (derived data).
