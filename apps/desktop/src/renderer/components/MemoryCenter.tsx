import { useEffect, useState } from 'react';

type Memories = Awaited<ReturnType<typeof window.v.listMemories>>;

export function MemoryCenter() {
  const [memories, setMemories] = useState<Memories | null>(null);
  const [section, setSection] = useState<'examples' | 'audiences' | 'subjects' | 'apps' | 'history'>('examples');

  async function refresh() {
    setMemories(await window.v.listMemories());
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!memories) return <div className="muted">Loading memories…</div>;

  const tableMap = {
    examples: { table: 'remembered_examples', rows: memories.examples },
    audiences: { table: 'audience_profiles', rows: memories.audiences },
    subjects: { table: 'subject_profiles', rows: memories.subjects },
    apps: { table: 'app_context_rules', rows: memories.appRules },
    history: { table: 'rewrite_history', rows: memories.history },
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
        {current.rows.length === 0 && <div className="muted">No saved items yet.</div>}
        {current.rows.map((row) => (
          <div key={String((row as { id: number }).id)} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{JSON.stringify(row, null, 2)}</pre>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 8 }}
              onClick={async () => {
                await window.v.deleteMemory(current.table, (row as { id: number }).id);
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
