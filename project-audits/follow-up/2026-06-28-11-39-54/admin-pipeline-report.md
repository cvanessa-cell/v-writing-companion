# Admin Pipeline Report

## Findings

- The owner needed quicker answers to “is setup working?”, “which domains are problematic?”, and “did anyone get to first value?”
- Local diagnostics existed, but they were still too event-list oriented

## Improvements applied

- Added derived funnel metrics in diagnostics:
  - activation rate
  - desktop rewrite success rate
  - replace success rate
  - extension engagement rate
  - first success after launch
- Added domain outcome rollups showing successes, failures, blocks, and last activity

## Operational impact

- The owner can triage local setup and domain issues without reading raw JSON first
- Domain-level scope decisions now have evidence support

## Remaining admin work

1. Add explicit provider-connected and first-value events.
2. Add a simple trend view by day for successes and failures.
3. Add packaging/release health once a stable release path exists.
