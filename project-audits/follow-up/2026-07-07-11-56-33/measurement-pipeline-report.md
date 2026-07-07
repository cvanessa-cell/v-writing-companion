# Measurement Pipeline Report

## Current state

- Local diagnostics already track launches, hotkeys, rewrites, replacement outcomes, bridge outcomes, and extension activation counters.
- Build, lint, and test scripts provide validation evidence but not user-path timing beyond logged events.

## Improvement made

- Added a release comparison layer that groups events by tagged release metadata.
- Added verdict logic that interprets current-release success evidence, error volume, and hotkey latency.
- Added tests for the new summary logic.

## Remaining missing measurements

- Real end-to-end trace from `hotkey_triggered` to `replace_succeeded`
- Renderer milestones such as `panel_renderer_loaded` and `first_option_rendered`
- More reliable previous-release comparisons if version numbers stay static too long

## Recommended next metrics

- Desktop pre-model p50 and p95 by release
- First-success completion rate by release
- Supported-field to full-runtime activation ratio by release
- Release-over-release delta visibility once distinct versions accumulate
