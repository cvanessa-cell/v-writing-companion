import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { mkdirSync } from 'fs';

let db: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT,
  style_summary TEXT,
  preferred_tone TEXT,
  formality_level INTEGER DEFAULT 50,
  directness_level INTEGER DEFAULT 50,
  warmth_level INTEGER DEFAULT 50,
  detail_level INTEGER DEFAULT 50,
  emoji_preference INTEGER DEFAULT 0,
  phrases_to_use TEXT,
  phrases_to_avoid TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS writing_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  source TEXT,
  confidence REAL DEFAULT 0.5,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_context_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT,
  domain TEXT,
  writing_mode TEXT,
  rule_summary TEXT,
  format_rules TEXT,
  tone_rules TEXT,
  length_rules TEXT,
  privacy_rules TEXT,
  examples TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audience_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audience_name TEXT NOT NULL,
  relationship_type TEXT,
  tone_preference TEXT,
  communication_strategy TEXT,
  formality_level INTEGER DEFAULT 50,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subject_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_name TEXT NOT NULL,
  summary TEXT,
  vocabulary TEXT,
  known_facts TEXT,
  uncertain_facts TEXT,
  do_not_invent INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rewrite_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_text TEXT,
  rewritten_text TEXT,
  app_name TEXT,
  domain TEXT,
  writing_goal TEXT,
  audience TEXT,
  subject TEXT,
  action_type TEXT,
  user_selected INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS remembered_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  example_type TEXT,
  original_text TEXT,
  improved_text TEXT,
  lesson_learned TEXT,
  approved_by_user INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS excluded_apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS excluded_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diagnostic_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  stage TEXT,
  latency_ms REAL,
  detail_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

const DEFAULT_SETTINGS: Record<string, string> = {
  hotkey: 'CommandOrControl+Shift+Space',
  ai_provider: 'openai',
  memory_enabled: 'true',
  rewrite_history_enabled: 'false',
  clipboard_mode: 'false',
  realtime_suggestions: 'false',
  rewrite_only_selected: 'true',
  privacy_indicator: 'true',
  onboarding_complete: 'false',
  bridge_port: '47821',
  paused: 'false',
  realtime_pause_ms: '1200',
  min_chars_for_suggestion: '20',
  speech_cleanup_mode: 'auto',
  extension_domain_mode: 'all',
  extension_allowed_domains: '',
};

export function getDbPath(): string {
  const dir = join(app.getPath('userData'), 'data');
  mkdirSync(dir, { recursive: true });
  return join(dir, 'v-memory.db');
}

export function initDatabase(): Database.Database {
  if (db) return db;
  db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)',
  );
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insertSetting.run({ key, value });
  }

  const profileCount = db.prepare('SELECT COUNT(*) as c FROM user_profile').get() as { c: number };
  if (profileCount.c === 0) {
    db.prepare('INSERT INTO user_profile (display_name, preferred_tone) VALUES (?, ?)').run('User', 'balanced');
  }

  seedDefaultAppRules(db);
  return db;
}

function seedDefaultAppRules(database: Database.Database): void {
  const count = (database.prepare('SELECT COUNT(*) as c FROM app_context_rules').get() as { c: number }).c;
  if (count > 0) return;

  const insert = database.prepare(`
    INSERT INTO app_context_rules (app_name, domain, writing_mode, rule_summary, format_rules, tone_rules, length_rules)
    VALUES (@app_name, @domain, @writing_mode, @rule_summary, @format_rules, @tone_rules, @length_rules)
  `);

  const defaults = [
    { app_name: 'Gmail', domain: 'mail.google.com', writing_mode: 'email', rule_summary: 'Professional email structure', format_rules: 'Greeting, body, sign-off', tone_rules: 'Warm professional', length_rules: 'Concise' },
    { app_name: 'Google Docs', domain: 'docs.google.com', writing_mode: 'notes', rule_summary: 'Preserve document flow', format_rules: 'Paragraph structure', tone_rules: 'Match document purpose', length_rules: 'Context-dependent' },
    { app_name: 'Facebook', domain: 'facebook.com', writing_mode: 'social_post', rule_summary: 'Conversational social tone', format_rules: 'Short natural sentences', tone_rules: 'Authentic and warm', length_rules: 'Short' },
    { app_name: 'Cursor', domain: null, writing_mode: 'dev_prompt', rule_summary: 'Implementation-ready prompts', format_rules: 'Goal, context, steps, acceptance criteria', tone_rules: 'Precise technical', length_rules: 'Structured complete' },
    { app_name: 'Forms', domain: null, writing_mode: 'legal_form', rule_summary: 'Direct complete answers', format_rules: 'Answer directly', tone_rules: 'Neutral factual', length_rules: 'Minimal necessary' },
    { app_name: 'Reviews', domain: null, writing_mode: 'review_complaint', rule_summary: 'Fair specific reviews', format_rules: 'What happened, impact, recommendation', tone_rules: 'Balanced factual', length_rules: 'Medium' },
  ];

  const tx = database.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  tx(defaults);
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function getSetting(key: string, fallback = ''): string {
  const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string): void {
  getDatabase()
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    )
    .run(key, value);
}

export function isPaused(): boolean {
  return getSetting('paused', 'false') === 'true';
}

export function isAppExcluded(appName: string): boolean {
  const row = getDatabase()
    .prepare('SELECT id FROM excluded_apps WHERE lower(app_name) = lower(?)')
    .get(appName);
  return Boolean(row);
}

export function isDomainExcluded(domain: string): boolean {
  const row = getDatabase()
    .prepare('SELECT id FROM excluded_domains WHERE lower(domain) = lower(?)')
    .get(domain);
  return Boolean(row);
}
