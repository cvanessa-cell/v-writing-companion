# Performance Audit - 2026-06-26

## Scope

- Active project folder: [`C:\Users\cvane\V`](C:/Users/cvane/V)
- Git state at audit start: `main...origin/main`
- Working tree at audit start:
  - modified: [`C:\Users\cvane\V\apps\desktop\src\main\index.ts`](C:/Users/cvane/V/apps/desktop/src/main/index.ts)
  - untracked: [`C:\Users\cvane\V\.assistant-runs`](C:/Users/cvane/V/.assistant-runs)
  - untracked: [`C:\Users\cvane\V\docs\performance-audit-2026-06-25.md`](C:/Users/cvane/V/docs/performance-audit-2026-06-25.md)
  - untracked: [`C:\Users\cvane\V\project-audits\follow-up\2026-06-25-11-58-34-recovery`](C:/Users/cvane/V/project-audits/follow-up/2026-06-25-11-58-34-recovery)
- Pre-existing user changes were left intact.

## Project Summary

V is a Windows writing companion with four main product surfaces:

- Electron tray app for hotkey capture, rewrite panel, settings, and local memory
- Browser extension for in-field rewrite/suggestion flows
- Local HTTP bridge between the extension and desktop app
- Local SQLite store for settings, history, rules, and exclusions

Primary implementation files reviewed:

- hotkey entry path: [`C:\Users\cvane\V\apps\desktop\src\main\index.ts`](C:/Users/cvane/V/apps/desktop/src/main/index.ts)
- active window lookup: [`C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts`](C:/Users/cvane/V/apps/desktop/src/main/activeWindow.ts)
- clipboard capture/replace: [`C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts`](C:/Users/cvane/V/apps/desktop/src/main/clipboard.ts)
- extension injection flow: [`C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts`](C:/Users/cvane/V/apps/browser-extension/src/contentScript.ts)
- extension manifest: [`C:\Users\cvane\V\apps\browser-extension\manifest.json`](C:/Users/cvane/V/apps/browser-extension/manifest.json)
- desktop settings and memory UI: [`C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx`](C:/Users/cvane/V/apps/desktop/src/renderer/components/SettingsPage.tsx), [`C:\Users\cvane\V\apps\desktop\src\renderer\components\MemoryCenter.tsx`](C:/Users/cvane/V/apps/desktop/src/renderer/components/MemoryCenter.tsx)

## Verification

### Quality gates

- `npm run build`: passed in `34400.15 ms`
- `npm run test`: passed in `57658.59 ms`
- `npm run lint`: passed in `33722.16 ms`

### Current artifact sizes

- desktop main bundle: `54.66 kB`
- desktop preload bundle: `1.94 kB`
- desktop renderer JS bundle: `354.73 kB`
- extension content script bundle: `139783` bytes

### Current measured latency evidence

- bare `powershell.exe -NoProfile -NonInteractive -Command "[void]0"` spawn samples: `543.18`, `573.93`, `1628.07`, `762.56`, `897.46` ms
- average bare PowerShell spawn: `881.04 ms`

### Current measured test overhead evidence

- browser-extension tests still only cover `4` assertions, but the suite took `36.49s`
- most of that time is not test logic; Vitest reported `38 ms` of test execution with very large environment time
- current extension Vitest config forces `jsdom` for the whole package in [`C:\Users\cvane\V\apps\browser-extension\vitest.config.ts`](C:/Users/cvane/V/apps/browser-extension/vitest.config.ts)

## What Changed Since The 2026-06-25 Audit

These earlier findings are no longer the right top priorities:

- root release validation is no longer incomplete: root [`C:\Users\cvane\V\package.json`](C:/Users/cvane/V/package.json) now builds both desktop and extension
- root `build`, `test`, and `lint` are all green again
- privacy exclusions are now visible and removable in [`C:\Users\cvane\V\apps\desktop\src\renderer\components\MemoryCenter.tsx`](C:/Users/cvane/V/apps/desktop/src/renderer/components/MemoryCenter.tsx)
- the extension no longer polls settings blindly on every hidden page; polling is visibility-aware in [`C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts`](C:/Users/cvane/V/apps/browser-extension/src/contentScript.ts)

The refreshed audit should focus on the issues below instead.

## Highest-Leverage Findings

### 1. Reliability/performance pipeline: the desktop hotkey path still burns time before any AI call

Evidence:

- hotkey flow starts in [`C:\Users\cvane\V\apps\desktop\src\main\index.ts:143`](C:/Users/cvane/V/apps/desktop/src/main/index.ts:143)
- that flow awaits `getActiveWindow()` before capture in [`C:\Users\cvane\V\apps\desktop\src\main\index.ts:148`](C:/Users/cvane/V/apps/desktop/src/main/index.ts:148)
- [`C:\Users\cvane\V\apps\desktop\src\main\activeWindow.ts:38`](C:/Users/cvane/V/apps/desktop/src/main/activeWindow.ts:38) shells out to `powershell.exe` every time
- [`C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:14`](C:/Users/cvane/V/apps/desktop/src/main/clipboard.ts:14) shells out again for `SendKeys`
- [`C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:23`](C:/Users/cvane/V/apps/desktop/src/main/clipboard.ts:23) adds an explicit `150 ms` wait after copy
- [`C:\Users\cvane\V\apps\desktop\src\main\clipboard.ts:56`](C:/Users/cvane/V/apps/desktop/src/main/clipboard.ts:56) adds an explicit `120 ms` wait after paste
- the machine-level PowerShell startup average on this run was `881.04 ms`

Interpretation:

- this is still the highest-confidence user-facing latency risk
- even with a fast provider, the app can spend 1-3 seconds in OS plumbing before the rewrite panel is useful

Highest-leverage fix:

- remove per-interaction PowerShell spawning from the hotkey path
- replace it with one of:
  - native Electron/Node Win32 bindings for foreground window and input simulation
  - a long-lived helper process that keeps the interop loaded
  - a resident automation bridge that batches foreground-window and clipboard operations

Required measurement to add next:

- timestamp hotkey pressed
- timestamp active window resolved
- timestamp copy start / copy finish
- timestamp panel shown
- timestamp AI request start / finish
- timestamp replace start / finish

Success measure:

- p50 and p95 hotkey-to-panel latency
- p50 and p95 replace latency
- capture failure rate grouped by cause

### 2. Reliability/performance pipeline: browser-extension test runtime is disproportionate to the code under test

Evidence:

- [`C:\Users\cvane\V\apps\browser-extension\src\tests\fieldDetector.test.ts`](C:/Users/cvane/V/apps/browser-extension/src/tests/fieldDetector.test.ts) and [`C:\Users\cvane\V\apps\browser-extension\src\tests\typingMonitor.test.ts`](C:/Users/cvane/V/apps/browser-extension/src/tests/typingMonitor.test.ts) together contain only `4` tests
- runtime on this run was `36.49s`
- test logic itself only consumed `38 ms`
- package-wide `jsdom` is configured in [`C:\Users\cvane\V\apps\browser-extension\vitest.config.ts`](C:/Users/cvane/V/apps/browser-extension/vitest.config.ts)

Interpretation:

- the extension test suite is paying high environment startup cost relative to its value
- that makes regression feedback slower and discourages adding more tests in the riskiest surface

Highest-leverage fix:

- split pure logic tests from DOM-required tests
- keep DOM-free tests on `node`
- use per-file environment overrides for the small number of tests that genuinely require `jsdom`
- if DOM coverage expands, benchmark `happy-dom` versus `jsdom` before standardizing

Required measurement to add next:

- separate `node` and DOM test timing for the extension package
- record cold and warm test runtimes after the split

Success measure:

- browser-extension test wall time drops materially while preserving coverage

### 3. UI/UX pipeline: extension behavior is still broad and modal-heavy

Evidence:

- content script injects on `<all_urls>` in [`C:\Users\cvane\V\apps\browser-extension\manifest.json:14`](C:/Users/cvane/V/apps/browser-extension/manifest.json:14)
- content script runs in `all_frames` in [`C:\Users\cvane\V\apps\browser-extension\manifest.json:17`](C:/Users/cvane/V/apps/browser-extension/manifest.json:17)
- rewrite failure still uses `alert(...)` in [`C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:119`](C:/Users/cvane/V/apps/browser-extension/src/contentScript.ts:119)
- rewrite confirmation still uses `confirm(...)` in [`C:\Users\cvane\V\apps\browser-extension\src\contentScript.ts:123`](C:/Users/cvane/V/apps/browser-extension/src/contentScript.ts:123)
- the bundle is still relatively large for a global content script at `139783` bytes

Interpretation:

- the old “settings polling” issue has been reduced, but the extension is still shipped as a broad-injection prototype
- compatibility risk, support burden, and perceived polish are now the more important extension concerns

Highest-leverage fix:

- replace `alert` and `confirm` with an inline review tray or suggestion card that matches the product feel
- gate activation earlier so the heavy UI logic only initializes when a supported editable field is involved
- benchmark whether `<all_urls>` and `all_frames` can be narrowed without breaking priority workflows

Required measurement to add next:

- count button injections
- count rewrite requests
- count accept / dismiss / bridge-unavailable outcomes
- count per-domain failures

Success measure:

- lower bridge-error rate
- measurable rewrite acceptance rate
- smaller compatibility surface

### 4. Data/analytics pipeline: product instrumentation is still effectively absent

Evidence:

- source search still found no runtime analytics, telemetry, or error-reporting SDK usage in the active app code
- rewrite history remains optional and defaults to off in [`C:\Users\cvane\V\apps\desktop\src\main\database.ts:124`](C:/Users/cvane/V/apps/desktop/src/main/database.ts:124)
- settings UI shows provider state and bridge URL, but not funnel metrics, error counts, or latency summaries in [`C:\Users\cvane\V\apps\desktop\src\renderer\components\SettingsPage.tsx`](C:/Users/cvane/V/apps/desktop/src/renderer/components/SettingsPage.tsx)

Interpretation:

- product, marketing, and monetization decisions are still not evidence-backed
- there is no current answer to where first-value fails: setup, provider auth, capture, bridge, AI, or replace

Highest-leverage fix:

- add privacy-safe local event logging first
- expose an exportable local diagnostics view in settings before deciding on any remote analytics stack

Minimum events to log:

- app launched
- onboarding completed
- provider configured
- first successful rewrite
- replace attempted / succeeded / failed
- extension bridge connected
- suggestion shown / accepted / dismissed
- bridge unavailable
- capture blocked by sensitive text or exclusion

Success measure:

- local activation funnel visible inside settings
- latency and failure counts grouped by stage

### 5. Marketing pipeline: product positioning exists, but acquisition is still not built

Evidence:

- [`C:\Users\cvane\V\README.md`](C:/Users/cvane/V/README.md) is clearer than before, but it is still setup-oriented
- no landing page, install funnel, demo page, pricing page, or acquisition telemetry surface was found in the repo

Interpretation:

- the repo now explains the product to a developer, but not to a prospective user deciding whether to install it

Highest-leverage fix:

- create one product-facing landing surface with:
  - what V does
  - where it works
  - privacy defaults
  - one-minute first-value path
- capture one short demo for desktop rewrite and one for browser-field rewrite

Success measure:

- install path exists
- onboarding completion and first rewrite can be measured from that path

### 6. Admin pipeline: settings are functional, but not yet operational

Evidence:

- settings can change provider, timing, exclusions, and history
- memory center can now inspect/delete exclusions
- there is still no visible operations surface for:
  - last bridge handshake
  - recent rewrite failures by type
  - median hotkey latency
  - recent extension availability failures

Interpretation:

- the owner can configure the product, but cannot yet manage it with evidence

Highest-leverage fix:

- add a small local diagnostics card in settings
- start with:
  - bridge status
  - last successful rewrite timestamp
  - last failure reason
  - rolling latency summary
  - event export

Success measure:

- owner can answer “is V working today?” without reading raw logs or SQLite tables

### 7. Monetization/revenue pipeline: still too early for checkout work

Evidence:

- no billing, plans, checkout, entitlement, or subscription flow was found in the active repo
- there is still no activation baseline to justify pricing work

Interpretation:

- monetization remains downstream of instrumentation and activation

Highest-leverage fix:

- document one packaging hypothesis only after activation metrics exist
- likely options:
  - free local companion plus paid premium memory/rules
  - paid premium for teams/shared rules

Success measure:

- one pricing hypothesis documented against real usage evidence

## Pipeline Goals

### 1. Core product functionality

- make hotkey capture and replace feel immediate
- reduce failure-prone copy/paste automation

### 2. Content pipeline

- create one reusable onboarding/demo script and short capture sequence

### 3. Marketing pipeline

- create one product-facing install/value surface

### 4. UI/UX pipeline

- replace extension modal dialogs with inline review UI
- reduce unnecessary extension activation scope

### 5. Admin pipeline

- add local diagnostics for bridge health, failures, and recent latencies

### 6. Data/analytics pipeline

- add privacy-safe local funnel and error instrumentation with export

### 7. Reliability/performance pipeline

- remove PowerShell from the hot path
- cut extension test overhead

### 8. Monetization/revenue pipeline

- defer billing until activation data exists

## Recommended Implementation Order

1. Instrument the hotkey-to-panel and replace pipeline, then remove per-interaction PowerShell spawning.
2. Split browser-extension tests by environment and re-measure the package runtime.
3. Replace extension `alert`/`confirm` flows with inline review UI and add outcome counters.
4. Add local product instrumentation and a small diagnostics surface in settings.
5. Build a user-facing install/demo surface once activation can be measured.

## Verification Commands

```powershell
cd C:\Users\cvane\V
npm run build
npm run test
npm run lint
```
