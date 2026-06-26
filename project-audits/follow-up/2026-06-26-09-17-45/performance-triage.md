# Performance Triage

PROJECT WORKING FOLDER:

[C:\Users\cvane\V](/C:/Users/cvane/V)

PROJECT GOAL:

Turn the June 26 audit into safe product improvements with measurable diagnostics, faster feedback loops, and lower-friction extension UX.

LATEST PERFORMANCE AUDIT:

[C:\Users\cvane\V\docs\performance-audit-2026-06-26.md](/C:/Users/cvane/V/docs/performance-audit-2026-06-26.md)

| Issue | Affected Area | Severity | Business Impact | Consumer Impact | Evidence Available | Missing Evidence | Likely Cause | Highest-Leverage Fix | Implementation Risk | Expected Improvement | Files Likely Affected |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| Desktop hotkey path lacks stage timings and owner visibility | Reliability/performance, admin | High | Hard to diagnose first-value failures | Slow or broken rewrites feel random | Audit timing + code review | In-app hotkey stage traces | No persisted stage metrics | Add local diagnostics events and settings diagnostics card | Low | Owner can see active-window, capture, rewrite, and replace timing locally | [apps/desktop/src/main/index.ts](/C:/Users/cvane/V/apps/desktop/src/main/index.ts), [apps/desktop/src/main/diagnostics.ts](/C:/Users/cvane/V/apps/desktop/src/main/diagnostics.ts) |
| Extension tests pay too much environment cost | Reliability/performance | High | Slower regression loop discourages coverage | Slower fixes ship later | Audit timing and current Vitest setup | Warm/cold trend over time | Package-wide `jsdom` default | Split tests by per-file environment and default to `node` | Low | Extension tests dropped from 36.49s in audit to about 1.00s on this run | [apps/browser-extension/vitest.config.ts](/C:/Users/cvane/V/apps/browser-extension/vitest.config.ts), [apps/browser-extension/src/tests](/C:/Users/cvane/V/apps/browser-extension/src/tests) |
| Extension manual rewrite used blocking modal dialogs | UI/UX, trust | High | Prototype feel and support burden | Disruptive accept/dismiss flow | Audit evidence in content script | Acceptance/dismiss rates across sites | `alert` and `confirm` flow | Replace modals with inline overlay review and status states | Medium | Smoother review flow and event visibility | [apps/browser-extension/src/contentScript.ts](/C:/Users/cvane/V/apps/browser-extension/src/contentScript.ts), [apps/browser-extension/src/suggestionOverlay.ts](/C:/Users/cvane/V/apps/browser-extension/src/suggestionOverlay.ts) |
| Product instrumentation was effectively absent | Data/analytics, admin | High | No activation or failure evidence for roadmap | Failures are opaque | Audit repo search | Longitudinal usage metrics | No event store or diagnostics surface | Persist privacy-safe local events and expose exportable summaries | Low | Local funnel and failure visibility without adding hosted telemetry | [apps/desktop/src/main/database.ts](/C:/Users/cvane/V/apps/desktop/src/main/database.ts), [apps/desktop/src/preload/index.ts](/C:/Users/cvane/V/apps/desktop/src/preload/index.ts), [apps/desktop/src/renderer/components/DiagnosticsCard.tsx](/C:/Users/cvane/V/apps/desktop/src/renderer/components/DiagnosticsCard.tsx) |
| Marketing and landing surfaces still absent | Marketing/content | Medium | No acquisition path | New users rely on setup docs | README + audit review | Demo capture and funnel telemetry | Product is still desktop-first and internal-facing | Leave as documented follow-up after instrumentation baseline exists | Low | Better sequencing of future growth work | [README.md](/C:/Users/cvane/V/README.md), [docs](/C:/Users/cvane/V/docs) |
