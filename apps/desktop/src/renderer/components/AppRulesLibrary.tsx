import { useEffect, useState } from 'react';
import { DEFAULT_APP_RULES } from '@v/shared';

export function AppRulesLibrary() {
  return (
    <div className="card" style={{ padding: 12 }}>
      <p className="muted">Built-in app/context writing rules. Edit custom rules in Memory → apps.</p>
      {Object.entries(DEFAULT_APP_RULES).map(([key, rule]) => (
        <div key={key} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
          <strong>{key}</strong>
          <p className="muted" style={{ fontSize: 13 }}>{rule.summary}</p>
          <div style={{ fontSize: 12 }}>Format: {rule.format}</div>
          <div style={{ fontSize: 12 }}>Tone: {rule.tone}</div>
          <div style={{ fontSize: 12 }}>Length: {rule.length}</div>
        </div>
      ))}
    </div>
  );
}

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [tone, setTone] = useState('balanced');
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [realtime, setRealtime] = useState(false);

  async function finish() {
    await window.v.updateUserProfile({ preferred_tone: tone });
    await window.v.saveSetting('memory_enabled', memoryEnabled ? 'true' : 'false');
    await window.v.saveSetting('realtime_suggestions', realtime ? 'true' : 'false');
    await window.v.saveSetting('onboarding_complete', 'true');
    onComplete();
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <h2>Welcome to V</h2>
      <p className="muted">Set a few defaults. You can change these anytime in Settings.</p>
      <label className="muted">Preferred tone</label>
      <select className="select" value={tone} onChange={(e) => setTone(e.target.value)}>
        <option value="balanced">Balanced</option>
        <option value="professional">Professional</option>
        <option value="warm">Warm</option>
        <option value="direct">Direct</option>
      </select>
      <label style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input type="checkbox" checked={memoryEnabled} onChange={(e) => setMemoryEnabled(e.target.checked)} />
        Enable memory (user-approved only)
      </label>
      <label style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input type="checkbox" checked={realtime} onChange={(e) => setRealtime(e.target.checked)} />
        Enable real-time suggestions (off by default recommended)
      </label>
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => void finish()}>
        Get started
      </button>
    </div>
  );
}
