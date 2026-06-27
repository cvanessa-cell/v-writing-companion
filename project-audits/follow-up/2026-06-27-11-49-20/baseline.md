# Baseline

PROJECT WORKING FOLDER:

[C:\Users\cvane\V](/C:/Users/cvane/V)

PROJECT GOAL:

Turn the June 27 performance audit into safe product improvements that reduce extension support surface, improve owner diagnostics, strengthen consumer trust, and keep the repo release-verifiable.

LATEST PERFORMANCE AUDIT:

[C:\Users\cvane\V\docs\performance-audit-2026-06-27.md](/C:/Users/cvane/V/docs/performance-audit-2026-06-27.md)

## 1. Project stack

- Monorepo with npm workspaces
- Electron desktop app via `electron-vite`
- Browser extension built with `esbuild`
- Shared TypeScript package
- Local SQLite storage via `better-sqlite3`
- Local HTTP bridge between extension and desktop app

## 2. Current scripts available

- Root: `dev`, `build`, `test`, `lint`
- Desktop: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`
- Browser extension: `build`, `test`, `lint`
- Shared: `build`, `test`, `lint`

## 3. Current routes/pages

- Desktop renderer views:
  - rewrite panel
  - settings window
- Browser extension surfaces:
  - content script
  - popup

## 4. Current API endpoints

- Local bridge `GET /health`
- Local bridge `GET /settings`
- Local bridge `POST /rewrite-request`
- Local bridge `POST /suggest-request`
- Local bridge `POST /event`

## 5. Current admin features

- Provider and bridge configuration in settings
- Rewrite controls and privacy controls
- Memory center with exclusions/history review
- Local diagnostics card with export

## 6. Current marketing pages

- No product website or landing page in repo
- README is the primary user-facing explainer

## 7. Current content system

- Documentation-first content in `README.md` and `docs/*.md`
- No CMS or repeatable content publishing pipeline

## 8. Current monetization system

- No billing, pricing, or entitlements in codebase

## 9. Current analytics/events

- Local SQLite-backed diagnostics events for desktop and extension stages
- No remote analytics SDK
- No onboarding/install funnel tracking

## 10. Current test coverage

- Root verification green on this run
- Desktop: prompt tests
- Shared: utility and phase tests
- Extension: field detection, typing monitor, domain gating tests
- Still limited DOM-level coverage for overlay flows

## 11. Current deploy setup

- Desktop packaging config in [C:\Users\cvane\V\apps\desktop\electron-builder.json](/C:/Users/cvane/V/apps/desktop/electron-builder.json)
- No confirmed working packaged release command on current Node `24.15.0`

## 12. Known risks from the performance audit

- Hotkey path still depends on per-interaction PowerShell and fixed sleeps
- Extension manifest still injects broadly
- Diagnostics are useful but still local and owner-operated only
- Marketing/install funnel is not built
