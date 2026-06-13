import { useMemo } from 'react';
import { RewritePanel } from './components/RewritePanel';
import { SettingsPage } from './components/SettingsPage';

function getView(): 'panel' | 'settings' {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'settings' ? 'settings' : 'panel';
}

export default function App() {
  const view = useMemo(getView, []);

  if (view === 'settings') {
    document.body.classList.add('settings-view');
    return <SettingsPage />;
  }

  return <RewritePanel />;
}
