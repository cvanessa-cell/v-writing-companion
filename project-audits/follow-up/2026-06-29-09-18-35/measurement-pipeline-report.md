# Measurement Pipeline Report

## Measurements Reviewed

- lint/test/build pass status
- extension test split behavior
- existing local diagnostics summary
- June 29 performance audit timings and activation scope findings

## Improvements Applied

1. Every diagnostic event now carries release metadata in its stored detail payload.
2. Extension diagnostics now add:
   - `content_script_bootstrapped`
   - `supported_field_seen`
   - `full_runtime_activated`
3. The diagnostics UI now surfaces current-release health and activation ratios.

## Current Key Product Metrics

- app launches
- hotkeys triggered
- rewrites completed/failed
- replace succeeded/failed
- extension rewrite accepted
- suggestion shown/accepted
- bridge connected/unavailable
- activation blocked
- content script bootstrapped
- supported field seen
- full runtime activated

## Missing Measurements

1. End-to-end hotkey-to-panel trace after PowerShell removal
2. Per-domain/frame activation ratios
3. Onboarding completion and repeat use outside local-only diagnostics
4. Public acquisition funnel metrics

## Admin Review Path

- Open settings
- Review diagnostics summary and current release health
- Copy diagnostics JSON if deeper inspection is needed
