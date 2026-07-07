# Performance Audit - 2026-06-25

## Scope

- Active project folder: [`C:\Users\cvane\V`](C:/Users/cvane/V)
- Git state at audit start: `main...origin/main`
- Pre-existing dirty state was present and left intact, including edits in:
  - [`C:\Users\cvane\V\apps\desktop\src\main\index.ts`](C:/Users/cvane/V/apps/desktop/src/main/index.ts)
  - [`C:\Users\cvane\V\README.md`](C:/Users/cvane/V/README.md)
  - [`C:\Users\cvane\V\package.json`](C:/Users/cvane/V/package.json)
  - [`C:\Users\cvane\V\apps\browser-extension\package.json`](C:/Users/cvane/V/apps/browser-extension/package.json)
  - [`C:\Users\cvane\V\packages\shared\package.json`](C:/Users/cvane/V/packages/shared/package.json)

## Project Summary

V is a Windows writing companion with four main surfaces:

- Electron desktop app for tray, hotkey capture, rewrite panel, and settings
- Browser extension that injects rewrite controls into text fields
- Local bridge between extension and desktop app
- Local SQLite memory/privacy layer for preferences, exclusions, and optional history

Primary files inspected:

- desktop hotkey path: [`C:\Users\cvane\V\apps\desktop\src\main\index.ts`](C:/Users/cvane/V/apps/desktop/src/main/index.ts)
- active-window lookup: [`C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts`](C:/Users/cvane/V/apps/desktop/src/main/activeWindow.ts)
- clipboard/send-keys path: [`C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts`](C:/Users/cvane/V/apps/desktop/src/main/clipboard.ts)
- extension injection path: [`C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts`](C:/Users/cvane/V/apps/browser-extension/src/contentScript.ts)
- extension manifest: [`C:\Users\cvane\V\apps\browser-extension\manifest.json`](C:/Users/cvane/V/apps/browser-extension/manifest.json)
- privacy/admin memory UI: [`C:\Users\cvane\V\apps\desktop\src\renderer\components\MemoryCenter.tsx`](C:/Users/cvane/V/apps/desktop/src/renderer/components/MemoryCenter.tsx)

## Verification

### Quality gates

- `npm run lint`: passed in `77780 ms`
- `npm run build`: passed in `61976 ms`
- `npm run test`: passed in `57270 ms`

### Build artifacts

- desktop main bundle: `54.66 kB`
- desktop preload bundle: `1.94 kB`
- desktop renderer JS bundle: `354753` bytes
- browser extension content script: `139783` bytes

### Measured latency evidence

- bare `powershell.exe -NoProfile -NonInteractive -Command "[void]0"` startup: `1439.93 ms`
- `5` sequential bare PowerShell launches: `13662.49 ms`

This is materially slower than the earlier same-day measurement stored in automation memory, so treat the hotkey path as the current highest-confidence latency risk on this machine.

## Fixes Landed During This Run

### 1. Root validation is green again

Resolved issues:

- fixed desktop TypeScript failures in:
  - [`C:\Users\cvane\V\apps\desktop\src\main\aiProvider.ts`](C:/Users/cvane/V/apps/desktop/src/main/aiProvider.ts)
  - [`C:\Users\cvane\V\apps\desktop\src\renderer\components\RewritePanel.tsx`](C:/Users/cvane/V/apps/desktop/src/renderer/components/RewritePanel.tsx)
- fixed extension TypeScript event-target narrowing in:
  - [`C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts`](C:/Users/cvane/V/apps/browser-extension/src/contentScript.ts)

Result:

- root `lint`, `build`, and `test` now pass from [`C:\Users\cvane\V\package.json`](C:/Users/cvane/V/package.json)

### 2. Privacy exclusions are now inspectable in the UI

Resolved gap:

- the desktop memory UI now exposes excluded apps/domains from:
  - [`C:\Users\cvane\V\apps\desktop\src\renderer\components\MemoryCenter.tsx`](C:/Users/cvane/V/apps/desktop/src/renderer/components/MemoryCenter.tsx)

Result:

- users can review and delete exclusions that previously only existed in storage/backend payloads

### 3. Setup docs now match the root build path

Resolved mismatch:

- [`C:\Users\cvane\V\docs\SETUP.md`](C:/Users/cvane/V/docs/SETUP.md) now reflects that root `npm run build` produces both desktop and extension outputs

## Highest-Leverage Remaining Findings

### 1. Reliability/performance pipeline: hotkey latency is still dominated by external process spawning

Evidence:

- hotkey flow does `getActiveWindow()` before text capture in [`C:\Users\cvane\V\apps\desktop\src\main\index.ts:143`](C:/Users/cvane/V/apps/desktop/src/main/index.ts:143)
- active window lookup shells out to PowerShell and compiles Win32 interop at runtime in [`C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:7`](C:/Users/cvane/V/apps/desktop/src/main/activeWindow.ts:7)
- capture/replace both shell out again via `sendKeys()` in [`C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:8`](C:/Users/cvane/V/apps/desktop/src/main/clipboard.ts:8)
- `captureSelectedText()` also has an explicit `150 ms` wait and replace has an explicit `120 ms` wait in [`clipboard.ts`](C:/Users/cvane/V/apps/desktop/src/main/clipboard.ts)
- bare process startup alone measured `1439.93 ms`

Why this matters:

- user-perceived delay happens before any AI request starts
- the current architecture can spend multiple seconds on focus/copy/paste mechanics even when the model is fast

Highest-leverage fix:

- replace PowerShell round-trips on the hotkey path with a native module, a long-lived helper process, or a single resident automation bridge
- instrument exact timestamps around:
  - hotkey pressed
  - active window resolved
  - capture started/completed
  - panel rendered
  - AI request started/completed
  - replace started/completed

Success measure:

- p50/p95 hotkey-to-panel time
- p50/p95 replace completion time
- number of failed capture/replace operations by cause

### 2. UI/UX pipeline: extension interaction still feels like a prototype and increases site-compatibility risk

Evidence:

- extension still injects on all URLs and all frames in [`C:\Users\cvane\V\apps\browser-extension\manifest.json:14`](C:/Users/cvane/V/apps/browser-extension/manifest.json:14)
- content script still relies on blocking `alert()` and `confirm()` in [`C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:119`](C:/Users/cvane/V/apps/browser-extension/src/contentScript.ts:119)
- visibility-aware settings polling is now in place, so the old “poll every tab forever” finding is no longer the right top issue; the bigger remaining risk is broad injection plus modal UX

Why this matters:

- broad injection raises support burden and unexpected-site behavior risk
- browser modal dialogs feel unpolished compared with the desktop product promise

Highest-leverage fix:

- replace `alert()` and `confirm()` with an inline mini review tray or suggestion card
- reduce extension activation surface by gating earlier on editable fields and testing whether `<all_urls>` can be narrowed without breaking key flows
- add local counters for:
  - button injected
  - rewrite requested
  - rewrite accepted
  - rewrite dismissed
  - bridge unavailable

Success measure:

- lower injection footprint
- lower bridge-error rate
- measurable rewrite acceptance rate from extension

### 3. Data/analytics pipeline: there is still no real product instrumentation

Evidence:

- repo search found no runtime analytics or error-reporting SDK usage
- local history exists, but it is optional and off by default in [`C:\Users\cvane\V\apps\desktop\src\main\database.ts:124`](C:/Users/cvane/V/apps/desktop/src/main/database.ts:124)
- current storage tracks content/memory, not funnel metrics

Why this matters:

- product, marketing, and monetization decisions remain speculative
- there is no measured answer to “what blocks first value?”

Highest-leverage fix:

- add privacy-safe local event logging first, with export support before any remote analytics decision
- minimum events:
  - app first launch
  - onboarding completed
  - provider configured
  - first successful rewrite
  - replace attempted / succeeded / failed
  - extension connected
  - suggestion shown / accepted / dismissed
  - bridge unavailable

Success measure:

- daily local activation funnel visible in settings/admin UI
- error counts grouped by stage

### 4. Marketing/content pipeline: positioning exists, but the acquisition surface is still thin

Evidence:

- README is clearer than the earlier audit snapshot, but it is still a developer-facing setup document rather than a conversion surface: [`C:\Users\cvane\V\README.md`](C:/Users/cvane/V/README.md)
- no landing page, demo capture flow, pricing page, or in-repo acquisition funnel was found

Why this matters:

- there is no clear path from curiosity to install to first rewrite to upgrade hypothesis

Highest-leverage fix:

- create one concise product landing surface focused on:
  - what V does
  - where it works
  - privacy defaults
  - first successful rewrite in under one minute
- capture one short demo of desktop hotkey and one browser-field rewrite flow

Success measure:

- install page exists
- onboarding completion and first rewrite can be measured

### 5. Monetization/revenue pipeline: still not ready for pricing decisions

Evidence:

- repo search found no billing, plans, checkout, subscription, or entitlement logic

Why this matters:

- pricing work before activation instrumentation would be guesswork

Highest-leverage fix:

- delay full billing work until activation metrics exist
- define one concrete packaging hypothesis first:
  - free local rewrite companion
  - paid premium for persistent memory, advanced suggestions, or team rules

Success measure:

- one pricing hypothesis documented
- activation and retention baselines in hand before checkout buildout

## Pipeline-by-Pipeline Goals

### 1. Core product functionality

- instrument and shorten hotkey-to-panel and replace flows
- reduce failure cases in copy/paste automation

### 2. Content pipeline

- add one canonical demo script and one demo capture flow for onboarding and marketing reuse

### 3. Marketing pipeline

- ship one product landing surface with a clear privacy/value proposition

### 4. UI/UX pipeline

- replace extension blocking dialogs with inline review UI
- make first successful rewrite the only primary first-run path

### 5. Admin pipeline

- keep expanding local diagnostics in settings for exclusions, bridge health, and event counters

### 6. Data/analytics pipeline

- add privacy-safe local event logging and exportable summaries

### 7. Reliability/performance pipeline

- eliminate per-interaction PowerShell spawning
- keep root `lint`, `build`, `test` green in CI and locally

### 8. Monetization/revenue pipeline

- document one pricing hypothesis only after activation instrumentation lands

## Recommended Implementation Order

1. Instrument and reduce hotkey-path latency in the desktop app.
2. Replace extension `alert/confirm` flow with inline review UI and measure acceptance.
3. Add local activation/error analytics in the desktop app.
4. Build one clear install/demo/positioning surface.
5. Revisit packaging and monetization after activation data exists.

## Files Changed During This Audit

- [`C:\Users\cvane\V\apps\desktop\src\main\aiProvider.ts`](C:/Users/cvane/V/apps/desktop/src/main/aiProvider.ts)
- [`C:\Users\cvane\V\apps\desktop\src\renderer\components\RewritePanel.tsx`](C:/Users/cvane/V/apps/desktop/src/renderer/components/RewritePanel.tsx)
- [`C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts`](C:/Users/cvane/V/apps/browser-extension/src/contentScript.ts)
- [`C:\Users\cvane\V\docs\SETUP.md`](C:/Users/cvane/V/docs/SETUP.md)

## Verification Commands

```powershell
cd C:\Users\cvane\V
npm run lint
npm run build
npm run test
```
