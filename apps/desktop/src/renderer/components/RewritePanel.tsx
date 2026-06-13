import { useEffect, useState } from 'react';
import type { AppContext, RewriteAction, RewriteOption, RewriteResponse } from '@v/shared';
import { ACTION_LABELS } from '@v/shared';

interface Props {
  initialText?: string;
  initialContext?: AppContext | null;
  initialError?: string;
  privacyReading?: boolean;
}

const ACTIONS: RewriteAction[] = [
  'polish', 'professional', 'warm', 'shorten', 'clarify', 'strengthen', 'grammar', 'speech_cleanup', 'custom',
];

export function RewritePanel({ initialText = '', initialContext, initialError, privacyReading }: Props) {
  const [originalText, setOriginalText] = useState(initialText);
  const [context, setContext] = useState<AppContext | null | undefined>(initialContext);
  const [error, setError] = useState(initialError ?? '');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RewriteResponse | null>(null);
  const [selectedOption, setSelectedOption] = useState<RewriteOption | null>(null);
  const [action, setAction] = useState<RewriteAction>('polish');
  const [customInstruction, setCustomInstruction] = useState('');
  const [writingGoal, setWritingGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [subject, setSubject] = useState('');
  const [relationship, setRelationship] = useState('');
  const [replaceStatus, setReplaceStatus] = useState('');
  const [expandedWhy, setExpandedWhy] = useState<number | null>(null);
  const [reading, setReading] = useState(Boolean(privacyReading));

  useEffect(() => {
    const unsubscribe = window.v.onPanelOpen((payload) => {
      setOriginalText(String(payload.originalText ?? ''));
      setContext((payload.context as AppContext) ?? null);
      setError(String(payload.error ?? ''));
      setResponse(null);
      setSelectedOption(null);
      setReplaceStatus('');
      setReading(Boolean(payload.privacyReading));
    });
    return unsubscribe;
  }, []);

  async function runRewrite(nextAction = action) {
    if (!originalText.trim()) {
      setError('No text to rewrite.');
      return;
    }
    setLoading(true);
    setError('');
    setReading(false);
    try {
      const result = await window.v.rewrite({
        originalText,
        selectedText: originalText,
        surroundingText: null,
        appContext: context ?? {
          appName: null,
          windowTitle: null,
          fileName: null,
          browserUrl: null,
          domain: null,
          fieldType: null,
          writingMode: 'unknown',
        },
        userContext: { styleProfile: {}, preferences: {}, savedMemories: [] },
        writingGoal: writingGoal || null,
        subject: subject || null,
        audience: audience || null,
        relationship: relationship || null,
        requestedAction: nextAction,
        customInstruction: nextAction === 'custom' ? customInstruction : null,
        privacyMode: false,
      });
      setResponse(result);
      setSelectedOption(result.options[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rewrite failed');
    } finally {
      setLoading(false);
    }
  }

  async function copyOption(option: RewriteOption) {
    await navigator.clipboard.writeText(option.text);
    setReplaceStatus('Copied to clipboard.');
  }

  async function replaceOption(option: RewriteOption) {
    const result = await window.v.replaceText(option.text);
    if (result.success) {
      setReplaceStatus('Replacement attempted. Check your active app.');
      await window.v.saveHistory({
        originalText,
        rewrittenText: option.text,
        appName: context?.appName ?? null,
        domain: context?.domain ?? null,
        writingGoal: writingGoal || null,
        audience: audience || null,
        subject: subject || null,
        actionType: action,
        userSelected: true,
      });
    } else {
      setReplaceStatus(result.error ?? 'Replace failed');
    }
  }

  async function rememberStyle(option: RewriteOption) {
    await window.v.rememberExample({
      exampleType: 'user_style',
      originalText,
      improvedText: option.text,
      lessonLearned: `Preferred ${action} style in ${context?.writingMode ?? 'general'} context`,
    });
    setReplaceStatus('Style remembered.');
  }

  return (
    <div className="panel-shell card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <strong style={{ fontSize: 18 }}>V</strong>
          <div className="muted" style={{ fontSize: 12 }}>Writing companion</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`privacy-dot ${reading ? 'reading' : ''}`} title={reading ? 'Reading text' : 'Idle'} />
          <button className="btn btn-ghost" onClick={() => window.v.hidePanel()}>Close</button>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}

      {context && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {context.appName && <span className="badge">{context.appName}</span>}
          {context.writingMode && <span className="badge">{context.writingMode}</span>}
          {context.windowTitle && <span className="badge">{context.windowTitle.slice(0, 40)}</span>}
        </div>
      )}

      <label className="muted" style={{ fontSize: 12 }}>Original</label>
      <textarea className="textarea" value={originalText} onChange={(e) => setOriginalText(e.target.value)} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <input className="input" placeholder="Purpose / goal" value={writingGoal} onChange={(e) => setWritingGoal(e.target.value)} />
        <input className="input" placeholder="Audience" value={audience} onChange={(e) => setAudience(e.target.value)} />
        <input className="input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <input className="input" placeholder="Relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
      </div>

      <div className="grid-actions" style={{ marginTop: 10 }}>
        {ACTIONS.filter((a) => a !== 'custom').map((a) => (
          <button
            key={a}
            className={`btn ${action === a ? 'btn-primary' : ''}`}
            onClick={() => { setAction(a); void runRewrite(a); }}
            disabled={loading}
          >
            {ACTION_LABELS[a]?.split('—')[0]?.trim() ?? a}
          </button>
        ))}
      </div>

      {action === 'custom' && (
        <div style={{ marginTop: 8 }}>
          <input
            className="input"
            placeholder="Custom instruction"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
          />
          <button className="btn btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={() => void runRewrite('custom')} disabled={loading}>
            Run custom rewrite
          </button>
        </div>
      )}

      {loading && <div className="muted" style={{ marginTop: 12 }}>Rewriting…</div>}

      {response && (
        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Intent: {response.analysisSummary.detectedIntent} · Tone: {response.analysisSummary.recommendedTone}
          </div>
          {response.analysisSummary.risksOrWarnings.length > 0 && (
            <div className="error" style={{ fontSize: 12, marginBottom: 8 }}>
              {response.analysisSummary.risksOrWarnings.join(' · ')}
            </div>
          )}
          {response.options.map((option, index) => (
            <div key={index} className="option-card">
              <strong>{option.label}</strong>
              <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0' }}>{option.text}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => { setSelectedOption(option); void replaceOption(option); }}>Replace selected text</button>
                <button className="btn" onClick={() => void copyOption(option)}>Copy</button>
                <button className="btn" onClick={() => void rememberStyle(option)}>Remember this style</button>
                <button className="btn btn-ghost" onClick={() => setExpandedWhy(expandedWhy === index ? null : index)}>
                  Why this works
                </button>
              </div>
              {expandedWhy === index && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{option.whyThisWorks}</p>}
            </div>
          ))}
        </div>
      )}

      {replaceStatus && <div className="success" style={{ marginTop: 10, fontSize: 12 }}>{replaceStatus}</div>}
      {selectedOption && <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>Selected: {selectedOption.label}</div>}
    </div>
  );
}
