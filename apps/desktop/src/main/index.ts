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
import { getProviderStatus } from './aiProvider';
import { startBridgeServer, stopBridgeServer } from './bridgeServer';
import { handleRewriteRequest, handleSuggestRequest, handleSettingsRequest } from './bridgeHandlers';
import { isSensitiveText } from '@v/shared';

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
  if (isPaused()) {
    showPanel({ error: 'V is paused. Resume from tray or settings.' });
    return;
  }

  const active = await getActiveWindow();
  if (isAppExcluded(active.processName) || isAppExcluded(active.appName)) {
    showPanel({ error: `V will not read "${active.appName}". Remove it from exclusions to enable.` });
    return;
  }

  const capture = await captureSelectedText();
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
    showPanel({ error: 'This text looks sensitive. V will not send it to AI.', context: null });
    return;
  }

  showPanel({
    originalText: capture.text,
    context: buildAppContext({
      appName: active.appName,
      windowTitle: active.title,
      fileName: extractFileName(active.title),
    }),
    privacyReading: true,
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

  ipcMain.handle('v:rewrite', async (_e, request: RewriteRequest) => performRewrite(request));

  ipcMain.handle('v:replace-text', async (_e, text: string) => replaceSelectedText(text));

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
    },
    providerStatus: getProviderStatus(),
    bridgeUrl: `http://127.0.0.1:${getSetting('bridge_port', '47821')}`,
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
  });

  if (getSetting('onboarding_complete', 'false') !== 'true') {
    if (!settingsWindow) settingsWindow = createSettingsWindow();
    settingsWindow.show();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopBridgeServer();
});

app.on('window-all-closed', () => {
  // Tray app stays running on Windows.
});
