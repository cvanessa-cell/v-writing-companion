# Source Comparison: V and IV by Agent V

Date: 2026-07-07

## Compared Sources

| Source | Path | Git state observed |
| --- | --- | --- |
| V writing companion | `C:\Users\cvane\V` | `main...origin/main`; latest commit `2405bef2dd187c7a06dc61b9d2afe1b6fc74df53` on 2026-06-29 |
| IV by Agent V | `C:\Users\cvane\iv-by-agent-v` | `master...origin/master`; latest commit `6554224d3b9205a2cf1b4ceeb0113f0c20de5fb7` on 2026-06-26; local uncommitted edits present |

## Most Current

`C:\Users\cvane\V` is the most current product codebase for V.

Reasons:

- Its latest committed product change is newer: 2026-06-29 versus IV's 2026-06-26 commit.
- It contains the latest local V audit trail, including `docs/performance-audit-2026-07-06.md`.
- Its remote is the V writing companion project: `https://github.com/cvanessa-cell/v-writing-companion.git`.
- The IV repo is a separate product architecture with a Python FastAPI backend, OpenAI Agents SDK orchestration, project-intelligence exports, and broader assistant tooling.

Important nuance: `C:\Users\cvane\iv-by-agent-v` has local file timestamps as late as 2026-06-30 and uncommitted changes. Those make IV locally active, but they do not make it the current V writing companion source.

## Added To Current Source

Added `TOOLS.md` to `C:\Users\cvane\V`.

This imports the useful IV pattern of maintaining a root-level tools and operations reference, but adapts it to the V repo's npm workspace commands, current docs, and product boundaries.

## Valuable IV Elements Identified

The following IV elements are valuable references but were not copied into app code because the repos are structurally different:

- Root tools guide pattern from `C:\Users\cvane\iv-by-agent-v\TOOLS.md`
- Project-intelligence documentation pattern from `C:\Users\cvane\iv-by-agent-v\docs\project-intelligence`
- Verification habit of documenting lint, typecheck, test, build, and smoke commands
- Agent operating-contract pattern from `C:\Users\cvane\iv-by-agent-v\AGENT_CHARTER.md`
- Backend permission/tool-registry concepts under `C:\Users\cvane\iv-by-agent-v\backend\app\tools`

## Not Imported

These were intentionally not merged into V:

- IV backend code, because V currently has no Python backend boundary.
- IV generated project-intelligence JSON, because generated snapshots would be stale immediately without the IV generation pipeline.
- IV billing/subscription layers, because V's current product is a writing companion and needs a product decision before adding pricing infrastructure.
- IV cursor bridge automation, because it depends on IV-specific environment variables, Airtable setup, and Cursor rules.
- IV desktop capture/recording controls, because they change V's privacy and capture surface.

## Rollback

A rollback checkpoint tag was created before documentation edits:

```powershell
git checkout pre-source-compare-2026-07-07-0245
```

Use that only if you want to inspect the exact pre-comparison HEAD. It should not be used to discard unrelated local files.
