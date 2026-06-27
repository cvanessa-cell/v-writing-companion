import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  Tray,
  shell,
} from 'electron';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';
import { captureSelectedText, replaceSelectedText, readClipboardText } from './clipboard';
import { getActiveWindow, extractFileName } from './activeWindow';
import {
  initDatabase,
  getSetting,
  setSetting,
  isPaused,
  isAppExcluded,
} from './database';
import {
  buildAppContext,
  getSavedMemories,
  listMemories,
  deleteMemory,
  upsertPreference,
  addExcludedApp,
  addExcludedDomain,
  updateUserProfile,
  resetStyleLearning,
  saveRememberedExample,
  saveRewriteHistory,
} from './memoryService';
import { getProviderStatus, performRewrite } from './aiProvider';
import { startBridgeServer, stopBridgeServer } from './bridgeServer';
import { handleEventRequest, handleRewriteRequest, handleSuggestRequest, handleSettingsRequest } from './bridgeHandlers';
import { isSensitiveText, type RewriteRequest } from '@v/shared';
import { getDiagnosticsSummary, logDiagnosticEvent } from './diagnostics';

import { existsSync } from 'fs';
function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(__dirname, '../../.env'),
    resolve(__dirname, '../../../.env'),
    'C:/Users/cvane/V/.env',
  ];
  for (const p of candidates) {
    if (existsSync(p)) config({ path: p });
  }
}
loadEnvFiles();

let tray: Tray | null = null;
let panelWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let isQuitting = false;

function createTrayIcon(): Electron.NativeImage {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const offset = i * 4;
    canvas[offset] = 99;
    canvas[offset + 1] = 102;
    canvas[offset + 2] = 241;
    canvas[offset + 3] = 255;
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function createPanelWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 440,
    height: 680,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}?view=panel`);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { query: { view: 'panel' } });
  }

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

function createSettingsWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    show: false,
    title: 'V Settings',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}?view=settings`);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { query: { view: 'settings' } });
  }

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

function showPanel(payload: Record<string, unknown>): void {
  if (!panelWindow) panelWindow = createPanelWindow();
  panelWindow.show();
  panelWindow.focus();
  panelWindow.webContents.send('panel:open', payload);
}

async function handleHotkeyTrigger(): Promise<void> {
  const startedAt = performance.now();
  logDiagnosticEvent({ eventName: 'hotkey_triggered', source: 'desktop', status: 'info', stage: 'capture' });

  if (isPaused()) {
    logDiagnosticEvent({ eventName: 'hotkey_blocked', source: 'desktop', status: 'error', stage: 'capture', detail: { reason: 'paused' } });
    showPanel({ error: 'V is paused. Resume from tray or settings.' });
    return;
  }

  const activeWindowStartedAt = performance.now();
  const active = await getActiveWindow();
  logDiagnosticEvent({
    eventName: 'active_window_resolved',
    source: 'desktop',
    status: active.processName === 'unknown' ? 'error' : 'success',
    stage: 'capture',
    latencyMs: performance.now() - activeWindowStartedAt,
    detail: { processName: active.processName, appName: active.appName },
  });
  if (isAppExcluded(active.processName) || isAppExcluded(active.appName)) {
    logDiagnosticEvent({
      eventName: 'capture_blocked',
      source: 'desktop',
      status: 'error',
      stage: 'policy',
      detail: { reason: 'excluded_app', appName: active.appName, processName: active.processName },
    });
    showPanel({ error: `V will not read "${active.appName}". Remove it from exclusions to enable.` });
    return;
  }

  const captureStartedAt = performance.now();
  const capture = await captureSelectedText();
  logDiagnosticEvent({
    eventName: 'capture_selected',
    source: 'desktop',
    status: capture.error || !capture.text ? 'error' : 'success',
    stage: 'capture',
    latencyMs: performance.now() - captureStartedAt,
    detail: { hasText: Boolean(capture.text), clipboardRestored: capture.clipboardRestored, reason: capture.error ?? null },
  });
  if (capture.error || !capture.text) {
    showPanel({
      error: capture.error ?? 'Select text first or enable active-field reading.',
      context: buildAppContext({
        appName: active.appName,
        windowTitle: active.title,
        fileName: extractFileName(active.title),
      }),
    });
    return;
  }

  if (isSensitiveText(capture.text)) {
    logDiagnosticEvent({
      eventName: 'capture_blocked',
      source: 'desktop',
      status: 'error',
      stage: 'policy',
      detail: { reason: 'sensitive_text' },
    });
    showPanel({ error: 'This text looks sensitive. V will not send it to AI.', context: null });
    return;
  }

  const context = buildAppContext({
    appName: active.appName,
    windowTitle: active.title,
    fileName: extractFileName(active.title),
  });

  showPanel({
    originalText: capture.text,
    context,
    privacyReading: true,
  });
  logDiagnosticEvent({
    eventName: 'hotkey_panel_ready',
    source: 'desktop',
    status: 'success',
    stage: 'capture',
    latencyMs: performance.now() - startedAt,
    detail: { appName: active.appName, writingMode: context.writingMode },
  });
}

function registerHotkey(): void {
  globalShortcut.unregisterAll();
  const accelerator = getSetting('hotkey', 'CommandOrControl+Shift+Space');
  const ok = globalShortcut.register(accelerator, () => {
    void handleHotkeyTrigger();
  });
  if (!ok) console.error('Failed to register hotkey:', accelerator);
}

function buildTrayMenu(): Menu {
  const paused = isPaused();
  return Menu.buildFromTemplate([
    { label: 'Open Rewrite Panel', click: () => void handleHotkeyTrigger() },
    { label: paused ? 'Resume V' : 'Pause V', click: () => setSetting('paused', paused ? 'false' : 'true') },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (!settingsWindow) settingsWindow = createSettingsWindow();
        settingsWindow.show();
        settingsWindow.focus();
      },
    },
    { type: 'separator' },
    { label: 'Quit V', click: () => { isQuitting = true; app.quit(); } },
  ]);
}

function createTray(): void {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('V — AI Writing Companion');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => void handleHotkeyTrigger());
}

function registerIpc(): void {
  ipcMain.handle('v:capture-selected', async () => {
    const active = await getActiveWindow();
    const capture = await captureSelectedText();
    return {
      ...capture,
      context: buildAppContext({
        appName: active.appName,
        windowTitle: active.title,
        fileName: extractFileName(active.title),
      }),
    };
  });

  ipcMain.handle('v:get-active-context', async () => {
    const active = await getActiveWindow();
    return buildAppContext({
      appName: active.appName,
      windowTitle: active.title,
      fileName: extractFileName(active.title),
    });
  });

  ipcMain.handle('v:rewrite', async (_e, request: RewriteRequest) => {
    const startedAt = performance.now();
    try {
      const result = await performRewrite(request);
      logDiagnosticEvent({
        eventName: 'rewrite_completed',
        source: 'desktop',
        status: 'success',
        stage: 'rewrite',
        latencyMs: performance.now() - startedAt,
        detail: { action: request.requestedAction, appName: request.appContext.appName, options: result.options.length },
      });
      return result;
    } catch (error) {
      logDiagnosticEvent({
        eventName: 'rewrite_failed',
        source: 'desktop',
        status: 'error',
        stage: 'rewrite',
        latencyMs: performance.now() - startedAt,
        detail: { action: request.requestedAction, appName: request.appContext.appName, reason: error instanceof Error ? error.message : 'Unknown rewrite failure' },
      });
      throw error;
    }
  });

  ipcMain.handle('v:replace-text', async (_e, text: string) => {
    const startedAt = performance.now();
    const result = await replaceSelectedText(text);
    logDiagnosticEvent({
      eventName: 'replace_selected_text',
      source: 'desktop',
      status: result.success ? 'success' : 'error',
      stage: 'replace',
      latencyMs: performance.now() - startedAt,
      detail: { clipboardRestored: result.clipboardRestored, reason: result.error ?? null },
    });
    logDiagnosticEvent({
      eventName: result.success ? 'replace_succeeded' : 'replace_failed',
      source: 'desktop',
      status: result.success ? 'success' : 'error',
      stage: 'replace',
      detail: result.error ? { reason: result.error } : null,
    });
    return result;
  });

  ipcMain.handle('v:get-settings', () => ({
    settings: {
      hotkey: getSetting('hotkey'),
      ai_provider: getSetting('ai_provider'),
      memory_enabled: getSetting('memory_enabled'),
      rewrite_history_enabled: getSetting('rewrite_history_enabled'),
      clipboard_mode: getSetting('clipboard_mode'),
      realtime_suggestions: getSetting('realtime_suggestions'),
      rewrite_only_selected: getSetting('rewrite_only_selected'),
      privacy_indicator: getSetting('privacy_indicator'),
      onboarding_complete: getSetting('onboarding_complete'),
      bridge_port: getSetting('bridge_port'),
      paused: getSetting('paused'),
      realtime_pause_ms: getSetting('realtime_pause_ms'),
      min_chars_for_suggestion: getSetting('min_chars_for_suggestion'),
      speech_cleanup_mode: getSetting('speech_cleanup_mode'),
      extension_domain_mode: getSetting('extension_domain_mode'),
      extension_allowed_domains: getSetting('extension_allowed_domains'),
    },
    providerStatus: getProviderStatus(),
    bridgeUrl: `http://127.0.0.1:${getSetting('bridge_port', '47821')}`,
    diagnostics: getDiagnosticsSummary(),
  }));

  ipcMain.handle('v:save-setting', (_e, key: string, value: string) => {
    setSetting(key, value);
    if (key === 'hotkey') registerHotkey();
    if (key === 'paused') tray?.setContextMenu(buildTrayMenu());
    return true;
  });

  ipcMain.handle('v:list-memories', () => listMemories());
  ipcMain.handle('v:delete-memory', (_e, table: string, id: number) => deleteMemory(table, id));
  ipcMain.handle('v:upsert-preference', (_e, key: string, value: string) => upsertPreference(key, value));
  ipcMain.handle('v:add-excluded-app', (_e, appName: string, reason: string) => addExcludedApp(appName, reason));
  ipcMain.handle('v:add-excluded-domain', (_e, domain: string, reason: string) => addExcludedDomain(domain, reason));
  ipcMain.handle('v:update-user-profile', (_e, fields: Record<string, unknown>) => updateUserProfile(fields));
  ipcMain.handle('v:reset-style-learning', () => resetStyleLearning());

  ipcMain.handle('v:remember-example', (_e, payload: {
    exampleType: string; originalText: string; improvedText: string; lessonLearned: string;
  }) => saveRememberedExample(payload));

  ipcMain.handle('v:save-history', (_e, payload: {
    originalText: string; rewrittenText: string; appName: string | null; domain: string | null;
    writingGoal: string | null; audience: string | null; subject: string | null; actionType: string; userSelected: boolean;
  }) => saveRewriteHistory(payload));

  ipcMain.handle('v:get-saved-memories', () => getSavedMemories());
  ipcMain.handle('v:track-event', (_e, payload: Record<string, unknown>) => {
    handleEventRequest({ source: 'renderer', status: 'info', ...payload });
    return true;
  });
  ipcMain.handle('v:export-diagnostics', () => JSON.stringify(getDiagnosticsSummary(), null, 2));
  ipcMain.handle('v:read-clipboard', () => readClipboardText());
  ipcMain.handle('v:open-external', (_e, url: string) => shell.openExternal(url));
  ipcMain.handle('v:hide-panel', () => panelWindow?.hide());
  ipcMain.handle('v:show-settings', () => {
    if (!settingsWindow) settingsWindow = createSettingsWindow();
    settingsWindow.show();
    settingsWindow.focus();
  });
}

app.whenReady().then(() => {
  initDatabase();
  registerIpc();
  createTray();
  registerHotkey();

  startBridgeServer({
    rewrite: handleRewriteRequest,
    suggest: handleSuggestRequest,
    settings: handleSettingsRequest,
    track: handleEventRequest,
  });
  logDiagnosticEvent({
    eventName: 'app_launched',
    source: 'desktop',
    status: 'success',
    stage: 'startup',
    detail: { providerConfigured: getProviderStatus().configured },
  });

  const showSettingsOnLaunch =
    getSetting('onboarding_complete', 'false') !== 'true' ||
    Boolean(process.env.ELECTRON_RENDERER_URL);

  if (showSettingsOnLaunch) {
    if (!settingsWindow) settingsWindow = createSettingsWindow();
    settingsWindow.show();
    settingsWindow.focus();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopBridgeServer();
});

app.on('window-all-closed', () => {
  // Tray app stays running on Windows.
});
