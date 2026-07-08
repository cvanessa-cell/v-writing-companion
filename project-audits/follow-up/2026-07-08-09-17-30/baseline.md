# Baseline

- Project working folder: `C:\Users\cvane\V`
- Project goal: implement the highest-confidence improvements from the July 8, 2026 performance audit so V is easier to ship, easier to operate, and easier to measure across desktop and browser rewrite flows.
- Latest performance audit: [`C:\Users\cvane\V\docs\performance-audit-2026-07-08.md`](C:\Users\cvane\V\docs\performance-audit-2026-07-08.md)

## 1. Project stack

- Monorepo with npm workspaces
- Electron desktop app in [`C:\Users\cvane\V\apps\desktop`](C:\Users\cvane\V\apps\desktop)
- Browser extension in [`C:\Users\cvane\V\apps\browser-extension`](C:\Users\cvane\V\apps\browser-extension)
- Shared TypeScript package in [`C:\Users\cvane\V\packages\shared`](C:\Users\cvane\V\packages\shared)
- Local SQLite-backed settings, memory, and diagnostics in [`C:\Users\cvane\V\apps\desktop\src\main\database.ts`](C:\Users\cvane\V\apps\desktop\src\main\database.ts)

## 2. Current scripts available

- Root: `dev`, `build`, `test`, `test:full`, `lint`, `env:audit`
- Desktop: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`, `package:dir`
- Browser extension: build plus split logic/DOM test paths

## 3. Current routes/pages

- Desktop panel view in [`C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx`](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx)
- Desktop settings view in [`C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx`](C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx)
- Browser popup built from [`C:\Users\cvane\V\apps\browser-extension\scripts\build.mjs`](C:\Users\cvane\V\apps\browser-extension\scripts\build.mjs)

## 4. Current API endpoints

- Local desktop IPC in [`C:\Users\cvane\V\apps\desktop\src\preload\index.ts`](C:\Users\cvane\V\apps\desktop\src\preload\index.ts)
- Local bridge handlers for rewrite, suggest, settings, and telemetry in [`C:\Users\cvane\V\apps\desktop\src\main\bridgeHandlers.ts`](C:\Users\cvane\V\apps\desktop\src\main\bridgeHandlers.ts)

## 5. Current admin features

- Local diagnostics summary and export
- Excluded app/domain controls
- Memory management and rewrite-history toggles
- Release-health verdicts in settings

## 6. Current marketing pages

- No dedicated consumer landing page in repo
- Main user-facing copy remains in [`C:\Users\cvane\V\README.md`](C:\Users\cvane\V\README.md)

## 7. Current content system

- Markdown docs under [`C:\Users\cvane\V\docs`](C:\Users\cvane\V\docs)
- No CMS or structured publishing pipeline

## 8. Current monetization system

- No billing, pricing, or entitlements surface detected

## 9. Current analytics/events

- Privacy-safe local diagnostics for desktop, extension, and renderer events
- Release-tagged metrics, funnel summaries, latency rollups, and domain outcomes in [`C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts`](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts)

## 10. Current test coverage

- Desktop Vitest unit tests
- Shared package Vitest tests
- Browser extension logic tests plus slower DOM suite behind `npm run test:full`

## 11. Current deploy setup

- Local build and packaging only
- Desktop packaging via `npm run package:dir -w @v/desktop`
- No hosted production deploy target detected

## 12. Known risks from the performance audit

- Desktop hotkey path is still dominated by PowerShell capture overhead
- Renderer timing visibility was missing before this run
- Packaging path was not checked into the repo before this run
- No consumer-facing landing or growth funnel exists yet
