type DiagnosticsPayload = Awaited<ReturnType<typeof window.v.getSettings>>['diagnostics'];
type DiagnosticsEventRow = DiagnosticsPayload['recentEvents'][number];

export function DiagnosticsCard({ diagnostics }: { diagnostics: DiagnosticsPayload }) {
  const failureSummary = diagnostics.lastFailure
    ? `${diagnostics.lastFailure.eventName} (${diagnostics.lastFailure.source})`
    : 'No recent failures';
  const releaseLabel = [
    `Desktop ${diagnostics.release.appVersion}`,
    diagnostics.release.extensionVersion ? `Extension ${diagnostics.release.extensionVersion}` : null,
    diagnostics.release.releaseChannel,
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <div className="card" style={{ padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 4px' }}>Local diagnostics</h2>
          <div className="muted" style={{ fontSize: 12 }}>
            Privacy-safe local events only. No captured text is stored here.
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => void window.v.exportDiagnostics().then((payload: string) => navigator.clipboard.writeText(payload))}
        >
          Copy diagnostics JSON
        </button>
      </div>

      <div className="diagnostics-grid" style={{ marginTop: 16 }}>
        <div className="option-card" style={{ marginTop: 0 }}>
          <strong>Recent health</strong>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Events last 7 days: {diagnostics.eventCountLast7Days}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>Current release: {releaseLabel}</div>
          <div className="muted" style={{ fontSize: 12 }}>Last event: {diagnostics.lastEventAt ?? 'None yet'}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Last successful rewrite: {diagnostics.lastSuccessfulRewriteAt ?? 'None yet'}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Last bridge connection: {diagnostics.lastBridgeConnectedAt ?? 'None yet'}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>Last failure: {failureSummary}</div>
        </div>

        <div className="option-card" style={{ marginTop: 0 }}>
          <strong>Activation funnel</strong>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>App launches: {diagnostics.counts.appLaunched}</div>
          <div className="muted" style={{ fontSize: 12 }}>Hotkeys triggered: {diagnostics.counts.hotkeyTriggered}</div>
          <div className="muted" style={{ fontSize: 12 }}>Rewrites completed: {diagnostics.counts.rewriteCompleted}</div>
          <div className="muted" style={{ fontSize: 12 }}>Suggestions accepted: {diagnostics.counts.suggestionAccepted}</div>
          <div className="muted" style={{ fontSize: 12 }}>Bridge reconnects: {diagnostics.counts.bridgeConnected}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            First success after launch: {diagnostics.funnel.timeToFirstSuccess?.label ?? 'No completed rewrite yet'}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Activation rate: {formatRate(diagnostics.funnel.activationRate)}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Field activation rate: {formatRate(diagnostics.funnel.extensionFieldActivationRate)}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Runtime activation rate: {formatRate(diagnostics.funnel.extensionRuntimeActivationRate)}
          </div>
        </div>

        <div className="option-card" style={{ marginTop: 0 }}>
          <strong>Failure counters</strong>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Rewrite failures: {diagnostics.counts.rewriteFailed}</div>
          <div className="muted" style={{ fontSize: 12 }}>Replace failures: {diagnostics.counts.replaceFailed}</div>
          <div className="muted" style={{ fontSize: 12 }}>Bridge unavailable: {diagnostics.counts.bridgeUnavailable}</div>
          <div className="muted" style={{ fontSize: 12 }}>Activation blocked: {diagnostics.counts.activationBlocked}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Desktop rewrite success: {formatRate(diagnostics.funnel.desktopRewriteRate)}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Replace success: {formatRate(diagnostics.funnel.replacementRate)}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Extension engagement: {formatRate(diagnostics.funnel.extensionEngagementRate)}
          </div>
        </div>

        <div className="option-card" style={{ marginTop: 0 }}>
          <strong>Latency snapshots</strong>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Hotkey to panel: {formatLatency(diagnostics.latencyMs.hotkeyToPanel)}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Active window: {formatLatency(diagnostics.latencyMs.activeWindow)}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Capture selected: {formatLatency(diagnostics.latencyMs.captureSelected)}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Replace text: {formatLatency(diagnostics.latencyMs.replaceText)}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Bridge rewrite: {formatLatency(diagnostics.latencyMs.bridgeRewrite)}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Bridge suggest: {formatLatency(diagnostics.latencyMs.bridgeSuggest)}
          </div>
        </div>
      </div>

      <div className="diagnostics-grid" style={{ marginTop: 16 }}>
        <div className="option-card" style={{ marginTop: 0 }}>
          <strong>Current release health</strong>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Release-tagged events: {diagnostics.currentVersion.eventCount}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Successful rewrites: {diagnostics.currentVersion.successfulRewrites}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Failed events: {diagnostics.currentVersion.failedEvents}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Bridge reconnects: {diagnostics.currentVersion.bridgeReconnects}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Activation blocks: {diagnostics.currentVersion.activationBlocks}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Last tagged event: {diagnostics.currentVersion.lastEventAt ?? 'No tagged events yet'}
          </div>
        </div>

        <div className="option-card" style={{ marginTop: 0 }}>
          <strong>Extension activation telemetry</strong>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Content scripts bootstrapped: {diagnostics.counts.contentScriptBootstrapped}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Supported fields seen: {diagnostics.counts.supportedFieldSeen}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Full runtime activations: {diagnostics.counts.fullRuntimeActivated}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Use this to compare broad injections against actual writing-field usage after each release.
          </div>
        </div>
      </div>

      <div className="diagnostics-grid" style={{ marginTop: 16 }}>
        <div className="option-card" style={{ marginTop: 0 }}>
          <strong>Top failure reasons</strong>
          {diagnostics.topFailureReasons.length === 0 ? (
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>No recent failures.</div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {diagnostics.topFailureReasons.map((item: { label: string; count: number }) => (
                <div key={item.label} className="muted" style={{ fontSize: 12 }}>
                  {item.label}: {item.count}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="option-card" style={{ marginTop: 0 }}>
          <strong>Problem domains</strong>
          {diagnostics.topProblemDomains.length === 0 ? (
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>No recent domain hotspots.</div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {diagnostics.topProblemDomains.map((item: { label: string; count: number }) => (
                <div key={item.label} className="muted" style={{ fontSize: 12 }}>
                  {item.label}: {item.count}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="option-card" style={{ marginTop: 16 }}>
        <strong>Domain outcomes</strong>
        {diagnostics.topDomainOutcomes.length === 0 ? (
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>No domain outcomes recorded yet.</div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {diagnostics.topDomainOutcomes.map((item: {
              domain: string;
              successes: number;
              failures: number;
              blocked: number;
              lastEventAt: string;
            }) => (
              <div key={item.domain} style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 13 }}>{item.domain}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{item.lastEventAt}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Successes: {item.successes} | Failures: {item.failures} | Blocked: {item.blocked}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="option-card" style={{ marginTop: 16 }}>
        <strong>Recent events</strong>
        {diagnostics.recentEvents.length === 0 ? (
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>No diagnostics logged yet.</div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {diagnostics.recentEvents.map((event: DiagnosticsEventRow) => (
              <div key={event.id} style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 13 }}>{event.eventName}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{event.createdAt}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {event.source} | {event.status}{event.stage ? ` | ${event.stage}` : ''}{typeof event.latencyMs === 'number' ? ` | ${event.latencyMs.toFixed(2)} ms` : ''}
                </div>
                {event.detail && (
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: 'var(--muted)', margin: '6px 0 0' }}>
                    {JSON.stringify(event.detail, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatLatency(value: { count: number; avg: number; p50: number; p95: number } | null): string {
  if (!value) return 'No samples';
  return `p50 ${value.p50} ms | p95 ${value.p95} ms | avg ${value.avg} ms`;
}

function formatRate(value: { successful: number; failed: number; rate: number | null }): string {
  if (value.rate == null) return 'No samples';
  return `${value.rate}% (${value.successful} success / ${value.failed} failed)`;
}
