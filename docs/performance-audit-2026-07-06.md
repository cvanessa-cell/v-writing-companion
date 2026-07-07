# Performance Audit - 2026-07-06

## Scope

- Active project folder: [C:\Users\cvane\V](C:\Users\cvane\V)
- Git state at audit start: `main...origin/main`
- Current commit SHA: `2405bef2dd187c7a06dc61b9d2afe1b6fc74df53`
- Remote: `origin` -> `https://github.com/cvanessa-cell/v-writing-companion.git`
- Working tree at audit start: untracked audit artifacts only under `.assistant-runs`, `docs`, and `project-audits`
- Rollback checkpoint: not created in this run because this was an audit-only pass with no source edits

## Project working folder review

V is still a three-surface Windows writing product:

- Electron desktop app for hotkey capture, rewrite UI, settings, memory, and diagnostics
- Browser extension for in-field rewrite and suggestion flows
- Local bridge plus local SQLite-backed diagnostics/history storage

Most relevant current files:

- desktop hotkey path: [C:\Users\cvane\V\apps\desktop\src\main\index.ts:144](C:\Users\cvane\V\apps\desktop\src\main\index.ts#L144)
- desktop active-window lookup: [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:7](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L7)
- desktop clipboard capture/replace: [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:8](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L8)
- extension injection policy: [C:\Users\cvane\V\apps\browser-extension\manifest.json:12](C:\Users\cvane\V\apps\browser-extension\manifest.json#L12)
- extension runtime/bootstrap logic: [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:59](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L59)
- diagnostics storage and summaries: [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:229](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L229)
- diagnostics UI: [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:16](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L16)

## Verification and measurements

### Quality gates

- `npm run build`: passed in `12564.07 ms`
- `npm run test`: passed in `19596.92 ms`
- `npm run lint`: passed in `10200.49 ms`
- `npm run test:full`: passed; browser-extension logic suite took `1.29 s`, DOM suite took `919 ms`

### Build artifacts from this run

- desktop main bundle: `74.42 kB`
- desktop preload bundle: `2.10 kB`
- renderer entry bundle: `340.17 kB`
- deferred settings bundle: `38.43 kB`
- extension build completed successfully to `apps/browser-extension/dist`

### Desktop hot-path timing evidence

Measured in this run with direct `powershell.exe` timing samples:

- bare PowerShell spawn samples: `131.55`, `119.19`, `119.51`, `115.77`, `118.10` ms
- bare PowerShell spawn average: `120.82 ms`
- active-window PowerShell script samples: `488.95`, `387.75`, `441.02`, `378.19`, `436.31` ms
- active-window PowerShell script average: `426.44 ms`
- SendKeys copy script samples: `403.60`, `307.64`, `324.76`, `405.04`, `287.06` ms
- SendKeys copy script average: `345.62 ms`

Code-confirmed fixed waits still present:

- capture waits `150 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:23](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L23)
- replace waits `120 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:56](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L56)

Inference from those measurements:

- the desktop hotkey path still has a non-model floor of about `922.06 ms` before panel render and AI latency even start: active-window lookup (`426.44 ms`) + SendKeys capture shell (`345.62 ms`) + fixed capture wait (`150 ms`)
- the replace path still adds about `465.62 ms`: SendKeys shell (`345.62 ms`) + fixed replace wait (`120 ms`)
- combined user-visible desktop overhead is still about `1.39 s` before model/network variability

That combined number is an inference from isolated timings rather than a traced real rewrite session, but it is grounded in the current code path and fresh measurements.

## What changed since the June 29 audit

Three June concerns are no longer current top regressions:

- extension idle polling is already gated on `pageHasSupportedField` and visibility in [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:103](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L103)
- diagnostics are now release-aware through [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:229](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L229) and surfaced in [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:111](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L111)
- the default extension test loop is no longer the main validation bottleneck because [C:\Users\cvane\V\apps\browser-extension\package.json:8](C:\Users\cvane\V\apps\browser-extension\package.json#L8) now runs only the logic suite by default

That shifts the priority stack toward desktop interaction latency, extension scope, and product instrumentation quality rather than root validation speed.

## Highest-leverage findings

### 1. Core product functionality and reliability: desktop rewrites are still dominated by per-interaction PowerShell

Evidence:

- every hotkey still shells out for active-window detection in [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:37](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L37)
- capture shells out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:22](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L22)
- replace shells out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:55](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L55)
- the desktop hotkey flow still serializes `getActiveWindow()`, `captureSelectedText()`, and panel show in [C:\Users\cvane\V\apps\desktop\src\main\index.ts:144](C:\Users\cvane\V\apps\desktop\src\main\index.ts#L144)
- fresh measurements still put non-model overhead near `1.39 s`

Why it matters:

- this is still the most direct source of perceived slowness at the product's core interaction moment
- it hurts trust, repeated use, and the product's ability to feel distinctly better than copying text into a web chat

Highest-leverage fix:

- replace PowerShell-based active-window lookup plus SendKeys copy/paste with direct Win32 bindings in the Electron main process or a long-lived helper process
- remove fixed sleeps once capture/replace completion can be detected explicitly

Success measure:

- add end-to-end diagnostics for `hotkey_triggered`, `active_window_resolved`, `capture_selected`, `hotkey_panel_ready`, and `replace_succeeded`
- target sub-`250 ms` p50 pre-model capture overhead and sub-`150 ms` replace overhead

### 2. Reliability, UX, and marketing: the extension still injects broad runtime coverage into every page and every frame

Evidence:

- manifest still injects on `"<all_urls>"` in [C:\Users\cvane\V\apps\browser-extension\manifest.json:14](C:\Users\cvane\V\apps\browser-extension\manifest.json#L14)
- manifest still uses `all_frames: true` in [C:\Users\cvane\V\apps\browser-extension\manifest.json:17](C:\Users\cvane\V\apps\browser-extension\manifest.json#L17)
- the content script still bootstraps global listeners for `focusin`, `input`, `scroll`, `focusout`, and `visibilitychange` in [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:387](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L387)
- the injected script still creates button/overlay runtime in-page once a field is encountered in [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:343](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L343)

Why it matters:

- even with better gating, the product still behaves like a broad injector rather than a tightly activated assistant
- that increases compatibility risk and weakens the marketing claim that V is lightweight

Highest-leverage fix:

- split the extension into a tiny bootstrap plus deferred full runtime
- keep the current telemetry, but only load overlay/suggestion/rewrite logic after a supported editable field is found
- re-evaluate whether `all_frames` is truly needed everywhere or can be narrowed by allowlist/domain heuristics

Success measure:

- compare `content_script_bootstrapped`, `supported_field_seen`, and `full_runtime_activated` counts by version and by domain
- add built bootstrap-vs-runtime bundle sizes to release notes

### 3. Data, admin, and product pipeline: diagnostics are stronger, but they still stop short of an owner-facing decision layer

Evidence:

- diagnostics now store version metadata and latency rollups in [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:276](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L276)
- settings already expose recent health, funnel, latency, domain outcomes, and current-release summaries in [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:33](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L33)
- the diagnostics UI still stops at raw summaries and a clipboard JSON export in [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:25](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L25)
- no repo artifact surfaced in this audit provides a release checklist, onboarding conversion view, or "regressed since last version" callout

Why it matters:

- the owner can inspect local health, but still cannot quickly decide whether a release improved activation, first success, or extension usefulness
- measurement exists, but the product-management layer is still manual

Highest-leverage fix:

- add one owner-focused diagnostics summary card that answers: "Did this release improve first-success rate, desktop latency, and extension activation efficiency?"
- highlight deltas against the previous tagged version, not just absolute current counts

Success measure:

- the owner can open settings and see a release health verdict without exporting JSON or manually comparing counters

### 4. UI/UX pipeline: the panel bundle is still heavier than the immediate hotkey experience needs

Evidence:

- current renderer entry bundle is `340.17 kB`
- settings are lazy-loaded, but the main renderer still ships a large default entry and eagerly loads the panel path through [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx:1](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx#L1)
- the panel opens on the same hot path that is already paying the desktop capture cost

Uncertainty:

- this audit did not trace renderer parse/paint time separately, so bundle cost is a code-and-build artifact signal rather than a measured panel-open regression

Highest-leverage fix:

- instrument `panel_renderer_loaded` and `first_option_rendered`
- then split any non-essential panel sections or deferred helpers that are not required for the first interactive state

Success measure:

- panel-open trace distinguishes desktop capture latency from renderer load/render latency

### 5. Content and marketing pipeline: onboarding proof is still mostly developer-facing

Evidence:

- repo inventory still points developers to [C:\Users\cvane\V\README.md](C:\Users\cvane\V\README.md), [C:\Users\cvane\V\docs\SETUP.md](C:\Users\cvane\V\docs\SETUP.md), and [C:\Users\cvane\V\docs\EXTENSION_SETUP.md](C:\Users\cvane\V\docs\EXTENSION_SETUP.md)
- this audit found no dedicated consumer-facing landing page, install walkthrough, or activation checklist artifact in the repo tree
- diagnostics already expose the core funnel signals needed to define "first successful rewrite" in product terms

Why it matters:

- the product may work locally, but the owner still lacks one proof surface that explains value quickly and ties it to measurable activation

Highest-leverage fix:

- create one simple onboarding surface and checklist tied to a measurable first-value flow: desktop rewrite success, extension connection, and first accepted rewrite

Success measure:

- "time to first successful rewrite" becomes both a product metric and a user-facing promise

### 6. Monetization pipeline: billing should still wait, but usage segmentation is now close enough to define a pricing hypothesis

Evidence:

- no billing or entitlements surface exists in the current repo inventory
- release-aware diagnostics now provide enough local evidence to segment desktop rewrites, extension activations, and accepted suggestions

Why it matters:

- the repo is still earlier-stage than checkout work, but it is now close to measuring which behavior would justify a paid tier

Highest-leverage fix:

- define one monetization hypothesis around repeated successful usage, not around installation count
- do not implement payments until diagnostics can show repeated-value cohorts cleanly

Success measure:

- pricing discussions reference measured repeat usage and success patterns rather than intuition

## Pipeline goals for the next implementation pass

### 1. Core product functionality

- remove PowerShell from the desktop hotkey path and re-measure end-to-end latency

### 2. Content pipeline

- turn "first successful rewrite" into a documented, measurable onboarding checkpoint

### 3. Marketing pipeline

- create one consumer-facing value/install surface instead of relying on developer docs only

### 4. UI/UX pipeline

- reduce extension activation scope and instrument panel render cost separately from desktop capture cost

### 5. Admin pipeline

- add release verdicts and version-over-version deltas on top of the existing diagnostics summaries

### 6. Data/analytics pipeline

- keep the current privacy-safe local metrics, then add previous-version comparisons and panel render timings

### 7. Reliability/performance pipeline

- preserve the now-fast root validation loop and focus performance work on the user-visible desktop and extension paths

### 8. Monetization/revenue pipeline

- define pricing only after repeated-value cohorts are visible in diagnostics

## Recommended implementation order

1. Replace the PowerShell hot path with direct Win32 or a resident helper, then re-measure `hotkey_triggered -> hotkey_panel_ready -> replace_succeeded`.
2. Split extension bootstrap from full runtime and narrow `all_frames` / broad injection where telemetry shows low-value activation.
3. Add a release verdict layer to diagnostics so the owner can see whether a build improved activation and latency without exporting JSON.
4. Instrument renderer load/render timings and trim the panel entry bundle only if traces show it is part of the user-visible delay.
5. Build a measurable onboarding/value surface once the first three changes are live.

## Exact next measurements to add if evidence is still missing

- Real session trace for `hotkey_triggered -> hotkey_panel_ready -> rewrite_completed -> replace_succeeded`
- Bootstrap-to-runtime activation ratio by domain and frame type after extension narrowing
- Version-over-version release deltas for first success, bridge availability, and activation efficiency
- Renderer-specific `panel_renderer_loaded` and `first_option_rendered` timings to separate UI cost from capture cost

## Commands used in this audit

```powershell
cd C:\Users\cvane\V
git rev-parse --show-toplevel
git status --short --branch
git rev-parse HEAD
git remote -v
npm run build
npm run test
npm run test:full
npm run lint
```
