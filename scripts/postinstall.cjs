const { execSync } = require("child_process");
try { execSync("npx --yes @electron/rebuild -f -w better-sqlite3", { stdio: "inherit" }); } catch { process.exit(0); }
