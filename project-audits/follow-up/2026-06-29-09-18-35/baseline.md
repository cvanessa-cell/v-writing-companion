# Baseline

## Project Working Folder

`C:\Users\cvane\V`

## Project Goal

Implement the highest-leverage improvements from the June 29, 2026 performance audit so V is easier to understand, faster to validate, easier to operate, and more measurable across desktop and browser rewrite flows.

## Latest Performance Audit

- Source audit: `docs/performance-audit-2026-06-29.md`
- Primary audit goals:
  - make release-to-release diagnostics comparable
  - reduce extension runtime ambiguity by measuring bootstraps versus real field activations
  - shorten routine validation cost by separating slow DOM coverage from the default test path
  - improve the first-success onboarding surface for real users

## Project Stack

- Monorepo with npm workspaces
- Desktop app: Electron + React + TypeScript + electron-vite
- Browser extension: Manifest V3 + TypeScript + esbuild
- Shared package: TypeScript schemas, prompts, utilities
- Local storage: SQLite via `better-sqlite3`

## Current Scripts Available

- Root: `npm run dev`, `npm run build`, `npm run test`, `npm run test:full`, `npm run lint`
- Desktop: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`
- Browser extension: `build`, `lint`, `test`, `test:logic`, `test:dom`
- Shared: `test`, `lint`

## Current Routes and Pages

- Desktop renderer views:
  - rewrite panel (`view=panel`)
  - settings (`view=settings`)
- Extension UI:
  - popup (`popup.html`)
  - in-page floating button and suggestion overlay
- No web marketing site or hosted admin route exists in this repo

## Current API Endpoints

- Local bridge health: `GET /health`
- Rewrite request: `POST /rewrite-request`
- Suggest request: `POST /suggest-request`
- Bridge settings: `GET /settings`
- Diagnostics event ingest: `POST /event`

## Current Admin Features

- Settings screen with provider, hotkey, privacy, activation scope, and rewrite controls
- Local diagnostics dashboard
- Memory center and app rules library
- Excluded apps/domains management

## Current Marketing Pages

- No external landing page in this repo
- Current user-facing value surfaces are:
  - `README.md`
  - `docs/SETUP.md`
  - `docs/EXTENSION_SETUP.md`
  - extension popup
  - settings onboarding flow

## Current Content System

- Markdown docs only
- No CMS, blog, sitemap, or repeatable content pipeline

## Current Monetization System

- None implemented
- No billing, checkout, subscriptions, or entitlements in repo

## Current Analytics and Events

- Privacy-safe local diagnostics stored in SQLite
- Key events already include launch, hotkey, capture, rewrite, replace, bridge, suggestion, and activation-blocked stages
- Before this run, diagnostics were not release-aware

## Current Test Coverage

- Desktop Vitest: prompt coverage
- Shared Vitest: utilities and phase 4 behavior coverage
- Browser extension Vitest: domain access, field detection, typing monitor, suggestion overlay

## Current Deploy Setup

- Desktop production bundle via `electron-vite build`
- Browser extension artifact via custom `scripts/build.mjs`
- No CI workflow or hosted deploy target detected in repo

## Known Risks From The Performance Audit

1. Desktop hotkey path still depends on PowerShell and fixed waits; not addressed in this run.
2. Extension still injects broadly with `matches: ["<all_urls>"]` and `all_frames: true`; this run adds measurement, not manifest narrowing.
3. There is still no public landing page or monetization surface.
4. Diagnostics were previously hard to compare across releases; this run addresses that gap.
