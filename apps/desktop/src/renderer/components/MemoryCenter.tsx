import { useEffect, useState } from 'react';

type Memories = Awaited<ReturnType<typeof window.v.listMemories>>;
type MemorySection = 'examples' | 'audiences' | 'subjects' | 'apps' | 'history' | 'excludedApps' | 'excludedDomains';
type MemoryRow = { id: number } & Record<string, unknown>;

export function MemoryCenter() {
  const [memories, setMemories] = useState<Memories | null>(null);
  const [section, setSection] = useState<MemorySection>('examples');

  async function refresh() {
    setMemories(await window.v.listMemories());
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!memories) return <div className="muted">Loading memories…</div>;

  const tableMap: Record<MemorySection, { table: string; rows: MemoryRow[]; empty: string }> = {
    examples: { table: 'remembered_examples', rows: memories.examples as MemoryRow[], empty: 'No saved examples yet.' },
    audiences: { table: 'audience_profiles', rows: memories.audiences as MemoryRow[], empty: 'No saved audience notes yet.' },
    subjects: { table: 'subject_profiles', rows: memories.subjects as MemoryRow[], empty: 'No saved subject notes yet.' },
    apps: { table: 'app_context_rules', rows: memories.appRules as MemoryRow[], empty: 'No app-specific rules yet.' },
    history: { table: 'rewrite_history', rows: memories.history as MemoryRow[], empty: 'No rewrite history yet.' },
    excludedApps: { table: 'excluded_apps', rows: memories.excludedApps as MemoryRow[], empty: 'No excluded apps. V can read supported text fields in every app.' },
    excludedDomains: { table: 'excluded_domains', rows: memories.excludedDomains as MemoryRow[], empty: 'No excluded domains. V can read supported browser text fields on every site.' },
  } as const;

  const current = tableMap[section];

  return (
    <div>
      <div className="tabs">
        {(Object.keys(tableMap) as (keyof typeof tableMap)[]).map((key) => (
          <button key={key} className={`tab ${section === key ? 'active' : ''}`} onClick={() => setSection(key)}>
            {key}
          </button>
        ))}
      </div>

      {memories.userProfile && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <strong>User style profile</strong>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--muted)' }}>
            {JSON.stringify(memories.userProfile, null, 2)}
          </pre>
        </div>
      )}

      <div className="card" style={{ padding: 12 }}>
        {(section === 'excludedApps' || section === 'excludedDomains') && (
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            If V stays inactive in an app or site, check these lists first. Delete an exclusion to allow rewrites there again.
          </div>
        )}
        {current.rows.length === 0 && <div className="muted">{current.empty}</div>}
        {current.rows.map((row: MemoryRow) => (
          <div key={String(row.id)} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{JSON.stringify(row, null, 2)}</pre>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 8 }}
              onClick={async () => {
                await window.v.deleteMemory(current.table, row.id);
                await refresh();
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => void window.v.resetStyleLearning()}>
        Reset style learning
      </button>
    </div>
  );
}
