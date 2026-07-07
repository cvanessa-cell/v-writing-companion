# Performance Audit - 2026-06-29

## Scope

- Active project folder: [C:\Users\cvane\V](C:\Users\cvane\V)
- Git state at audit start: `main...origin/main`
- Current commit SHA: `7fa15d2770c0cd8834c37171adf54816d4e72e8f`
- Remote: `origin` -> `https://github.com/cvanessa-cell/v-writing-companion.git`
- Working tree at audit start: untracked audit artifacts only under `.assistant-runs`, `docs`, and `project-audits`
- Rollback checkpoint: not created in this run because this was an audit-only pass with no source edits

## Project summary

V is still a three-surface product:

- Electron desktop app for hotkey capture, rewrite UI, settings, and diagnostics
- Browser extension for in-field rewrite and suggestion flows
- Local bridge plus local diagnostics/history storage

Most relevant current files:

- desktop active-window lookup: [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:6](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L6)
- desktop clipboard capture/replace: [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:7](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L7)
- extension injection policy: [C:\Users\cvane\V\apps\browser-extension\manifest.json:14](C:\Users\cvane\V\apps\browser-extension\manifest.json#L14)
- extension runtime listeners/polling: [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:104](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L104)
- local diagnostics aggregation: [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:202](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L202)
- diagnostics UI: [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:24](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L24)

## Verification and measurements

### Quality gates

- `npm run build`: passed in `20864.07 ms`
- `npm run test`: passed in `46513.95 ms`
- `npm run lint`: passed in `23435.59 ms`

### Build artifacts from this run

- desktop main bundle: `71.24 kB`
- desktop preload bundle: `2.10 kB`
- renderer entry bundle: `340.17 kB`
- deferred settings bundle: `33.16 kB`
- extension content script output: `148060 bytes`

### Desktop hot-path timing evidence

Measured in this run:

- bare PowerShell spawn samples: `418.79`, `340.35`, `314.39`, `407.17`, `282.37` ms
- bare PowerShell spawn average: `352.61 ms`
- active-window PowerShell script samples: `414.52`, `332.97`, `452.61`, `369.27`, `403.59` ms
- active-window PowerShell script average: `394.59 ms`
- SendKeys base script samples: `496.21`, `426.21`, `557.94`, `465.47`, `427.81` ms
- SendKeys base script average: `474.73 ms`

Code-confirmed fixed waits still present:

- capture waits `150 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:20](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L20)
- replace waits `120 ms` in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:55](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L55)

Inference from those measurements:

- the desktop hotkey path has an architectural floor of roughly `1.02 s` before AI latency even starts: active-window lookup (`394.59 ms`) + capture SendKeys shell (`474.73 ms`) + fixed capture wait (`150 ms`)
- the full hotkey-to-replaced-text flow has an additional post-generation floor of roughly `594.73 ms`: replace SendKeys shell (`474.73 ms`) + fixed replace wait (`120 ms`)
- combined, the current non-model desktop path costs about `1.61 s` before renderer work, provider latency, or network variance

That last number is an inference from isolated timings, not an end-to-end trace, but it is grounded in the current code path and fresh measurements.

### Test-runtime evidence

- root tests are green, but the browser-extension package still dominates the test command wall time
- extension test output reported only `12` tests across `4` files, yet the package consumed `31.78 s` inside the root `46.51 s` test run
- the extension Vitest config defaults to Node in [C:\Users\cvane\V\apps\browser-extension\vitest.config.ts:4](C:\Users\cvane\V\apps\browser-extension\vitest.config.ts#L4), while the DOM-heavy overlay test opts into jsdom at [C:\Users\cvane\V\apps\browser-extension\src\tests\suggestionOverlay.test.ts:1](C:\Users\cvane\V\apps\browser-extension\src\tests\suggestionOverlay.test.ts#L1)

## What changed since the June 27 audit

Two earlier recommendations should be considered partially or fully addressed already:

- settings/admin UI is still lazy-loaded from [C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx:4](C:\Users\cvane\V\apps\desktop\src\renderer\App.tsx#L4)
- local diagnostics are no longer just raw counters; the app now exposes activation funnel, time-to-first-success, failure reasons, domain hotspots, and recent events in [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:264](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L264) and [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:42](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L42)

That means the top audit priority has shifted back to user-visible desktop latency and extension runtime scope.

## Highest-leverage findings

### 1. Core product functionality and reliability: the desktop rewrite path is still dominated by per-interaction PowerShell

Evidence:

- active-window lookup shells out on every hotkey in [C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:6](C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts#L6)
- capture shells out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:17](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L17)
- replace shells out again in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:50](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L50)
- fixed waits remain in [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:20](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L20) and [C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:55](C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts#L55)
- fresh timing averages put the non-model desktop path at about `1.61 s` of overhead before any AI/network time

Why it matters:

- this is still the clearest source of user-visible sluggishness
- it affects first impression, trust, and success rate at the exact moment the product is supposed to feel instantaneous

Highest-leverage fix:

- replace the PowerShell-based active-window and key-simulation path with either direct Win32 bindings inside Electron main or one resident native helper process

Success measure:

- add explicit timings for `hotkey_triggered -> active_window_resolved -> capture_selected -> hotkey_panel_ready -> replace_succeeded`
- target sub-`250 ms` p50 for capture-stage overhead and remove the fixed sleeps entirely if the replacement path can confirm completion more directly

### 2. UI/UX, marketing, and reliability: the extension still injects a large content script into every page and every frame

Evidence:

- manifest matches all pages at [C:\Users\cvane\V\apps\browser-extension\manifest.json:14](C:\Users\cvane\V\apps\browser-extension\manifest.json#L14)
- manifest injects in all frames at [C:\Users\cvane\V\apps\browser-extension\manifest.json:17](C:\Users\cvane\V\apps\browser-extension\manifest.json#L17)
- the injected script still installs global listeners for `focusin`, `input`, `scroll`, `focusout`, and `visibilitychange` in [C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:362](C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts#L362)
- current built content script is `148060` bytes

Why it matters:

- this keeps passive browser overhead and compatibility risk higher than necessary
- it also makes the product harder to market as "lightweight" because it behaves like a broad injector rather than a narrowly activated writing helper

Highest-leverage fix:

- move from unconditional content-script coverage toward earlier eligibility gating
- best path: keep broad host coverage only if needed, but use a lighter bootstrap that activates the full logic only after a supported editable field is detected
- second-best path: keep the current bootstrap but disable `all_frames` except for domains that genuinely need iframe support

Success measure:

- log `content_script_bootstrapped`, `supported_field_seen`, and `full_runtime_activated` events
- compare activation ratio to total injections by domain and by frame type

### 3. Admin and analytics pipeline: diagnostics are materially better now, but they are not segmented by release/version

Evidence:

- diagnostic event shape currently contains `eventName`, `source`, `status`, `stage`, `latencyMs`, and `detail` in [C:\Users\cvane\V\packages\shared\src\types\index.ts:172](C:\Users\cvane\V\packages\shared\src\types\index.ts#L172)
- the desktop logger persists only those fields in [C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts:172](C:\Users\cvane\V\apps\desktop\src\main\diagnostics.ts#L172)
- current diagnostics UI already surfaces funnel and domain summaries in [C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx:42](C:\Users\cvane\V\apps\desktop\src\renderer\components\DiagnosticsCard.tsx#L42)
- this run found no app-version or release-channel tagging in the current diagnostics path

Why it matters:

- the owner can now inspect local behavior, but cannot reliably compare whether a new build improved or regressed activation, bridge reliability, or extension outcomes

Highest-leverage fix:

- attach `appVersion`, `extensionVersion`, and a simple `releaseChannel` field to diagnostic events
- surface a "since current version installed" view next to the existing 7-day rollup

Success measure:

- after the next release, the owner can compare success/failure/latency deltas by version without exporting raw JSON

### 4. Reliability/performance pipeline: the test suite is green, but the browser-extension package is still too slow for the amount of coverage it provides

Evidence:

- root test command passed, but `npm run test` still took `46513.95 ms`
- browser-extension tests account for most of that wall time even though they cover only `12` assertions across `4` files
- the DOM overlay test is isolated in jsdom at [C:\Users\cvane\V\apps\browser-extension\src\tests\suggestionOverlay.test.ts:1](C:\Users\cvane\V\apps\browser-extension\src\tests\suggestionOverlay.test.ts#L1)

Why it matters:

- a slow test loop discourages adding the next tier of extension coverage
- the current runtime cost is disproportionately high relative to the small surface being exercised

Highest-leverage fix:

- split extension tests into fast Node-only logic tests and a separate, intentionally small DOM suite
- if Vitest startup remains the dominant cost, run the DOM suite as a separate script so routine local validation can stay fast

Success measure:

- keep the default extension test command under `10 s` wall time while preserving one DOM suite for overlay behavior

### 5. Content and marketing pipeline: the repo still explains setup better than value

Evidence:

- [C:\Users\cvane\V\README.md:1](C:\Users\cvane\V\README.md#L1) explains the product and setup well enough for a developer
- there is still no user-facing landing surface, install walkthrough, or measurable "first successful rewrite in under one minute" flow in the repo

Why it matters:

- even if the product works, growth remains bottlenecked if the owner cannot send one link that proves the value quickly and clearly

Highest-leverage fix:

- build one lightweight install/value surface around three proof points: faster in-place rewriting, privacy/local control, and browser-plus-desktop coverage
- the page should connect directly to diagnostics by defining a measurable onboarding path

Success measure:

- first-launch to first-success median can be tied to one documented onboarding flow instead of generic setup docs

### 6. Monetization pipeline: still too early for checkout work, but ready for one activation-based pricing hypothesis

Evidence:

- there is still no billing or entitlements code in the current repo
- diagnostics are now strong enough to support activation and repeated-use measurement locally

Why it matters:

- the product is closer to answering whether users get repeated value, but not yet close to pricing implementation

Highest-leverage fix:

- define one monetization hypothesis only after the owner can see repeat rewrite behavior and desktop-vs-extension adoption by version

Success measure:

- a pricing decision is based on measured usage patterns, not intuition

## Pipeline goals for the next implementation pass

### 1. Core product functionality

- make the desktop hotkey flow feel immediate by removing PowerShell from the hot path

### 2. Content pipeline

- define one short, repeatable first-value demo flow tied to diagnostics

### 3. Marketing pipeline

- create one user-facing install/value page instead of relying on README-only onboarding

### 4. UI/UX pipeline

- reduce passive extension activation cost and preserve the lean panel path

### 5. Admin pipeline

- make diagnostics version-aware so releases can be compared cleanly

### 6. Data/analytics pipeline

- keep current local funnel metrics, then add version and activation-stage segmentation

### 7. Reliability/performance pipeline

- shorten the extension test loop and expand only the highest-risk browser behavior coverage

### 8. Monetization/revenue pipeline

- hold checkout work until repeated-value evidence is visible in the new diagnostics segments

## Recommended implementation order

1. Replace the PowerShell hot path with direct Win32 or a resident helper, then re-measure hotkey-to-panel and replace latency.
2. Reduce extension activation scope by introducing a lighter bootstrap or by removing unnecessary `all_frames` injection.
3. Add release/version metadata to diagnostic events and show "current version" health alongside the existing 7-day summary.
4. Split extension tests into fast default logic coverage and a smaller opt-in DOM suite.
5. Build one install/value surface after the first three changes are measurable.

## Exact next measurements to add if evidence is still missing

- End-to-end trace of `hotkey_triggered -> hotkey_panel_ready` in a real desktop rewrite session after the PowerShell removal.
- Injection-to-activation ratio per domain after the extension bootstrap is narrowed.
- Version-segmented activation and failure deltas after the next release.
- Default extension test wall time before and after DOM-suite isolation.

## Commands used in this audit

```powershell
cd C:\Users\cvane\V
git rev-parse --show-toplevel
git status --short --branch
git remote -v
npm run build
npm run test
npm run lint
```
