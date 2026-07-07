# Performance Triage

## Working context

- Project working folder: `C:\Users\cvane\V`
- Project goal: improve owner visibility into release health and first-success evidence while preserving current desktop and extension behavior.
- Latest performance audit: [`C:\Users\cvane\V\docs\performance-audit-2026-07-06.md`](C:\Users\cvane\V\docs\performance-audit-2026-07-06.md)

| Issue | Affected area | Severity | Business impact | Consumer impact | Evidence available | Missing evidence | Likely cause | Highest-leverage fix | Implementation risk | Expected improvement | Files likely affected |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| Desktop hotkey path has about 1.39 s pre-model overhead | Core functionality, reliability | Critical | Weakens product differentiation and repeat use | Feels slow at the key value moment | Fresh timing samples and code references in the July 6 audit | Real traced end-to-end native session timing | Per-action PowerShell plus fixed sleeps | Replace PowerShell path with native Win32 or resident helper | High | Large latency reduction | `apps/desktop/src/main/index.ts`, `activeWindow.ts`, `clipboard.ts` |
| Extension still injects on all URLs and all frames | Reliability, UX, marketing | High | Increases compatibility/support burden | Risk of low-value activation on unrelated pages | Manifest and content-script references in audit | Per-domain/frame activation ratios after narrowing | Broad bootstrap policy | Split bootstrap/runtime and narrow activation heuristics | Medium to high | Lower extension footprint and clearer telemetry | `apps/browser-extension/manifest.json`, `contentScript.ts` |
| Diagnostics stop short of owner verdicts and release deltas | Admin, data, product management | High | Owner cannot quickly decide if a release helped | Users do not directly feel this, but product iteration slows | Existing diagnostics UI and release-tagged storage | Previous tagged release evidence on machines without older rows | Raw summaries only, no comparison layer | Add release verdict and prior-release comparison surface | Low | Faster release decisions and clearer first-success status | `apps/desktop/src/main/diagnostics.ts`, renderer settings UI |
| Renderer cost not separated from desktop capture cost | Performance, UI | Medium | Harder to prioritize bundle work correctly | Delay source is unclear | Bundle sizes and audit notes | Renderer timing instrumentation | Missing renderer milestones | Add renderer timing events before bundle surgery | Medium | Better optimization targeting | `apps/desktop/src/renderer/*`, diagnostics pipeline |
| Onboarding proof remains mostly developer-facing | Content, marketing, trust | Medium | Slows adoption and message clarity | Users may not understand first-value path quickly | README/setup docs and settings checklist | Dedicated consumer landing usage data | Missing consumer-facing proof surface | Promote first-success path and tie it to diagnostics | Low | Clearer activation path | `README.md`, settings/onboarding UI |
| Monetization is not yet backed by usage cohorts | Monetization | Low | Prevents credible pricing decisions | No direct user harm yet | Diagnostics counts and repo inventory | Repeat-usage cohort evidence | Early-stage product instrumentation | Wait on billing, use diagnostics to frame pricing hypothesis | Low | Better future pricing decisions | docs and analytics surfaces |

## Chosen implementation slice

This run implements the third item first: owner-facing release verdicts and comparison scaffolding. It is the highest-confidence change that directly answers a top audit gap, uses existing measurements, and keeps the repo stable while larger native or extension-runtime changes remain open.
