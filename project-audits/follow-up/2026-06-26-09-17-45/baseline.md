# Baseline

PROJECT WORKING FOLDER:

[C:\Users\cvane\V](/C:/Users/cvane/V)

PROJECT GOAL:

Instrument the desktop and extension rewrite pipeline, expose local diagnostics to the owner, replace the extension's modal rewrite flow with inline review, and cut extension test overhead without disturbing the existing in-progress desktop-main edits.

LATEST PERFORMANCE AUDIT:

[C:\Users\cvane\V\docs\performance-audit-2026-06-26.md](/C:/Users/cvane/V/docs/performance-audit-2026-06-26.md)

## 1. Project stack

- Monorepo with npm workspaces
- Electron + React + TypeScript desktop app in [apps/desktop](/C:/Users/cvane/V/apps/desktop)
- Manifest v3 browser extension in [apps/browser-extension](/C:/Users/cvane/V/apps/browser-extension)
- Shared TypeScript package in [packages/shared](/C:/Users/cvane/V/packages/shared)
- Local SQLite persistence via `better-sqlite3`

## 2. Current scripts available

- Root: `dev`, `build`, `test`, `lint`
- Desktop: `dev`, `build`, `preview`, `test`, `lint`
- Extension: `build`, `test`, `lint`
- Shared: `test`, `lint`

## 3. Current routes/pages

- Desktop renderer panel view via `?view=panel`
- Desktop settings view via `?view=settings`
- Extension popup via [apps/browser-extension/popup.html](/C:/Users/cvane/V/apps/browser-extension/popup.html)

## 4. Current API endpoints

- `GET /health`
- `GET /settings`
- `POST /rewrite-request`
- `POST /suggest-request`
- `POST /event`

## 5. Current admin features

- Desktop settings for provider, hotkey, privacy, exclusions, realtime suggestions
- Memory Center for examples, history, exclusions, and style reset
- New local diagnostics card for recent events, failures, and latencies

## 6. Current marketing pages

- No user-facing landing page or pricing page in repo
- README is still the primary positioning surface

## 7. Current content system

- Static docs in [docs](/C:/Users/cvane/V/docs)
- No CMS or structured publishing workflow

## 8. Current monetization system

- None detected

## 9. Current analytics/events

- New local-only diagnostics events persisted to SQLite
- No remote analytics SDK or hosted dashboard

## 10. Current test coverage

- Desktop prompt tests
- Shared utility/prompt tests
- Extension field detector and typing monitor tests

## 11. Current deploy setup

- Local Electron build output via `electron-vite`
- NSIS packaging config in [apps/desktop/electron-builder.json](/C:/Users/cvane/V/apps/desktop/electron-builder.json)
- No working checked-in release script

## 12. Known risks from the performance audit

- Hotkey path still depends on PowerShell-backed active-window and clipboard helpers
- Extension still injects broadly on `<all_urls>` and `all_frames`
- No remote analytics or operational dashboard
