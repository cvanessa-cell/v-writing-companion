# Admin Pipeline Report

Implemented in this run:

- Added a local diagnostics store in SQLite for privacy-safe operational events.
- Added diagnostics export via the desktop renderer so the owner can copy JSON state quickly.
- Surfaced last failure, last successful rewrite, recent event history, and latency aggregates in settings.

Operational impact:

- The owner can answer "is V working today?" without opening raw SQLite tables.
- Failures now have stage-level labels such as capture, rewrite, replace, and suggest.
