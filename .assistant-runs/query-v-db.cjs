const Database = require("better-sqlite3");
const db = new Database("C:/Users/cvane/AppData/Roaming/@v/desktop/data/v-memory.db");
console.log(db.prepare("SELECT key,value FROM settings WHERE key IN ('onboarding_complete','paused','hotkey')").all());
