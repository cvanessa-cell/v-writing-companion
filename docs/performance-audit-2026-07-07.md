# Performance Audit - 2026-07-07

## Scope

- Active project folder: [C:\Users\cvane\V](C:\Users\cvane\V)
- Git state at audit start: `main...origin/main`
- Current commit SHA at audit start: `51d3bc628525959daae11dd6d8cc99f9951aef66`
- Remote: `origin` -> `https://github.com/cvanessa-cell/v-writing-companion.git`
- Rollback checkpoint for source edits: tag `pre-follow-up-2026-07-07-11-58-30`
- Recovery folder: [C:\Users\cvane\V\project-audits\follow-up\2026-07-07-11-58-30-recovery](C:\Users\cvane\V\project-audits\follow-up\2026-07-07-11-58-30-recovery)

## What was inspected

V is still a three-surface Windows writing product:

- Electron desktop app for hotkey capture, settings, memory, diagnostics, and bridge hosting
- Browser extension for in-field rewrite and suggestion flows
- Local SQLite-backed diagnostics and memory storage for owner visibility

Most relevant current files:

- desktop hotkey path: [C:\Users\cvane\V\apps\desktop\src\main\index.ts:144](C:\Users\cvane\V\apps\desktop\src\main\index.ts#L144)
- active-window lookup: [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:7](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L7)
- clipboard capture/replace: [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:8](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L8)
- extension injection policy: [C:\Users\cvane\V\apps\browser-extension\manifest.json:12](C:\Users\cvane\V\apps\browser-extension\manifest.json#L12)
- extension runtime/bootstrap logic: [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:103](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L103)
- diagnostics summaries: [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:276](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L276)
- diagnostics UI: [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:16](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L16)
- renderer entry point: [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx:1](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx#L1)

## Verification and measurements

### Quality gates

- `npm run build`: passed in `3934.09 ms` after the audit fix
- `npm run test`: passed in `6725.31 ms` after the audit fix
- `npm run test:full`: passed in `9223.27 ms`
- `npm run lint`: passed in `7668.32 ms`

Measured earlier in this same run before the test split:

- root `npm run test`: `31547.09 ms`
- extension logic suite: `20.51 s` despite only running 10 tests

Confirmed cause:

- the default extension logic suite still included a DOM-only `jsdom` test file
- current fast-path fix moved `src/tests/fieldDetector.test.ts` out of `test:logic` and into `test:dom` in [C:\Users\cvane\V\apps\browser-extension\package.json:6](C:\Users\cvane\V\apps\browser-extension\package.json#L6)

### Build artifacts

- desktop main bundle: `74.42 kB`
- desktop preload bundle: `2.10 kB`
- renderer entry bundle: `340.17 kB`
- deferred settings bundle: `38.43 kB`
- extension build completed successfully to `apps/browser-extension/dist`

### Desktop hot-path timing evidence

Measured in this run with direct `powershell.exe` samples and a Node `execFile` path that matches the desktop code:

- bare PowerShell spawn samples: `154.66`, `135.47`, `129.72`, `180.95`, `165.90` ms
- bare PowerShell spawn average: `153.34 ms`
- active-window script samples through Node `execFile`: `596.93`, `613.59`, `442.65`, `492.76`, `645.44` ms
- active-window script average: `558.27 ms`
- SendKeys copy samples: `428.41`, `432.56`, `505.94`, `417.88`, `445.09` ms
- SendKeys copy average: `445.98 ms`

Code-confirmed fixed waits still present:

- capture waits `150 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:23](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L23)
- replace waits `120 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:56](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L56)

Inference from those measurements:

- the desktop hotkey path still has a non-model floor of about `1154.25 ms` before panel render and AI latency: active-window lookup (`558.27 ms`) + SendKeys capture shell (`445.98 ms`) + fixed capture wait (`150 ms`)
- the replace path still adds about `565.98 ms`: SendKeys shell (`445.98 ms`) + fixed replace wait (`120 ms`)
- combined user-visible desktop interaction overhead is still roughly `1.72 s` before model/network variability

That combined number is an inference from isolated timings rather than a traced real rewrite session, but it is grounded in the current code path.

### Packaging and release status

- `npx electron-builder --projectDir apps/desktop --config electron-builder.json --dir` still fails on Node `24.15.0`
- failure remains: `Cannot find module './lib/source-map-generator'`
- result: desktop packaging is still unverified and remains a release blocker

## Audit fixes shipped in this run

### 1. Fast validation path restored

- changed [C:\Users\cvane\V\apps\browser-extension\package.json:6](C:\Users\cvane\V\apps\browser-extension\package.json#L6) so `test:logic` excludes `fieldDetector.test.ts`
- moved `fieldDetector.test.ts` into `test:dom` so DOM coverage is preserved without slowing the default root test path
- outcome: root `npm run test` dropped from `31.55 s` earlier in the run to `6.73 s` after the split

### 2. Extension setup docs brought back in sync with product behavior

- updated [C:\Users\cvane\V\docs\EXTENSION_SETUP.md:15](C:\Users\cvane\V\docs\EXTENSION_SETUP.md#L15) to describe the inline review overlay instead of a stale confirm-dialog flow
- updated the validation section in [C:\Users\cvane\V\docs\EXTENSION_SETUP.md:31](C:\Users\cvane\V\docs\EXTENSION_SETUP.md#L31) so it matches the current logic-vs-DOM test split

## Highest-leverage findings by pipeline

### 1. Core product functionality

Highest-leverage goal:

- remove PowerShell from the desktop hotkey path

Evidence:

- every hotkey still shells out for active-window lookup in [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:37](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L37)
- capture shells out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:22](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L22)
- replace shells out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:55](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L55)

Why it matters:

- this is still the most direct source of perceived slowness in the product's core interaction

Best next fix:

- move active-window lookup and copy/paste automation to direct Win32 bindings or a resident helper
- replace fixed sleeps with completion-based signaling

### 2. Reliability/performance pipeline

Highest-leverage goal:

- keep the root validation loop fast and stable while focusing deeper work on user-facing latency

Evidence:

- root build/lint/test are green
- the default fast test path regressed inside this run and was fixed by moving DOM coverage out of `test:logic`
- packaging is still blocked and cannot be treated as verified release readiness

Best next fix:

- keep `test:logic` strictly node-only
- create a stable checked-in packaging path or pin a supported Node/electron-builder combination

### 3. UI/UX pipeline

Highest-leverage goal:

- narrow extension runtime activation and separate UI render timing from capture timing

Evidence:

- manifest still injects on `"<all_urls>"` with `all_frames: true` in [C:\Users\cvane\V\apps\browser-extension\manifest.json:14](C:\Users\cvane\V\apps\browser-extension\manifest.json#L14)
- content script still attaches global listeners for `focusin`, `input`, `scroll`, `focusout`, and `visibilitychange` in [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:387](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L387)
- renderer entry bundle is still `340.17 kB` even though settings are lazy-loaded in [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx:4](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx#L4)

Uncertainty:

- this audit did not trace renderer parse/paint separately, so the bundle size is a code-and-build signal rather than a measured panel-open regression

Best next fix:

- add `panel_renderer_loaded` and `first_option_rendered` diagnostics
- split extension bootstrap from the heavier overlay/rewrite runtime after a supported field is detected

### 4. Admin pipeline

Highest-leverage goal:

- turn existing diagnostics into an owner-facing release verdict

Evidence:

- diagnostics already track release tags, funnel counts, latency summaries, and domain outcomes in [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:329](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L329)
- the settings UI exposes raw summaries, but not a version-over-version verdict, in [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:111](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L111)

Best next fix:

- add one release verdict card that answers whether latency, activation, and first success improved versus the prior tagged version

### 5. Data/analytics pipeline

Highest-leverage goal:

- connect privacy-safe local telemetry to a small set of actionable owner decisions

Evidence:

- current telemetry includes `content_script_bootstrapped`, `supported_field_seen`, and `full_runtime_activated`
- that is enough to compare extension scope against actual usage, but not yet enough to flag regressions automatically

Best next fix:

- add previous-version comparisons for first success, bridge availability, and extension activation efficiency

### 6. Content pipeline

Highest-leverage goal:

- make first-success guidance consistent across docs and product surfaces

Evidence:

- the extension setup doc had drifted from the inline overlay flow and needed correction in this run
- setup docs are still mostly installation-oriented rather than outcome-oriented

Best next fix:

- rewrite setup around one measurable first-value path: desktop rewrite success, extension connection, and one accepted inline rewrite

### 7. Marketing pipeline

Highest-leverage goal:

- create one consumer-facing value surface instead of relying mostly on developer setup docs

Evidence:

- current repo-facing onboarding is concentrated in [C:\Users\cvane\V\README.md](C:\Users\cvane\V\README.md), [C:\Users\cvane\V\docs\SETUP.md](C:\Users\cvane\V\docs\SETUP.md), and [C:\Users\cvane\V\docs\EXTENSION_SETUP.md](C:\Users\cvane\V\docs\EXTENSION_SETUP.md)
- this repo still does not surface a dedicated consumer landing or install proof flow

Best next fix:

- build one concise value/onboarding page that uses the existing first-success funnel as its proof structure

### 8. Monetization/revenue pipeline

Highest-leverage goal:

- delay billing work until repeat-value behavior is measurable

Evidence:

- no billing or entitlement flow exists in the current repo surface
- diagnostics are now good enough to define repeat usage and accepted suggestion cohorts locally

Best next fix:

- define a pricing hypothesis around repeated successful usage, not installs

## Recommended implementation order

1. Replace the PowerShell hot path with direct Win32 or a resident helper, then re-measure `hotkey_triggered -> hotkey_panel_ready -> replace_succeeded`.
2. Stabilize packaging with a checked-in release path or supported toolchain pin so release readiness is measurable.
3. Split extension bootstrap from the heavier runtime and re-evaluate `all_frames` and broad injection scope using current telemetry.
4. Add release verdict and version-delta summaries on top of the existing diagnostics foundation.
5. Instrument renderer load/render timings before doing deeper panel bundle-splitting work.
6. Build one measurable first-success onboarding/value surface before starting pricing work.

## Exact next measurements to add

- real session trace for `hotkey_triggered -> hotkey_panel_ready -> rewrite_completed -> replace_succeeded`
- bootstrap-to-runtime activation ratio by domain and frame type after extension narrowing
- version-over-version deltas for first success, bridge availability, and activation efficiency
- renderer-specific `panel_renderer_loaded` and `first_option_rendered` timings
- packaging verification on a stable supported toolchain instead of transient `npx electron-builder`

## Commands used in this audit

```powershell
cd C:\Users\cvane\V
git rev-parse --show-toplevel
git status --short --branch
git rev-parse HEAD
git remote -v
git remote show origin
npm run build
npm run test
npm run test:full
npm run lint
npx electron-builder --projectDir apps/desktop --config electron-builder.json --dir
```
