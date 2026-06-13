import re, pathlib
files = [
    pathlib.Path(r"C:/Users/cvane/ID/.env.local"),
    pathlib.Path(r"C:/Users/cvane/PSA_AI_GRADING_APP/.env.local"),
    pathlib.Path(r"C:/Users/cvane/OneDrive/storybook-mvp2/.env.local"),
]
defaults = {
    "OPENAI_API_KEY": "",
    "GEMINI_API_KEY": "",
    "OPENAI_MODEL": "gpt-4o-mini",
    "GEMINI_MODEL": "gemini-2.0-flash",
}
out = {}
src = {}
for f in files:
    if not f.exists():
        continue
    for line in f.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([A-Z0-9_]+)\s*=\s*(.*)$", line.strip())
        if not m:
            continue
        k, v = m.group(1), m.group(2).strip().strip('"').strip("'")
        if k in defaults and v and k not in out:
            out[k] = v
            src[k] = str(f)
final = {**defaults, **out}
lines = ["# Auto-merged from existing project env files"]
for k, v in src.items():
    lines.append(f"# {k} from {v}")
lines.append("")
for k in defaults:
    lines.append(f"{k}={final[k]}")
lines.append("")
pathlib.Path(r"C:/Users/cvane/V/.env").write_text("\n".join(lines), encoding="utf-8")
print("OPENAI:", bool(final["OPENAI_API_KEY"]), "GEMINI:", bool(final["GEMINI_API_KEY"]), "MODEL:", final["OPENAI_MODEL"])
