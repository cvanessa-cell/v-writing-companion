# App Rules Library

Built-in rules guide rewrites by context. Defaults are seeded in SQLite on first run.

| Context | Format | Tone | Length |
|---|---|---|---|
| Gmail / email | Greeting, body, sign-off | Warm professional | Concise |
| Google Docs | Paragraph structure | Match document | Context-dependent |
| Facebook / social | Short natural sentences | Authentic | Short |
| Forms | Direct answers | Neutral factual | Minimal |
| Reviews | What happened, impact, recommendation | Balanced | Medium |
| Cursor / ChatGPT | Goal, steps, acceptance criteria | Precise technical | Structured |

View rules in Settings → Rules. Custom app rules can be added via Memory → apps.

See `packages/shared/src/utils/index.ts` for default rule definitions.
