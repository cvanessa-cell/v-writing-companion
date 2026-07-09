# Performance Audit - 2026-07-09

## Scope

- Active project folder: [C:\Users\cvane\V](C:\Users\cvane\V)
- Git state at audit start: `main...origin/main`
- Current commit SHA: `39ab491a37c2e3ef83aff2078dee303cda1728e1`
- Remote: `origin` -> `https://github.com/cvanessa-cell/v-writing-companion.git`
- Working tree at audit start: clean
- Rollback checkpoint for this run: `pre-follow-up-2026-07-09-10-14-17`
- Recovery folder for this run: [C:\Users\cvane\V\project-audits\follow-up\2026-07-09-10-14-17-recovery](C:\Users\cvane\V\project-audits\follow-up\2026-07-09-10-14-17-recovery)

## Project working folder review

V is still a three-surface Windows writing product:

- Electron desktop app for hotkey capture, rewrite UI, local settings, diagnostics, and bridge hosting
- Browser extension for in-field rewrite and suggestion flows
- Shared package plus local SQLite-backed diagnostics and memory storage

Most relevant current files:

- desktop hotkey flow: [C:\Users\cvane\V\apps\desktop\src\main\index.ts:119](C:\Users\cvane\V\apps\desktop\src\main\index.ts:119)
- desktop active-window lookup: [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:7](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:7)
- desktop clipboard capture and replace: [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:7](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:7)
- extension bootstrap: [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:1](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:1)
- extension runtime: [C:\Users\cvane\V\apps\browser-extension\src\contentRuntime.ts:1](C:\Users\cvane\V\apps\browser-extension\src\contentRuntime.ts:1)
- extension injection policy: [C:\Users\cvane\V\apps\browser-extension\manifest.json:1](C:\Users\cvane\V\apps\browser-extension\manifest.json:1)
- owner-facing diagnostics summary: [C:\Users\cvane\V\apps\desktop\src\main\diagnosticSummary.ts:1](C:\Users\cvane\V\apps\desktop\src\main\diagnosticSummary.ts:1)
- diagnostics UI and packaging surface: [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:4](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:4)
- onboarding and release proof surface: [C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx:1](C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx:1)

## Current verification and measurements

### Quality gates

- `npm run build`: passed in `14310.70 ms`
- `npm run test`: passed in `10820.44 ms`
- `npm run test:full`: passed in `23973.50 ms`
- `npm run lint`: passed in `15116.23 ms`
- `npm run package:dir -w @v/desktop`: passed in `68336.01 ms`

### Build and packaging artifacts

- desktop main bundle: `84.36 kB`
- desktop preload bundle: `2.10 kB`
- renderer entry bundle: `341.32 kB`
- deferred settings bundle: `47.29 kB`
- extension build completed to [C:\Users\cvane\V\apps\browser-extension\dist](C:\Users\cvane\V\apps\browser-extension\dist)
- packaging artifact exists at [C:\Users\cvane\V\apps\desktop\release\win-unpacked](C:\Users\cvane\V\apps\desktop\release\win-unpacked)
- packaging snapshot refreshed in [C:\Users\cvane\V\apps\desktop\packaging-status.json](C:\Users\cvane\V\apps\desktop\packaging-status.json)

### Desktop hot-path timing evidence

Measured with the same PowerShell `execFile` pattern used by the desktop app:

- bare PowerShell spawn samples: `287.51`, `173.60`, `166.29`, `191.92`, `178.38` ms
- bare PowerShell spawn average: `199.54 ms`
- active-window script samples through Node `execFile`: `601.90`, `534.64`, `452.57`, `492.98`, `396.62` ms
- active-window script average: `495.74 ms`
- SendKeys samples through Node `execFile`: `392.59`, `396.06`, `371.57`, `324.40`, `308.40` ms
- SendKeys average: `358.60 ms`

Code-confirmed fixed waits still present:

- capture waits `150 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:20](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:20)
- replace waits `120 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:48](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:48)

Grounded inference from those measurements:

- the desktop hotkey path still has a non-model floor of about `1004.34 ms` before panel render and AI latency: active-window lookup (`495.74 ms`) + SendKeys capture (`358.60 ms`) + fixed capture wait (`150 ms`)
- the replace path still adds about `478.60 ms`: SendKeys (`358.60 ms`) + fixed replace wait (`120 ms`)
- combined user-visible capture-plus-replace overhead is still about `1.48 s` before model/network time

This is an inference from isolated samples rather than a traced live rewrite session, but it is grounded in the current implementation and current timings.

## What is no longer a current regression

These concerns were real earlier in this repo but are no longer the top problems on the July 9 head:

- extension idle overhead is already reduced by the bootstrap/runtime split in [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:15](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:15)
- owner-facing release verdicts, version deltas, latency summaries, and packaging readiness already exist in [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:212](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:212) and [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:28](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:28)
- packaging is no longer blocked by the older transient `npx electron-builder` path; the checked-in command now succeeds and produces a current artifact

That shifts the priority stack toward desktop latency, consumer-facing onboarding/proof, and targeted extension scope refinement rather than packaging unblock or validation-loop repair.

## Highest-leverage findings by pipeline

### 1. Core product functionality

Highest-leverage goal:

- remove PowerShell from the desktop hotkey path

Evidence:

- every hotkey still shells out for active-window lookup in [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:37](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:37)
- capture shells out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:13](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:13)
- replace shells out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:46](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:46)
- the desktop hotkey flow still serializes active-window lookup, capture, and panel open in [C:\Users\cvane\V\apps\desktop\src\main\index.ts:128](C:\Users\cvane\V\apps\desktop\src\main\index.ts:128)
- fresh measurements still put non-model capture overhead at about `1.00 s`

Why it matters:

- this is still the clearest source of perceived slowness at the exact moment the product is supposed to feel magical
- it directly suppresses trust, repeat usage, and consumer value

Best next fix:

- move active-window lookup and copy/paste automation to direct Win32 bindings or a long-lived native helper
- replace fixed sleeps with explicit completion signals

Success measure:

- add or continue using `hotkey_triggered`, `active_window_resolved`, `capture_selected`, `hotkey_panel_ready`, and `replace_succeeded`
- target sub-`250 ms` pre-model capture overhead and sub-`150 ms` replace overhead

### 2. Reliability/performance pipeline

Highest-leverage goal:

- keep the packaging path green and focus performance work on the user-visible desktop path

Evidence:

- all source-verification gates passed on the current head
- the checked-in packaging command completed successfully and produced a fresh artifact
- current wall times are still acceptable for maintenance work, but they are not the main user-facing bottleneck

Why it matters:

- source verification and packaging are no longer blocked, so spending the next iteration on lint/test/build speed would be lower leverage than fixing runtime latency

Best next fix:

- preserve the current packaging contract in [C:\Users\cvane\V\apps\desktop\package.json](C:\Users\cvane\V\apps\desktop\package.json)
- avoid broad tooling churn unless verification times become materially worse again

Success measure:

- `npm run build`, `npm run test`, `npm run test:full`, `npm run lint`, and `npm run package:dir -w @v/desktop` remain green on the same branch while desktop latency comes down

### 3. UI/UX pipeline

Highest-leverage goal:

- narrow extension activation scope with telemetry rather than by guessing

Evidence:

- the manifest still bootstraps on `"<all_urls>"` with `all_frames: true` in [C:\Users\cvane\V\apps\browser-extension\manifest.json:12](C:\Users\cvane\V\apps\browser-extension\manifest.json:12)
- the bootstrap is now small, but it still loads on every matched page/frame and emits `content_script_bootstrapped` in [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:103](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:103)
- the heavier runtime only activates after a supported field is found in [C:\Users\cvane\V\apps\browser-extension\src\contentRuntime.ts:351](C:\Users\cvane\V\apps\browser-extension\src\contentRuntime.ts:351)

Why it matters:

- the repo has already taken the safe structural step, but the product still looks broad in its injection policy
- narrowing with telemetry can improve perceived trust without breaking iframe-hosted editors blindly

Best next fix:

- compare `content_script_bootstrapped`, `supported_field_seen`, and `full_runtime_activated` by domain and frame type
- move the default activation mode toward allowlisted domains once current telemetry identifies low-value broad matches

Success measure:

- a later release shows a better bootstrap-to-activation ratio without losing successful browser rewrites

### 4. Admin pipeline

Highest-leverage goal:

- turn current diagnostics into an owner decision surface for repeat value, not just release health

Evidence:

- settings already show first-success proof, release verdict, packaging readiness, and local bridge health in [C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx:38](C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx:38)
- diagnostics already summarize release-over-release deltas in [C:\Users\cvane\V\apps\desktop\src\main\diagnosticSummary.ts:200](C:\Users\cvane\V\apps\desktop\src\main\diagnosticSummary.ts:200)
- there is still no operator surface that answers whether users are returning and succeeding repeatedly

Why it matters:

- the repo now has enough local instrumentation to support product-management decisions, but it still emphasizes diagnostics over habit formation

Best next fix:

- add a compact repeat-value card that surfaces repeated successful desktop rewrites, accepted suggestions, and time-to-first-success by release

Success measure:

- the owner can decide whether usage is sticky from settings alone without exporting JSON

### 5. Data/analytics pipeline

Highest-leverage goal:

- add a full rewrite-session trace before deeper UI rewrites

Evidence:

- current metrics already capture `hotkey_panel_ready`, `panel_renderer_loaded`, `first_option_rendered`, `active_window_resolved`, `capture_selected`, and `replace_selected_text`
- this audit did not gather a real end-to-end live session trace from trigger through accepted replacement

Why it matters:

- the repo can measure several slices, but the next optimization pass still needs one true end-to-end latency narrative

Best next fix:

- record one traced local rewrite session and store the exact milestone timings in the diagnostics review flow

Success measure:

- the next audit can attribute delay across desktop capture, renderer, model, and replace phases separately

### 6. Content pipeline

Highest-leverage goal:

- convert the existing first-success checklist into a consumer-facing onboarding artifact

Evidence:

- the repo already embeds the first-value checklist in [C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx:38](C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx:38)
- setup content is still mostly developer-oriented in [C:\Users\cvane\V\README.md](C:\Users\cvane\V\README.md), [C:\Users\cvane\V\docs\SETUP.md](C:\Users\cvane\V\docs\SETUP.md), and [C:\Users\cvane\V\docs\EXTENSION_SETUP.md](C:\Users\cvane\V\docs\EXTENSION_SETUP.md)

Why it matters:

- product value is now measurable, but the repo still lacks a simple non-technical artifact that explains that first win

Best next fix:

- build one short owner/shareable onboarding page around provider setup, first desktop rewrite, first browser acceptance, and privacy controls

Success measure:

- a single onboarding artifact maps directly to the same diagnostics events used for verification

### 7. Marketing pipeline

Highest-leverage goal:

- create one proof-of-value surface grounded in current telemetry vocabulary

Evidence:

- there is still no consumer-facing landing page or acquisition funnel in the current repo tree
- the product already has trustworthy proof terms such as rewrite completion, suggestion acceptance, bridge connection, and packaging readiness

Why it matters:

- the marketing story gets stronger when it reuses product truth instead of invented positioning

Best next fix:

- turn the first-success path plus privacy/bridge proof into one concise marketing or landing artifact

Success measure:

- future copy uses the same event-backed milestones the app already measures

### 8. Monetization/revenue pipeline

Highest-leverage goal:

- define repeat-value cohorts before adding payments

Evidence:

- no billing, entitlement, or pricing surfaces exist in the current repo inventory
- diagnostics are now good enough to define repeated success cohorts, but not to support revenue claims yet

Why it matters:

- billing before repeat-value evidence would still be guesswork

Best next fix:

- define free-to-paid hypotheses around repeated successful rewrites and accepted suggestions rather than installs

Success measure:

- any future monetization work is tied to measured repeated value, not setup counts

## Recommended implementation order

1. Replace the desktop PowerShell path with direct Win32 or a resident helper, then re-measure a full rewrite session.
2. Capture one real end-to-end trace using the diagnostics milestones already in the repo.
3. Use extension activation telemetry to narrow default scope toward allowlisted or empirically high-value domains.
4. Add a repeat-value owner card on top of the existing diagnostics verdict surface.
5. Turn the first-success checklist into one consumer-facing onboarding or landing artifact.

## Commands used in this audit

```powershell
cd C:\Users\cvane\V
git rev-parse --show-toplevel
git status --short --branch
git rev-parse HEAD
git remote -v
git log --oneline -5
npm run build
npm run test
npm run test:full
npm run lint
npm run package:dir -w @v/desktop
```
