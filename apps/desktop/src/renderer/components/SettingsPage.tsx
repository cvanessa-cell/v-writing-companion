import { useEffect, useState } from 'react';
import { MemoryCenter } from './MemoryCenter';
import { AppRulesLibrary, OnboardingFlow } from './AppRulesLibrary';
import { DiagnosticsCard } from './DiagnosticsCard';

type SettingsPayload = Awaited<ReturnType<typeof window.v.getSettings>>;

export function SettingsPage() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [tab, setTab] = useState<'general' | 'privacy' | 'memory' | 'rules'>('general');
  const [excludeApp, setExcludeApp] = useState('');
  const [excludeDomain, setExcludeDomain] = useState('');
  const [allowedDomainsDraft, setAllowedDomainsDraft] = useState('');

  async function refresh() {
    setData(await window.v.getSettings());
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!data) return;
    setAllowedDomainsDraft(data.settings.extension_allowed_domains ?? '');
  }, [data]);

  if (!data) return <div className="settings-shell muted">Loading settings…</div>;

  const { settings, providerStatus, bridgeUrl, diagnostics } = data;

  return (
    <div className="settings-shell">
      <h1>V Settings</h1>
      <p className="muted">{providerStatus.message}</p>

      {settings.onboarding_complete !== 'true' && (
        <OnboardingFlow onComplete={() => void refresh()} />
      )}

      <div className="tabs">
        {(['general', 'privacy', 'memory', 'rules'] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="card" style={{ padding: 16 }}>
          <label className="muted">Hotkey</label>
          <input
            className="input"
            value={settings.hotkey}
            onChange={(e) => void window.v.saveSetting('hotkey', e.target.value).then(refresh)}
          />
          <label className="muted" style={{ marginTop: 12, display: 'block' }}>AI provider</label>
          <select
            className="select"
            value={settings.ai_provider}
            onChange={(e) => void window.v.saveSetting('ai_provider', e.target.value).then(refresh)}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
          <label style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="checkbox"
              checked={settings.clipboard_mode === 'true'}
              onChange={(e) => void window.v.saveSetting('clipboard_mode', e.target.checked ? 'true' : 'false').then(refresh)}
            />
            Clipboard mode
          </label>
          <label style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={settings.realtime_suggestions === 'true'}
              onChange={(e) => void window.v.saveSetting('realtime_suggestions', e.target.checked ? 'true' : 'false').then(refresh)}
            />
            Real-time suggestions (after typing pause)
          </label>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            When enabled, the browser extension shows non-invasive suggestions after you stop typing.
          </p>
          <label className="muted" style={{ marginTop: 12, display: 'block' }}>Pause before suggestion (ms)</label>
          <input
            className="input"
            type="number"
            min={500}
            max={5000}
            value={settings.realtime_pause_ms ?? '1200'}
            onChange={(e) => void window.v.saveSetting('realtime_pause_ms', e.target.value).then(refresh)}
          />
          <label className="muted" style={{ marginTop: 12, display: 'block' }}>Minimum characters for suggestion</label>
          <input
            className="input"
            type="number"
            min={5}
            max={500}
            value={settings.min_chars_for_suggestion ?? '20'}
            onChange={(e) => void window.v.saveSetting('min_chars_for_suggestion', e.target.value).then(refresh)}
          />
          <label className="muted" style={{ marginTop: 12, display: 'block' }}>Speech cleanup mode</label>
          <select
            className="select"
            value={settings.speech_cleanup_mode ?? 'auto'}
            onChange={(e) => void window.v.saveSetting('speech_cleanup_mode', e.target.value).then(refresh)}
          >
            <option value="off">Off</option>
            <option value="auto">Auto-detect dictation</option>
            <option value="manual">Manual only</option>
          </select>
          <label style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={settings.memory_enabled === 'true'}
              onChange={(e) => void window.v.saveSetting('memory_enabled', e.target.checked ? 'true' : 'false').then(refresh)}
            />
            Memory enabled
          </label>
          <label style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={settings.rewrite_history_enabled === 'true'}
              onChange={(e) => void window.v.saveSetting('rewrite_history_enabled', e.target.checked ? 'true' : 'false').then(refresh)}
            />
            Save rewrite history
          </label>
          <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
            Browser extension bridge: {bridgeUrl} | {providerStatus.configured ? 'Connected provider ready' : 'Using mock provider until API key is set'}
          </div>
          <DiagnosticsCard diagnostics={diagnostics} />
        </div>
      )}

      {tab === 'privacy' && (
        <div className="card" style={{ padding: 16 }}>
          <button
            className="btn btn-primary"
            onClick={() => void window.v.saveSetting('paused', settings.paused === 'true' ? 'false' : 'true').then(refresh)}
          >
            {settings.paused === 'true' ? 'Resume V' : 'Pause V'}
          </button>
          <label style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="checkbox"
              checked={settings.rewrite_only_selected === 'true'}
              onChange={(e) => void window.v.saveSetting('rewrite_only_selected', e.target.checked ? 'true' : 'false').then(refresh)}
            />
            Rewrite only selected text
          </label>
          <label style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={settings.privacy_indicator === 'true'}
              onChange={(e) => void window.v.saveSetting('privacy_indicator', e.target.checked ? 'true' : 'false').then(refresh)}
            />
            Show privacy indicator
          </label>
          <label className="muted" style={{ marginTop: 12, display: 'block' }}>Browser activation scope</label>
          <select
            className="select"
            value={settings.extension_domain_mode ?? 'all'}
            onChange={(e) => void window.v.saveSetting('extension_domain_mode', e.target.value).then(refresh)}
          >
            <option value="all">All supported pages</option>
            <option value="allowlist">Only allowlisted domains</option>
          </select>
          <label className="muted" style={{ marginTop: 12, display: 'block' }}>
            Allowlisted domains
          </label>
          <textarea
            className="input"
            rows={4}
            value={allowedDomainsDraft}
            placeholder={'mail.google.com\nnotion.so\nlinkedin.com'}
            onChange={(e) => setAllowedDomainsDraft(e.target.value)}
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            One domain per line or comma separated. Subdomains inherit from the parent domain.
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            V now waits to reconnect the browser bridge until you focus a supported text field on a visible page.
          </div>
          <button
            className="btn"
            style={{ marginTop: 8 }}
            onClick={() => void window.v.saveSetting('extension_allowed_domains', allowedDomainsDraft).then(refresh)}
          >
            Save activation scope
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginTop: 12 }}>
            <input className="input" placeholder="Never read this app" value={excludeApp} onChange={(e) => setExcludeApp(e.target.value)} />
            <button className="btn" onClick={() => void window.v.addExcludedApp(excludeApp, 'User excluded').then(() => setExcludeApp(''))}>Add app</button>
            <input className="input" placeholder="Never read this domain" value={excludeDomain} onChange={(e) => setExcludeDomain(e.target.value)} />
            <button className="btn" onClick={() => void window.v.addExcludedDomain(excludeDomain, 'User excluded').then(() => { setExcludeDomain(''); void refresh(); })}>Add domain</button>
          </div>
        </div>
      )}

      {tab === 'memory' && <MemoryCenter />}
      {tab === 'rules' && <AppRulesLibrary />}
    </div>
  );
}
