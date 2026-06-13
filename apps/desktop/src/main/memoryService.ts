import { getDatabase, getSetting } from './database';
import { classifyWritingMode, DEFAULT_APP_RULES } from '@v/shared';
import type { AppContext } from '@v/shared';

export function getStyleProfile(): Record<string, unknown> {
  const db = getDatabase();
  const profile = db.prepare('SELECT * FROM user_profile ORDER BY id LIMIT 1').get() as Record<string, unknown> | undefined;
  const prefs = db.prepare('SELECT key, value FROM writing_preferences').all() as { key: string; value: string }[];
  const prefMap = Object.fromEntries(prefs.map((p) => [p.key, p.value]));
  return { ...(profile ?? {}), preferences: prefMap };
}

export function getSavedMemories(): Record<string, unknown>[] {
  const db = getDatabase();
  const examples = db.prepare('SELECT * FROM remembered_examples WHERE approved_by_user = 1 ORDER BY id DESC LIMIT 20').all();
  return examples as Record<string, unknown>[];
}

export function getAppRules(appName: string | null, domain: string | null): string {
  const db = getDatabase();
  let row = null as Record<string, unknown> | null;

  if (domain) {
    row = db.prepare('SELECT * FROM app_context_rules WHERE lower(domain) = lower(?) LIMIT 1').get(domain) as Record<string, unknown> | undefined ?? null;
  }
  if (!row && appName) {
    row = db.prepare('SELECT * FROM app_context_rules WHERE lower(app_name) = lower(?) LIMIT 1').get(appName) as Record<string, unknown> | undefined ?? null;
  }

  if (row) {
    return [row.rule_summary, row.format_rules, row.tone_rules, row.length_rules].filter(Boolean).join('\n');
  }

  const key = (domain ?? appName ?? '').toLowerCase();
  for (const [ruleKey, rule] of Object.entries(DEFAULT_APP_RULES)) {
    if (key.includes(ruleKey)) {
      return `${rule.summary}\nFormat: ${rule.format}\nTone: ${rule.tone}\nLength: ${rule.length}`;
    }
  }
  return 'Use clear, context-appropriate language.';
}

export function getAudienceNotes(audience: string | null): string {
  if (!audience) return 'None saved.';
  const row = getDatabase()
    .prepare('SELECT * FROM audience_profiles WHERE lower(audience_name) = lower(?) LIMIT 1')
    .get(audience) as Record<string, unknown> | undefined;
  if (!row) return 'None saved.';
  return [row.tone_preference, row.communication_strategy, row.notes].filter(Boolean).join('\n');
}

export function getSubjectNotes(subject: string | null): string {
  if (!subject) return 'None saved.';
  const row = getDatabase()
    .prepare('SELECT * FROM subject_profiles WHERE lower(subject_name) = lower(?) LIMIT 1')
    .get(subject) as Record<string, unknown> | undefined;
  if (!row) return 'None saved.';
  return [row.summary, row.vocabulary, row.known_facts, row.do_not_invent ? 'Do not invent facts.' : ''].filter(Boolean).join('\n');
}

export function saveRememberedExample(input: {
  exampleType: string;
  originalText: string;
  improvedText: string;
  lessonLearned: string;
}): void {
  if (getSetting('memory_enabled', 'true') !== 'true') return;
  getDatabase()
    .prepare(
      `INSERT INTO remembered_examples (example_type, original_text, improved_text, lesson_learned, approved_by_user)
       VALUES (?, ?, ?, ?, 1)`,
    )
    .run(input.exampleType, input.originalText, input.improvedText, input.lessonLearned);
}

export function saveRewriteHistory(input: {
  originalText: string;
  rewrittenText: string;
  appName: string | null;
  domain: string | null;
  writingGoal: string | null;
  audience: string | null;
  subject: string | null;
  actionType: string;
  userSelected: boolean;
}): void {
  if (getSetting('rewrite_history_enabled', 'false') !== 'true') return;
  getDatabase()
    .prepare(
      `INSERT INTO rewrite_history (original_text, rewritten_text, app_name, domain, writing_goal, audience, subject, action_type, user_selected)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.originalText,
      input.rewrittenText,
      input.appName,
      input.domain,
      input.writingGoal,
      input.audience,
      input.subject,
      input.actionType,
      input.userSelected ? 1 : 0,
    );
}

export function buildAppContext(input: {
  appName: string;
  windowTitle: string;
  fileName?: string | null;
  browserUrl?: string | null;
  domain?: string | null;
  fieldType?: string | null;
}): AppContext {
  return {
    appName: input.appName,
    windowTitle: input.windowTitle,
    fileName: input.fileName ?? null,
    browserUrl: input.browserUrl ?? null,
    domain: input.domain ?? null,
    fieldType: input.fieldType ?? null,
    writingMode: classifyWritingMode({
      appName: input.appName,
      windowTitle: input.windowTitle,
      domain: input.domain,
      fieldType: input.fieldType,
    }),
  };
}

// Memory CRUD for UI
export function listMemories() {
  const db = getDatabase();
  return {
    userProfile: db.prepare('SELECT * FROM user_profile ORDER BY id LIMIT 1').get(),
    preferences: db.prepare('SELECT * FROM writing_preferences ORDER BY key').all(),
    appRules: db.prepare('SELECT * FROM app_context_rules ORDER BY app_name').all(),
    audiences: db.prepare('SELECT * FROM audience_profiles ORDER BY audience_name').all(),
    subjects: db.prepare('SELECT * FROM subject_profiles ORDER BY subject_name').all(),
    history: db.prepare('SELECT * FROM rewrite_history ORDER BY id DESC LIMIT 100').all(),
    examples: db.prepare('SELECT * FROM remembered_examples ORDER BY id DESC LIMIT 100').all(),
    excludedApps: db.prepare('SELECT * FROM excluded_apps ORDER BY app_name').all(),
    excludedDomains: db.prepare('SELECT * FROM excluded_domains ORDER BY domain').all(),
  };
}

export function deleteMemory(table: string, id: number): boolean {
  const allowed = new Set([
    'writing_preferences',
    'app_context_rules',
    'audience_profiles',
    'subject_profiles',
    'rewrite_history',
    'remembered_examples',
    'excluded_apps',
    'excluded_domains',
  ]);
  if (!allowed.has(table)) return false;
  getDatabase().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  return true;
}

export function upsertPreference(key: string, value: string, source = 'user'): void {
  getDatabase()
    .prepare(
      `INSERT INTO writing_preferences (key, value, source, confidence, updated_at)
       VALUES (?, ?, ?, 0.9, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, source = excluded.source, updated_at = datetime('now')`,
    )
    .run(key, value, source);
}

export function addExcludedApp(appName: string, reason: string): void {
  getDatabase()
    .prepare('INSERT OR IGNORE INTO excluded_apps (app_name, reason) VALUES (?, ?)')
    .run(appName, reason);
}

export function addExcludedDomain(domain: string, reason: string): void {
  getDatabase()
    .prepare('INSERT OR IGNORE INTO excluded_domains (domain, reason) VALUES (?, ?)')
    .run(domain, reason);
}

export function updateUserProfile(fields: Record<string, unknown>): void {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM user_profile ORDER BY id LIMIT 1').get() as { id: number } | undefined;
  if (!existing) return;

  const allowed = [
    'display_name', 'style_summary', 'preferred_tone', 'formality_level',
    'directness_level', 'warmth_level', 'detail_level', 'emoji_preference',
    'phrases_to_use', 'phrases_to_avoid',
  ];
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  values.push(existing.id);
  db.prepare(`UPDATE user_profile SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function resetStyleLearning(): void {
  const db = getDatabase();
  db.prepare('DELETE FROM writing_preferences').run();
  db.prepare('DELETE FROM remembered_examples').run();
  db.prepare(`UPDATE user_profile SET style_summary = NULL, preferred_tone = 'balanced', formality_level = 50, directness_level = 50, warmth_level = 50, detail_level = 50, emoji_preference = 0, phrases_to_use = NULL, phrases_to_avoid = NULL, updated_at = datetime('now')`).run();
}
