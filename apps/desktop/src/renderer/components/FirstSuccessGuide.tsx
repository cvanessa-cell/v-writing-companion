import { buildFirstSuccessPlan } from './firstSuccess';

type SettingsPayload = Awaited<ReturnType<typeof window.v.getSettings>>;

export function FirstSuccessGuide({
  providerConfigured,
  bridgeUrl,
  diagnostics,
}: Pick<SettingsPayload, 'bridgeUrl' | 'diagnostics'> & {
  providerConfigured: boolean;
}) {
  const plan = buildFirstSuccessPlan({
    providerConfigured,
    bridgeUrl,
    diagnostics,
  });

  async function copyChecklist() {
    await navigator.clipboard.writeText(plan.checklistText);
  }

  return (
    <div
      className="option-card"
      style={{
        marginTop: 0,
        marginBottom: 16,
        padding: 16,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(15,23,42,0.92))',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div className="badge" style={{ marginBottom: 8 }}>First-success guide</div>
          <strong style={{ display: 'block', fontSize: 18 }}>{plan.headline}</strong>
          <div className="muted" style={{ fontSize: 13, marginTop: 8, maxWidth: 700 }}>
            {plan.summary}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => void copyChecklist()}>
          Copy checklist
        </button>
      </div>

      <div className="diagnostics-grid" style={{ marginTop: 16 }}>
        <div className="option-card" style={{ marginTop: 0 }}>
          <strong>Next best action</strong>
          <div style={{ marginTop: 8, fontSize: 13 }}>{plan.nextActionTitle}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {plan.nextActionDetail}
          </div>
        </div>

        <div className="option-card" style={{ marginTop: 0 }}>
          <strong>Proof snapshot</strong>
          <div style={{ marginTop: 8 }}>
            {plan.proofItems.map((item) => (
              <div key={item} className="muted" style={{ fontSize: 12 }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {plan.steps.map((step) => (
          <div
            key={step.title}
            className="option-card"
            style={{
              marginTop: 10,
              borderColor: step.done ? 'rgba(34, 197, 94, 0.35)' : 'var(--border)',
              background: step.done ? 'rgba(34, 197, 94, 0.08)' : 'var(--surface-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{step.title}</strong>
              <span className="badge">{step.done ? 'Done' : 'Needs proof'}</span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              {step.description}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              {step.proof}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
