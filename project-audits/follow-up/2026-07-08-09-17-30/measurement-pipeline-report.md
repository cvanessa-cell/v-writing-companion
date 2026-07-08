# Measurement Pipeline Report

## Existing measurement surface

- Local privacy-safe event logging for desktop, extension, and renderer
- Release-tagged diagnostics and latency summaries

## Improvements shipped

- Added `panel_renderer_loaded`
- Added `first_option_rendered`
- Added release-comparison deltas for the new renderer milestones
- Added a checked-in packaging verification snapshot used by the diagnostics UI

## Remaining missing evidence

- Full `hotkey_triggered -> replace_succeeded` end-to-end trace
- Real packaged-installer smoke test, not just unpacked artifact generation
- Consumer-facing activation funnel events
