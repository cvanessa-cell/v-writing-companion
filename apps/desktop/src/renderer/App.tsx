import { Suspense, lazy, useMemo } from 'react';
import { RewritePanel } from './components/RewritePanel';

const SettingsPage = lazy(async () => {
  const mod = await import('./components/SettingsPage');
  return { default: mod.SettingsPage };
});

function getView(): 'panel' | 'settings' {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'settings' ? 'settings' : 'panel';
}

export default function App() {
  const view = useMemo(getView, []);

  if (view === 'settings') {
    document.body.classList.add('settings-view');
    return (
      <Suspense fallback={<div className="settings-shell muted">Loading settings...</div>}>
        <SettingsPage />
      </Suspense>
    );
  }

  return <RewritePanel />;
}
