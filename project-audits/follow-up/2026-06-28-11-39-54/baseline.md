# Baseline

PROJECT WORKING FOLDER:

[C:\Users\cvane\V](/C:/Users/cvane/V)

PROJECT GOAL:

Turn the June 28 performance audit into safe product improvements that reduce passive extension overhead, make local diagnostics more actionable for the owner, preserve the existing lazy-loaded settings work already in progress, and keep release status explicit.

LATEST PERFORMANCE AUDIT:

[C:\Users\cvane\V\docs\performance-audit-2026-06-28.md](/C:/Users/cvane/V/docs/performance-audit-2026-06-28.md)

## 1. Project stack

- npm workspaces monorepo
- Electron desktop app via `electron-vite`
- Browser extension built with `esbuild`
- Shared TypeScript package
- Local SQLite storage via `better-sqlite3`
- Local HTTP bridge for desktop-extension communication

## 2. Current scripts available

- Root: `dev`, `build`, `test`, `lint`
- Desktop: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`
- Browser extension: `build`, `test`, `lint`
- Shared: `test`, `test:watch`, `lint`

## 3. Current routes/pages

- Desktop renderer views: rewrite panel, settings window
- Browser extension surfaces: content script, popup

## 4. Current API endpoints

- Local bridge `GET /health`
- Local bridge `GET /settings`
- Local bridge `POST /rewrite-request`
- Local bridge `POST /suggest-request`
- Local bridge `POST /event`

## 5. Current admin features

- Provider and privacy controls in settings
- Memory center with exclusions and history review
- Local diagnostics card with export
- Desktop tray access to panel/settings/pause

## 6. Current marketing pages

- No product website or dedicated landing page in repo
- README and docs are the only install/value surfaces

## 7. Current content system

- Static markdown docs in `README.md` and `docs/*.md`
- No CMS, FAQ page, release notes surface, or content templates

## 8. Current monetization system

- No billing, pricing, entitlements, or checkout flows

## 9. Current analytics/events

- Local diagnostics event store in SQLite
- No remote analytics SDK
- No explicit onboarding funnel events

## 10. Current test coverage

- Root `lint`, `test`, and `build` pass
- Desktop: prompt tests only
- Shared: utility and prompt-phase tests
- Extension: field detection, typing monitor, domain access, overlay DOM tests

## 11. Current deploy setup

- Desktop packaging config in [C:\Users\cvane\V\apps\desktop\electron-builder.json](/C:/Users/cvane/V/apps/desktop/electron-builder.json)
- No confirmed working checked-in packaging or deployment command on current Node `24.15.0`

## 12. Known risks from the performance audit

- Desktop hotkey flow still depends on PowerShell process launches and fixed sleeps
- Extension manifest still injects broadly with `<all_urls>` and `all_frames`
- Diagnostics are local-only and still infer part of the funnel
- No install/demo/marketing surface exists outside repo docs
