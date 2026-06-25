# Baseline

PROJECT WORKING FOLDER:

[C:\Users\cvane\V](C:\Users\cvane\V)

PROJECT GOAL:

Make V reliably shippable from root commands, close the exclusion-management trust gap, reduce extension idle overhead, and improve the product value surface without disturbing the existing in-progress desktop-main changes.

LATEST PERFORMANCE AUDIT:

[C:\Users\cvane\V\docs\performance-audit-2026-06-25.md](C:\Users\cvane\V\docs\performance-audit-2026-06-25.md)

## 1. Project stack

- Monorepo with npm workspaces.
- Desktop app: Electron + electron-vite + React + TypeScript.
- Browser extension: TypeScript + esbuild.
- Shared package: TypeScript + Zod.
- Local data: better-sqlite3 SQLite database under the Electron userData path.
- Packaging: electron-builder Windows NSIS target.

## 2. Current scripts available

- Root: dev, uild, 	est, lint.
- Desktop: dev, uild, preview, 	est, 	est:watch, lint, postinstall.
- Browser extension: uild, 	est, lint.
- Shared: 	est, 	est:watch, lint.

## 3. Current routes/pages

- Desktop renderer panel view: panel via [App.tsx](C:/Users/cvane/V/apps/desktop/src/renderer/App.tsx).
- Desktop renderer settings view: settings via [App.tsx](C:/Users/cvane/V/apps/desktop/src/renderer/App.tsx).

## 4. Current API endpoints

- GET /health
- GET /settings
- POST /rewrite-request
- POST /suggest-request

All four are served by the localhost bridge in [ridgeServer.ts](C:/Users/cvane/V/apps/desktop/src/main/bridgeServer.ts).

## 5. Current admin features

- Settings tab for provider, hotkey, realtime suggestions, speech cleanup, memory, and history.
- Privacy tab for pause mode, selection-only mode, privacy indicator, excluded apps, and excluded domains.
- Memory center for examples, audiences, subjects, app rules, history, and now exclusions.
- Rules/onboarding UI for app packs and first-run setup.

## 6. Current marketing pages

- Minimal root README.
- Setup docs in [docs/SETUP.md](C:/Users/cvane/V/docs/SETUP.md).
- Extension setup docs in [docs/EXTENSION_SETUP.md](C:/Users/cvane/V/docs/EXTENSION_SETUP.md).
- Privacy docs in [docs/PRIVACY.md](C:/Users/cvane/V/docs/PRIVACY.md).

## 7. Current content system

- Static markdown docs only.
- Built-in app rules seeded from shared defaults in [packages/shared/src/utils/index.ts](C:/Users/cvane/V/packages/shared/src/utils/index.ts).

## 8. Current monetization system

- None detected. No billing, subscription, pricing, checkout, or upgrade implementation found in the repo.

## 9. Current analytics/events

- No analytics SDK, telemetry pipeline, or error-reporting service found.
- Optional local rewrite history exists in SQLite when enabled.

## 10. Current test coverage

- Desktop: 1 Vitest file.
- Shared: 2 Vitest files, 9 tests.
- Browser extension: 2 Vitest files, 4 tests.
- No end-to-end or bridge integration coverage detected.

## 11. Current deploy setup

- Windows desktop packaging through [electron-builder.json](C:/Users/cvane/V/apps/desktop/electron-builder.json).
- Detectable deploy target: NSIS installer in the local elease output directory.
- No hosted web deploy target or CI-driven release pipeline detected.

## 12. Known risks from the performance audit

- Root validation previously missed extension build and non-desktop type drift.
- Extension settings polling scaled with open visible tabs.
- Privacy exclusions were stored but not fully inspectable/removable in the memory UI.
- Hotkey latency still depends on PowerShell-spawned helper flows; only partial measurement exists.
- No instrumentation exists for activation, retention, or failure funnels.
