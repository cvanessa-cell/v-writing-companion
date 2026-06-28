# Performance Audit - 2026-06-28

## Scope

- Active project folder: [C:\Users\cvane\V](C:\Users\cvane\V)
- Git state at audit start: `main...origin/main`
- HEAD at audit start: `de6ca4dc797e61f770ac4f5e605c8e417c6ccaf6`
- Dirty tree at audit start: tracked user edit in [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx) plus prior audit artifacts under `.assistant-runs`, `docs`, and `project-audits`
- Rollback checkpoint tag: `pre-performance-audit-2026-06-28-11-40-34`
- Recovery snapshot: [C:\Users\cvane\V\project-audits\follow-up\2026-06-28-11-40-34-recovery](C:\Users\cvane\V\project-audits\follow-up\2026-06-28-11-40-34-recovery)

## Project summary

V is a Windows writing companion with three active surfaces:

- Electron desktop app for hotkey capture, rewrite review, settings, diagnostics, and local memory
- Browser extension for in-field rewrite and suggestion flows
- Local bridge plus SQLite-backed local diagnostics

Most relevant files for this run:

- hotkey foreground-window lookup: [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:7](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L7)
- clipboard capture and replace path: [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:8](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L8)
- diagnostics aggregation: [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:221](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L221)
- diagnostics UI: [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:4](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L4)
- extension injection scope: [C:\Users\cvane\V\apps\browser-extension\manifest.json:12](C:\Users\cvane\V\apps\browser-extension\manifest.json#L12)

## Verification

### Quality gates

- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed

### Wall times from this run

- `npm run lint`: about `17.0 s`
- `npm run test`: about `38.7 s`
- `npm run build`: about `14.3 s`

### Current artifact sizes

- desktop main bundle: `71.24 kB`
- desktop preload bundle: `2.10 kB`
- renderer main bundle: `340.17 kB`
- deferred settings chunk: `32.93 kB`

### Current OS-interaction latency evidence

Bare PowerShell spawn samples on this machine during this run:

- `253.82 ms`
- `195.25 ms`
- `180.87 ms`
- `188.56 ms`
- `182.48 ms`

Average bare PowerShell spawn: `200.20 ms`

Interpretation:

- the machine baseline is still materially better than the older `1439.93 ms` cold sample
- the hotkey path still pays multiple process launches plus fixed sleeps before AI work begins, so the architectural bottleneck remains current

## What changed in this run

New measured code change landed:

- [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:99](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L99) now derives activation rate, rewrite success rate, replace success rate, extension engagement rate, time-to-first-success, and top domain outcomes from the existing local event store
- [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:42](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L42) now exposes those derived owner-facing metrics in the settings UI

Why this was the right safe improvement:

- it addressed a confirmed admin and analytics gap from the June 27 audit without touching the user’s in-progress renderer route split in `App.tsx`
- it makes the local diagnostics surface answer setup, activation, and domain-health questions directly instead of requiring raw event inspection

## Highest-leverage findings

### 1. Core product functionality and reliability: the desktop hotkey path still shells out for foreground-window lookup and input simulation

Evidence:

- active-window lookup still launches PowerShell in [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:38](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L38)
- copy/paste automation still launches PowerShell in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:14](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L14)
- the capture path still waits `150 ms` after copy in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:23](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L23)
- the replace path still waits `120 ms` after paste in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:56](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L56)
- bare process spawn averaged `200.20 ms` in this run before those extra waits

Why it matters:

- this is still the highest-confidence user-visible latency source in the product
- it also increases failure surface because clipboard and active-window behavior depend on multiple shell round-trips

Best next fix:

- replace PowerShell-backed active-window and SendKeys calls with a resident native helper or direct Win32 bindings

Success measure:

- p50 and p95 `hotkey_panel_ready`
- p50 and p95 `capture_selected`
- p50 and p95 `replace_selected_text`
- capture failure rate by reason

### 2. UI/UX and extension performance: the extension still injects into every page and every frame

Evidence:

- manifest still uses `<all_urls>` in [C:\Users\cvane\V\apps\browser-extension\manifest.json:14](C:\Users\cvane\V\apps\browser-extension\manifest.json#L14)
- manifest still enables `all_frames` in [C:\Users\cvane\V\apps\browser-extension\manifest.json:17](C:\Users\cvane\V\apps\browser-extension\manifest.json#L17)

Why it matters:

- it keeps passive browser overhead and compatibility risk broader than the product’s current validated flows require
- it increases support surface before there is domain-level evidence that every injected surface matters

Best next fix:

- keep wide permissions only if required, but gate nearly all initialization behind supported editable-field detection
- if product coverage allows it, disable iframe injection by default and restore it only for domains that prove necessary

Success measure:

- domain-level rewrite attempts, accepts, and failures from the new diagnostics rollups
- visible reduction in blocked or failed domain outcomes after scope narrowing

### 3. Admin and analytics pipeline: local diagnostics are now more decision-grade, but still need real funnel instrumentation

Evidence:

- the new summaries are computed in [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:258](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L258)
- the settings UI now surfaces activation rate, first success, success rates, and domain outcomes in [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:42](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L42)

What is still missing:

- there is still no explicit setup-complete or first-value event stream that separates launch, configuration, first hotkey, and first accepted result cleanly
- current rates are useful derived approximations, not a fully designed onboarding funnel

Best next fix:

- add explicit diagnostic events for provider connected, extension installed, first desktop rewrite requested, first extension rewrite requested, and first accepted result

Success measure:

- the owner can answer setup drop-off and first-value questions from events instead of inferred counts

### 4. Reliability pipeline: automated coverage still under-tests the riskiest browser behaviors

Evidence:

- `npm run test` passes, but browser-extension coverage still consists of only `3` files and `9` tests
- those tests cover field detection, typing monitor behavior, and domain access, not overlay accept/dismiss or bridge-unavailable rendering

Why it matters:

- the highest user-visible browser regressions are interaction and degraded-state flows
- test runtime is no longer the blocker, so the coverage gap is now the constraint

Best next fix:

- add DOM-level tests for suggestion overlay accept/dismiss and bridge-unavailable status overlay behavior

Success measure:

- extension test coverage expands without materially increasing the package runtime budget

### 5. Content and marketing pipeline: the repo still explains the product better than the product sells itself

Evidence:

- [C:\Users\cvane\V\README.md](C:\Users\cvane\V\README.md) explains capabilities and setup
- there is still no install funnel, product demo surface, or first-value flow outside repo documentation

Why it matters:

- the product can now measure local activation more clearly, but acquisition and onboarding still depend on developer-facing docs

Best next fix:

- build one lightweight install-and-value page with the 60-second path: install, connect provider, run one desktop rewrite, run one browser rewrite, confirm privacy controls

Success measure:

- the same journey is traceable end to end with the diagnostics funnel

### 6. Monetization pipeline: still correctly behind activation evidence

Evidence:

- no billing or entitlement code exists in the current repo
- local diagnostics have improved, but retention and repeated-use evidence are still not established

Best next fix:

- do not add checkout yet
- document a pricing hypothesis only after activation and repeat-use metrics are visible from the diagnostics surface

## Pipeline goals

### 1. Core product functionality

- make desktop capture and replace feel immediate and predictable by removing shell process overhead

### 2. Content pipeline

- create one repeatable demo/onboarding script that gets a user to first successful rewrite quickly

### 3. Marketing pipeline

- build one product-facing install and value surface instead of relying on repository docs

### 4. UI/UX pipeline

- narrow extension activation work and keep default paths lean

### 5. Admin pipeline

- continue turning raw local logs into owner-ready operational answers

### 6. Data/analytics pipeline

- add explicit funnel events so local rates become precise rather than inferred

### 7. Reliability/performance pipeline

- remove PowerShell from the hot path and expand DOM-level browser tests

### 8. Monetization/revenue pipeline

- defer monetization implementation until activation and repeat-use data exist

## Recommended implementation order

1. Replace PowerShell-backed foreground-window and SendKeys behavior with a resident native/helper path.
2. Add explicit setup and first-value diagnostic events on top of the new derived summaries.
3. Narrow extension activation scope through earlier field gating and reduced iframe/domain coverage.
4. Add DOM-level extension tests for overlay and bridge-failure flows.
5. Build one user-facing install/demo surface once setup and activation events are measurable.

## Files changed in this run

- [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts)
- [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx)

## Verification commands

```powershell
cd C:\Users\cvane\V
npm run lint
npm run test
npm run build
```
