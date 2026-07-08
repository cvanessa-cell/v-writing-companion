# Performance Audit - 2026-07-08

## Scope

- Active project folder: [C:\Users\cvane\V](C:\Users\cvane\V)
- Git state at audit start: `main...origin/main`
- Current commit SHA: `9d7c4a8af7ef4a23224773a72f05ec034bf70435`
- Remote: `origin` -> `https://github.com/cvanessa-cell/v-writing-companion.git`
- Working tree at audit start: untracked recovery folder only under [C:\Users\cvane\V\project-audits\follow-up\2026-07-08-01-41-45-recovery](C:\Users\cvane\V\project-audits\follow-up\2026-07-08-01-41-45-recovery)
- Rollback checkpoint: not created in this run because this was an audit/report pass only

## Project working folder review

V is still a three-surface Windows writing product:

- Electron desktop app for hotkey capture, rewrite UI, settings, memory, diagnostics, and local bridge hosting
- Browser extension for in-field rewrite and suggestion flows
- Shared library plus local SQLite-backed diagnostics and memory storage

Most relevant current files:

- desktop hotkey path: [C:\Users\cvane\V\apps\desktop\src\main\index.ts:119](C:\Users\cvane\V\apps\desktop\src\main\index.ts#L119)
- desktop active-window lookup: [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:7](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L7)
- desktop clipboard capture/replace: [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:7](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L7)
- extension injection policy: [C:\Users\cvane\V\apps\browser-extension\manifest.json:12](C:\Users\cvane\V\apps\browser-extension\manifest.json#L12)
- extension bootstrap/runtime split: [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:10](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L10), [C:\Users\cvane\V\apps\browser-extension\src\contentRuntime.ts:1](C:\Users\cvane\V\apps\browser-extension\src\contentRuntime.ts#L1)
- diagnostics summaries: [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:161](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L161)
- diagnostics UI: [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:4](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L4)
- renderer entry: [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx:1](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx#L1)

## Verification and measurements

### Quality gates

- `npm run build`: passed in `12138.18 ms`
- `npm run test`: passed in `8697.18 ms`
- `npm run test:full`: passed in `24182.45 ms`
- `npm run lint`: passed in `12437.36 ms`

### Build artifacts from this run

- desktop main bundle: `82.03 kB`
- desktop preload bundle: `2.10 kB`
- renderer entry bundle: `340.17 kB`
- deferred settings bundle: `42.91 kB`
- extension build completed successfully to [C:\Users\cvane\V\apps\browser-extension\dist](C:\Users\cvane\V\apps\browser-extension\dist)

### Desktop hot-path timing evidence

Measured in this run with direct samples and a Node `execFile` path that matches the desktop implementation:

- bare PowerShell spawn samples: `168.69`, `146.39`, `200.33`, `194.46`, `131.60` ms
- bare PowerShell spawn average: `168.29 ms`
- active-window script samples through Node `execFile`: `656.62`, `508.49`, `447.94`, `538.19`, `717.61` ms
- active-window script average: `573.77 ms`
- SendKeys copy samples through Node `execFile`: `435.95`, `472.56`, `394.28`, `355.02`, `392.58` ms
- SendKeys copy average: `410.08 ms`

Code-confirmed fixed waits still present:

- capture waits `150 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:22](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L22)
- replace waits `120 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:49](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L49)

Inference from those measurements:

- the desktop hotkey path still has a non-model floor of about `1133.85 ms` before panel render and AI latency: active-window lookup (`573.77 ms`) + SendKeys capture shell (`410.08 ms`) + fixed capture wait (`150 ms`)
- the replace path still adds about `530.08 ms`: SendKeys shell (`410.08 ms`) + fixed replace wait (`120 ms`)
- combined user-visible desktop interaction overhead is still about `1.66 s` before model/network variability

That combined number is an inference from isolated timings rather than a traced real rewrite session, but it is grounded in the current code path and fresh measurements.

### Validation-loop findings

- the fast default test path remains healthy after the July 7 split: root `npm run test` completed in `8.70 s`
- the slower browser DOM coverage is still expensive relative to its scope: `npm run test:full` took `24.18 s` even though the DOM suite only ran 4 tests in [C:\Users\cvane\V\apps\browser-extension\src\tests\suggestionOverlay.test.ts:1](C:\Users\cvane\V\apps\browser-extension\src\tests\suggestionOverlay.test.ts#L1) and [C:\Users\cvane\V\apps\browser-extension\src\tests\fieldDetector.test.ts:1](C:\Users\cvane\V\apps\browser-extension\src\tests\fieldDetector.test.ts#L1)
- the browser-extension Vitest config is still globally `node` and relies on per-file jsdom overrides in [C:\Users\cvane\V\apps\browser-extension\vitest.config.ts:1](C:\Users\cvane\V\apps\browser-extension\vitest.config.ts#L1)

### Packaging and release status

- `npx electron-builder --projectDir apps/desktop --config electron-builder.json --dir` still fails on Node `24.15.0`
- failure remains: `Cannot find module './lib/source-map-generator'`
- result: desktop packaging is still unverified and remains a release blocker

## What changed since the July 7 audit

Three important points are now stable rather than provisional:

- the fast root validation path is still healthy on the July 8 head, so the July 7 test-split fix held
- the extension bootstrap/runtime split is still present, with deferred runtime load after supported-field discovery in [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:50](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L50)
- the owner-facing diagnostics verdict layer is still present in [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:28](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L28)

The top remaining priorities therefore stay concentrated in desktop latency, packaging reliability, extension scope, and missing end-to-end timings rather than in repo validation speed.

## Highest-leverage findings by pipeline

### 1. Core product functionality

Highest-leverage goal:

- remove PowerShell from the desktop hotkey path

Evidence:

- every hotkey still shells out for active-window lookup in [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:37](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L37)
- capture shells out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:14](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L14)
- replace shells out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:47](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L47)
- the desktop hotkey flow still serializes active-window lookup, capture, and panel open in [C:\Users\cvane\V\apps\desktop\src\main\index.ts:128](C:\Users\cvane\V\apps\desktop\src\main\index.ts#L128)
- fresh measurements still put non-model overhead at about `1.13 s` before panel readiness and about `1.66 s` before a full capture-plus-replace round trip

Why it matters:

- this is still the clearest source of perceived slowness at the product's main value moment
- it directly weakens trust, repeat use, and product differentiation

Best next fix:

- move active-window lookup and copy/paste automation to direct Win32 bindings or a resident native helper
- replace fixed waits with explicit completion signals

Success measure:

- add an end-to-end trace for `hotkey_triggered -> active_window_resolved -> capture_selected -> hotkey_panel_ready -> replace_succeeded`
- target sub-`250 ms` pre-model capture overhead and sub-`150 ms` replace overhead

### 2. Reliability/performance pipeline

Highest-leverage goal:

- keep the fast validation path stable, then fix the release path

Evidence:

- build, lint, test, and test:full are all green on the July 8 head
- the fast root test path remains reasonable at `8.70 s`
- desktop packaging still fails with the same `source-map-generator` module error through `npx electron-builder`

Why it matters:

- repo validation is no longer the main drag, but shipping confidence is still blocked because packaging remains unverified

Best next fix:

- stop relying on transient `npx electron-builder` resolution
- add a checked-in packaging path or pin a supported Node plus `electron-builder` combination that works in-repo

Success measure:

- a documented packaging command in-repo succeeds on the supported Node version and produces a release artifact under [C:\Users\cvane\V\apps\desktop\release](C:\Users\cvane\V\apps\desktop\release)

### 3. UI/UX pipeline

Highest-leverage goal:

- narrow extension activation scope and separate panel-render cost from desktop capture cost

Evidence:

- the manifest still injects on `"<all_urls>"` with `all_frames: true` in [C:\Users\cvane\V\apps\browser-extension\manifest.json:14](C:\Users\cvane\V\apps\browser-extension\manifest.json#L14)
- the content bootstrap still runs on every matched page and frame in [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:100](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L100)
- the heavier runtime still binds global listeners once activated in [C:\Users\cvane\V\apps\browser-extension\src\contentRuntime.ts:326](C:\Users\cvane\V\apps\browser-extension\src\contentRuntime.ts#L326)
- renderer entry remains `340.17 kB`, while the panel route is still the default eager path in [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx:23](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx#L23)

Uncertainty:

- this audit did not capture renderer parse, panel paint, or extension memory profiles, so bundle sizes and listener structure are code/build signals rather than direct UI trace evidence

Best next fix:

- instrument `panel_renderer_loaded` and `first_option_rendered`
- compare `content_script_bootstrapped`, `supported_field_seen`, and `full_runtime_activated` by domain/frame before narrowing bootstrap scope

Success measure:

- panel-open traces separate capture latency from renderer latency
- telemetry shows which domains or frame types are paying bootstrap cost without meaningful field activation

### 4. Admin pipeline

Highest-leverage goal:

- turn diagnostics into a release decision surface that includes packaging status

Evidence:

- release verdicts and previous-version comparison scaffolding already exist in [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:208](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L208) and [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:28](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L28)
- the settings view still stops short of explicit packaging or deploy readiness

Why it matters:

- the owner can now judge release health, but still cannot answer "can I ship this build?" from one place

Best next fix:

- add packaging verification status and supported-toolchain metadata to the same diagnostics verdict surface

Success measure:

- settings answers both "did this build improve first success?" and "is this build packageable on the supported toolchain?"

### 5. Data/analytics pipeline

Highest-leverage goal:

- add missing end-to-end and renderer milestones before deeper UI optimization work

Evidence:

- current local metrics already capture release-tagged health, extension activation counts, rewrite counts, and latency buckets
- no current event captures renderer load or a full rewrite session from trigger through replace

Why it matters:

- the repo can measure several slices, but still cannot prove where the remaining user-visible delay is concentrated

Best next fix:

- add panel-render and end-to-end rewrite milestones before bundle-splitting or renderer surgery

Success measure:

- the next audit can attribute latency to desktop capture, renderer startup, model time, or replace time separately

### 6. Content pipeline

Highest-leverage goal:

- turn setup content into a measurable first-success path for non-developers

Evidence:

- product docs are still concentrated in [C:\Users\cvane\V\README.md](C:\Users\cvane\V\README.md), [C:\Users\cvane\V\docs\SETUP.md](C:\Users\cvane\V\docs\SETUP.md), [C:\Users\cvane\V\docs\EXTENSION_SETUP.md](C:\Users\cvane\V\docs\EXTENSION_SETUP.md), and [C:\Users\cvane\V\docs\PRIVACY.md](C:\Users\cvane\V\docs\PRIVACY.md)
- the extension popup already includes a first-value checklist in [C:\Users\cvane\V\apps\browser-extension\scripts\build.mjs:35](C:\Users\cvane\V\apps\browser-extension\scripts\build.mjs#L35), but the repo still lacks a dedicated consumer-facing install or proof page

Why it matters:

- the app can demonstrate value locally, but the project still lacks a clean non-technical surface that explains that value quickly

Best next fix:

- create one consumer-facing first-success document or page using the same three-step flow already embedded in the extension popup

Success measure:

- the project has one install/value surface that maps directly to measurable diagnostics events

### 7. Marketing pipeline

Highest-leverage goal:

- create a consumer-facing value surface tied to current diagnostics vocabulary

Evidence:

- no dedicated landing or acquisition funnel exists in the repo
- existing diagnostics vocabulary already covers success evidence such as rewrite completion, rewrite acceptance, and bridge connectivity

Why it matters:

- the product's value story is stronger when the owner can point to a simple first-success promise backed by product telemetry

Best next fix:

- build a single landing/onboarding page around privacy, first rewrite proof, and in-place workflow

Success measure:

- future activation copy can map directly to existing event names instead of inventing a second funnel vocabulary

### 8. Monetization/revenue pipeline

Highest-leverage goal:

- delay billing, define repeat-value cohorts first

Evidence:

- no billing or entitlement surface exists in the current repo inventory
- current diagnostics are good enough to define repeated successful rewrites and accepted suggestions, but not yet enough to justify pricing claims

Why it matters:

- pricing before clear repeated-value evidence would be guesswork

Best next fix:

- define repeat successful usage and accepted-suggestion cohorts first

Success measure:

- any later pricing work is grounded in measured repeat behavior rather than install counts

## Recommended implementation order

1. Replace the PowerShell desktop hot path with direct Win32 or a resident helper, then re-measure the full rewrite flow.
2. Fix packaging on a supported checked-in toolchain so release readiness becomes verifiable.
3. Add end-to-end and renderer-specific timing milestones before deeper renderer optimization.
4. Use current extension telemetry to narrow bootstrap scope and re-evaluate `all_frames`.
5. Add packaging status into the existing release verdict surface.
6. Build one consumer-facing first-success page tied to the current diagnostics event vocabulary.

## Exact next measurements to add

- real session trace for `hotkey_triggered -> hotkey_panel_ready -> rewrite_completed -> replace_succeeded`
- renderer milestones: `panel_renderer_loaded` and `first_option_rendered`
- per-domain and per-frame ratios for `content_script_bootstrapped -> supported_field_seen -> full_runtime_activated`
- packaging verification on a stable supported toolchain instead of transient `npx electron-builder`
- optional browser-memory sample for broad extension bootstrap vs activated runtime if compatibility issues keep surfacing

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
npx electron-builder --projectDir apps/desktop --config electron-builder.json --dir
```
