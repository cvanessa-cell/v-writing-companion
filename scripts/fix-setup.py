import json, pathlib
p = pathlib.Path(r"C:/Users/cvane/V/apps/desktop/package.json")
j = json.loads(p.read_text(encoding="utf-8"))
j["scripts"]["postinstall"] = "node ../../scripts/postinstall.cjs"
p.write_text(json.dumps(j, indent=2), encoding="utf-8")
pathlib.Path(r"C:/Users/cvane/V/scripts/postinstall.cjs").write_text(
    'const { execSync } = require("child_process");\n'
    'try { execSync("npx --yes @electron/rebuild -f -w better-sqlite3", { stdio: "inherit" }); } catch { process.exit(0); }\n',
    encoding="utf-8",
)
pathlib.Path(r"C:/Users/cvane/V/apps/browser-extension/vitest.config.ts").write_text(
    'import { defineConfig } from "vitest/config";\n\nexport default defineConfig({\n  test: { environment: "jsdom" },\n});\n',
    encoding="utf-8",
)
print("fixed")
