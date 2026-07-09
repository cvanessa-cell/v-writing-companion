# Baseline

## Working context
- Project working folder: `C:\Users\cvane\V`
- Project goal: turn the July 9, 2026 performance audit into safe, measurable product improvements that make V easier to understand, validate, and operate.
- Latest performance audit: [`C:\Users\cvane\V\docs\performance-audit-2026-07-09.md`](C:\Users\cvane\V\docs\performance-audit-2026-07-09.md)

## 1. Project stack
- Workspace monorepo with npm workspaces
- Electron desktop app in `apps/desktop`
- Browser extension in `apps/browser-extension`
- Shared TypeScript package in `packages/shared`
- Local SQLite-backed diagnostics and settings in the desktop app

## 2. Current scripts available
- Root: `npm run dev`, `npm run build`, `npm run test`, `npm run test:full`, `npm run lint`, `npm run env:audit`
- Desktop: `dev`, `build`, `package:dir`, `preview`, `test`, `lint`
- Browser extension: fast logic tests plus separate DOM tests

## 3. Current routes/pages
- Desktop renderer surfaces: rewrite panel and settings window
- Settings tabs: general, privacy, memory, rules
- Extension popup: connection state plus first-value guidance

## 4. Current API endpoints
- Local bridge: `GET /health`, `POST /rewrite-request`, `POST /suggest-request`, `GET /settings`, `POST /event`
- Electron IPC: settings, diagnostics export, rewrite, replace, clipboard, onboarding, exclusions, and memory actions

## 5. Current admin features
- Local diagnostics dashboard with release verdicts, latency snapshots, funnel metrics, and packaging readiness
- Settings-based privacy controls, exclusions, activation scope, and bridge visibility

## 6. Current marketing pages
- No public landing page in-repo
- Current value surfaces are README, setup docs, extension popup, and settings onboarding

## 7. Current content system
- Markdown docs under `docs/`
- Setup, extension setup, privacy, audits, and comparison notes are file-based and versioned in git

## 8. Current monetization system
- No billing, pricing, entitlement, or checkout flows detected

## 9. Current analytics/events
- Local privacy-safe diagnostics store desktop, renderer, and extension events
- Key events already include launch, hotkey, rewrite, replace, bridge, activation, renderer-load, and suggestion acceptance milestones

## 10. Current test coverage
- Root lint, test, and build are available and passing on this run
- Desktop and shared packages use Vitest; browser extension has split logic and DOM coverage

## 11. Current deploy setup
- No hosted web deployment target detected
- Desktop release verification is local build and packaging readiness
- Git remote: `origin` -> `https://github.com/cvanessa-cell/v-writing-companion.git`

## 12. Known risks from the performance audit
- Desktop hotkey latency remains the largest user-visible performance issue
- No traced full `hotkey_triggered -> replace_succeeded` session yet
- No public first-success or onboarding surface existed beyond small in-product hints before this run
- Monetization remains intentionally undefined pending clearer repeated-value evidence

