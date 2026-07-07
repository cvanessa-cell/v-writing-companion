# Baseline

## Working context

- Project working folder: `C:\Users\cvane\V`
- Project goal: turn the July 6 audit into a safe improvement that makes release health, first-success progress, and owner decision-making clearer without destabilizing the desktop or extension flows.
- Latest performance audit: [`C:\Users\cvane\V\docs\performance-audit-2026-07-06.md`](C:\Users\cvane\V\docs\performance-audit-2026-07-06.md)

## Audit grounding

The latest audit identified six priority themes:

1. Desktop hotkey latency is still dominated by per-interaction PowerShell.
2. Extension activation still starts from broad page injection.
3. Diagnostics collect useful events but stop short of an owner-facing release verdict.
4. Renderer cost is not yet separated from desktop capture cost.
5. Consumer onboarding proof is still mostly developer-facing.
6. Monetization should wait until repeated-value cohorts are clearer.

## Project stack

- Monorepo: npm workspaces
- Desktop app: Electron + React + TypeScript
- Browser surface: Chrome extension, Manifest V3, TypeScript, esbuild
- Shared package: TypeScript helpers and prompts
- Local storage: SQLite via `better-sqlite3`
- Validation: TypeScript linting plus Vitest

## Current scripts available

- Root: `npm run dev`, `npm run build`, `npm run test`, `npm run test:full`, `npm run lint`
- Desktop: `npm run dev -w @v/desktop`, `npm run build -w @v/desktop`, `npm run test -w @v/desktop`, `npm run lint -w @v/desktop`
- Shared: `npm run test -w @v/shared`, `npm run lint -w @v/shared`
- Extension: `npm run build -w @v/browser-extension`, `npm run test -w @v/browser-extension`, `npm run test:dom -w @v/browser-extension`, `npm run lint -w @v/browser-extension`

## Current routes and pages

- Desktop renderer views:
  - rewrite panel via [`C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx`](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx)
  - settings window via [`C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx`](C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx)
- Extension pages:
  - popup from [`C:\Users\cvane\V\apps\browser-extension\manifest.json`](C:\Users\cvane\V\apps\browser-extension\manifest.json)
  - content script on supported pages/frames

## Current API endpoints

- Local bridge routes started in [`C:\Users\cvane\V\apps\desktop\src\main\index.ts`](C:\Users\cvane\V\apps\desktop\src\main\index.ts):
  - rewrite
  - suggest
  - settings
  - track
- Desktop IPC handlers exposed for capture, rewrite, replace, settings, exclusions, memory, diagnostics export, and settings navigation.

## Current admin features

- Local settings dashboard
- Diagnostics summary with release-aware counts and recent events
- Excluded app and domain controls
- Memory and rule management

## Current marketing pages

- No dedicated consumer landing page in this repo
- README and setup docs still function as the closest install/value surface

## Current content system

- Markdown docs under `docs/`
- No CMS or structured publishing workflow

## Current monetization system

- No billing, checkout, entitlements, or pricing flow in repo

## Current analytics and events

- Privacy-safe local diagnostics in SQLite
- Desktop, extension, and renderer events logged through [`C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts`](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts)

## Current test coverage

- Desktop Vitest unit tests
- Shared Vitest unit tests
- Extension logic tests and separate DOM suite
- No native Windows end-to-end latency trace in repo

## Current deploy setup

- Local desktop packaging config via [`C:\Users\cvane\V\apps\desktop\electron-builder.json`](C:\Users\cvane\V\apps\desktop\electron-builder.json)
- No cloud deploy target detected

## Known risks from the performance audit

- Desktop first-value experience still carries high pre-model latency.
- Extension scope is still broad at injection time.
- Release comparison quality depends on version-tagged diagnostics existing locally.
- Consumer-facing onboarding proof still needs a dedicated surface outside developer docs.
