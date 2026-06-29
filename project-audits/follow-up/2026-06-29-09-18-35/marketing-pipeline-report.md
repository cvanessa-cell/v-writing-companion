# Marketing Pipeline Report

## Current State

- No pricing page
- No email capture
- No referral flow
- No social preview surface
- README/docs act as the main value explanation

## Improvements Applied

1. The extension popup now acts as a small activation-oriented marketing surface:
   - what V does
   - how to get first value
   - why privacy-sensitive users keep it enabled
2. The settings page now reinforces the same activation path with proof from diagnostics.

## Event Map Recommended

- `landing_viewed`: future public landing page only
- `primary_cta_clicked`: future public landing page only
- `upload_started`: not applicable
- `analysis_started`: desktop rewrite trigger or extension rewrite request
- `analysis_completed`: `rewrite_completed` or `extension_rewrite_response`
- `result_viewed`: rewrite options shown or overlay shown
- `result_saved`: future export/share flow
- `result_shared`: not implemented
- `admin_review_opened`: settings diagnostics opened
- `error_encountered`: existing error-status diagnostics

## Remaining Work

1. Build a public landing/install page.
2. Add lightweight social preview assets.
3. Add a measurable install-to-first-success funnel outside local-only diagnostics.
