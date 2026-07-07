# Performance Audit - 2026-06-27

## Scope

- Active project folder: [C:\Users\cvane\V](C:\Users\cvane\V)
- Git state at audit start: `main...origin/main`
- Working tree at audit start: untracked audit artifacts only under `.assistant-runs`, `docs`, and `project-audits`
- Rollback checkpoint tag created before edits: `pre-performance-audit-20260627-114947`
- Pre-change commit SHA: `6677c0f8729b2029fce577b5e1f67b9fadefb57a`

## Project summary

V is a Windows writing companion with three runtime surfaces:

- Electron tray app for hotkey capture, rewrite UI, settings, diagnostics, and local memory
- Browser extension for editable-field rewrite and suggestion flows
- Local HTTP bridge plus SQLite-backed local diagnostics and history

Most relevant files for this run:

- hotkey window lookup: [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts)
- clipboard capture and replace: [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts)
- diagnostics aggregation: [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts)
- renderer entry split point: [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx)
- extension injection scope: [C:\Users\cvane\V\apps\browser-extension\manifest.json](C:\Users\cvane\V\apps\browser-extension\manifest.json)

## Verification

### Quality gates

- `npm run build`: passed
- `npm run test`: passed
- `npm run lint`: passed

### Timings from this run

- `npm run build`: `17066 ms`
- `npm run test`: `30597 ms`
- `npm run lint`: `16412 ms`

### Current artifact sizes

Before this run's code split:

- renderer JS bundle: `362.24 kB`

After this run's code split:

- renderer main JS bundle: `339.77 kB`
- deferred settings chunk: `25.54 kB`
- desktop main bundle: `65.34 kB`
- desktop preload bundle: `2.10 kB`

Measured effect of the bundle split:

- rewrite-panel entry bundle reduced by `22.47 kB` (`6.2%`)
- settings/admin UI now loads on demand instead of in the default panel path

### Current OS-interaction latency evidence

Bare PowerShell process spawn samples on this machine:

- `277.55 ms`
- `172.78 ms`
- `152.83 ms`
- `161.41 ms`
- `200.24 ms`

Average bare PowerShell spawn in this run: `192.96 ms`

Interpretation:

- the machine-level baseline is better than the `881.04 ms` sample captured on June 26
- the architectural issue is still real because the desktop rewrite path still shells out multiple times and also waits an extra `150 ms` after copy and `120 ms` after paste

## What changed since 2026-06-26

Confirmed improvements that should no longer be treated as current regressions:

- root `build`, `test`, and `lint` are still green
- extension test runtime remains low after the environment split
- local diagnostics and diagnostics UI are still present
- modal extension rewrite review is still gone

New improvement landed during this audit:

- settings/admin UI is now lazy-loaded from [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx:1](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx#L1)

## Highest-leverage findings

### 1. Core functionality and reliability: the desktop hotkey path still depends on per-interaction PowerShell

Evidence:

- foreground-window lookup shells out in [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:38](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L38)
- copy and paste automation shell out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:14](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L14)
- copy flow still waits `150 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:23](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L23)
- paste flow still waits `120 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:56](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L56)

Why it matters:

- even with current faster process spawn times, the path still pays multiple shell launches plus fixed sleeps before AI work starts
- this remains the highest-confidence source of user-visible latency and capture fragility

Best next fix:

- replace PowerShell calls with a resident native helper or direct Win32 bindings for active-window lookup and input simulation

Success measure:

- p50 and p95 hotkey-to-panel latency
- p50 and p95 replace latency
- capture failure rate by reason

### 2. UI/UX and performance: the extension still injects everywhere

Evidence:

- content script matches `<all_urls>` in [C:\Users\cvane\V\apps\browser-extension\manifest.json:14](C:\Users\cvane\V\apps\browser-extension\manifest.json#L14)
- content script still runs in all frames in [C:\Users\cvane\V\apps\browser-extension\manifest.json:17](C:\Users\cvane\V\apps\browser-extension\manifest.json#L17)

Why it matters:

- this keeps compatibility risk, support surface, and passive browser overhead higher than necessary
- now that modal rewrite review has been fixed, scope control is the next extension lever

Best next fix:

- keep manifest coverage broad only if required, but gate almost all initialization behind supported editable-field detection
- if priority flows allow it, narrow matches or disable iframe injection except for domains that require it

Success measure:

- supported-field activation rate
- per-domain rewrite attempts and failures
- injection count per browsing session

### 3. Data and admin pipeline: diagnostics exist, but they are still local snapshots rather than an operational dashboard

Evidence:

- diagnostics are persisted and summarized in [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:74](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L74)
- the summary currently reports counts, recent failures, and latency aggregates from the last 7 days in [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:113](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L113)

Why it matters:

- the project is now measurable locally, but still lacks decision-grade views for onboarding success, extension adoption by domain, or trend changes after releases

Best next fix:

- add lightweight derived summaries for first-successful-rewrite time, rewrite success rate, domain buckets, and onboarding completion rate
- keep storage local by default and make export the primary sharing path

Success measure:

- the owner can answer setup, activation, and failure questions from the settings screen without reading raw events

### 4. Reliability pipeline: test coverage is fast again, but still thin on the riskiest browser flows

Evidence:

- root tests pass in about `30.6s`
- browser-extension tests now finish in about `1.61s`, but they still cover only `4` tests

Why it matters:

- runtime overhead is no longer the blocker
- the real gap has shifted to limited coverage for content-script interaction, overlay behavior, and bridge-unavailable cases

Best next fix:

- add a focused DOM-level test file for overlay accept/dismiss and bridge error UI
- keep pure logic tests on `node`

Success measure:

- coverage expands without regressing extension package runtime beyond a small, intentional DOM-test budget

### 5. UI/UX pipeline: panel startup was carrying settings/admin code unnecessarily

Evidence:

- before this run, the renderer shipped as one `362.24 kB` JS bundle for both panel and settings
- [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx:4](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx#L4) now lazy-loads settings
- after the change, the panel entry bundle is `339.77 kB` with a separate `25.54 kB` settings chunk

What changed:

- implemented route-level lazy loading for settings/admin UI during this audit

Why it matters:

- the default hotkey panel path now avoids loading settings-only UI code up front
- this is a small but real improvement while larger hot-path work remains pending

### 6. Marketing and content pipeline: product explanation is still developer-oriented

Evidence:

- [C:\Users\cvane\V\README.md](C:\Users\cvane\V\README.md) explains setup and capability, but there is still no landing page, install funnel, demo page, or recorded first-value path in the repo

Why it matters:

- the product can now measure local behavior, but acquisition and onboarding still have no user-facing surface

Best next fix:

- create one install-and-value page with a 60-second first rewrite flow, privacy positioning, and desktop-plus-browser examples

Success measure:

- onboarding completion and first rewrite can be traced from a single install surface

### 7. Monetization pipeline: still intentionally premature

Evidence:

- no billing or entitlements exist in the current codebase
- activation instrumentation is only now becoming usable

Best next fix:

- do not build checkout yet
- document one pricing hypothesis only after activation and retention evidence exist

## Pipeline goals

### 1. Core product functionality

- make hotkey capture and replace feel immediate and predictable

### 2. Content pipeline

- create one repeatable onboarding/demo script that demonstrates first value quickly

### 3. Marketing pipeline

- build one product-facing install/value surface rather than relying on repo docs

### 4. UI/UX pipeline

- keep the rewrite panel lean
- reduce unnecessary extension activation work

### 5. Admin pipeline

- elevate diagnostics from raw summaries into owner-facing operational answers

### 6. Data/analytics pipeline

- add derived local funnel and domain summaries on top of the existing event store

### 7. Reliability/performance pipeline

- remove PowerShell from the hot path
- add focused DOM coverage for browser behavior

### 8. Monetization/revenue pipeline

- defer pricing implementation until activation evidence exists

## Recommended implementation order

1. Replace PowerShell-backed foreground-window and SendKeys operations with a resident native/helper path.
2. Add derived diagnostics for first-successful-rewrite, success rate, and domain-level extension outcomes.
3. Narrow extension activation cost through earlier field gating or reduced iframe/domain scope.
4. Add DOM-level extension tests for overlay review and bridge-failure states.
5. Build one user-facing install/demo funnel once diagnostics can measure it.

## Files changed in this run

- [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx)

## Verification commands

```powershell
cd C:\Users\cvane\V
npm run build
npm run test
npm run lint
```
