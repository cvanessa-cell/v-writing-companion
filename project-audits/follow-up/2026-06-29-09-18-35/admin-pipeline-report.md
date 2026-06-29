# Admin Pipeline Report

## Current Operator Surface

- Desktop settings window is the primary admin/control surface.
- Local diagnostics JSON export exists.
- Exclusion and memory management already exist.

## Improvements Applied

1. Added release-aware diagnostics by attaching:
   - `appVersion`
   - `extensionVersion`
   - `releaseChannel`
2. Added a current-release health summary so the operator can inspect the latest installed build separately from older 7-day noise.
3. Added extension activation telemetry to show:
   - bootstraps
   - supported fields seen
   - full runtime activations

## Why This Matters

The owner can now verify whether a release changed activation behavior or rewrite health without exporting raw rows and manually segmenting versions.

## Remaining Work

1. Add filters by version, date range, and source.
2. Add explicit "since install" timestamps.
3. Add a failed-event drill-down for the current release only.
