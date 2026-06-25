# Measurement Pipeline Report

- Current measurable checks are engineering-only: root lint, build, and tests.
- No analytics SDK, no event map implementation, and no error-reporting service are present.
- This run improved one measurable reliability outcome by making root validation cover shared, desktop, and extension surfaces.
- Missing measurements to add next:
  - hotkey pressed to panel shown latency
  - rewrite requested to options shown latency
  - replace clicked to replacement attempted latency
  - extension bridge connection success rate
  - exclusion-triggered inactive states
  - first successful rewrite completion rate
