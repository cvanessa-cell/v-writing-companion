# Measurement Pipeline Report

## Existing measurement

- Local diagnostics event store in SQLite
- Latency summaries for desktop and extension stages
- New derived funnel and domain-outcome summaries in settings

## Improvements applied

- Added derived metrics from the existing event stream:
  - activation rate
  - desktop rewrite success rate
  - replace success rate
  - extension engagement rate
  - time to first successful rewrite
  - per-domain success/failure/block summaries
- Added DOM tests for overlay and bridge-unavailable UI

## Missing measurements

- explicit `provider_connected`
- explicit `first_desktop_rewrite_requested`
- explicit `first_browser_rewrite_requested`
- explicit `first_result_accepted`
- explicit onboarding completion milestone

## Where events should fire next

- Provider save/validation path in desktop settings
- First successful desktop rewrite request in `ipcMain.handle('v:rewrite')`
- First successful browser rewrite request in bridge handlers
- First accepted result in desktop panel and extension overlay actions

## Key reliability metrics

- `hotkey_panel_ready` p50/p95
- `capture_selected` p50/p95
- `replace_selected_text` p50/p95
- bridge unavailable rate by domain
- extension blocked rate by domain
