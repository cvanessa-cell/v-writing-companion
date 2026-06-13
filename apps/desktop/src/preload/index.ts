import { contextBridge, ipcRenderer } from 'electron';
import type { RewriteRequest, RewriteResponse, AppContext } from '@v/shared';

const api = {
  onPanelOpen: (callback: (payload: Record<string, unknown>) => void) => {
    const listener = (_: Electron.IpcRendererEvent, payload: Record<string, unknown>) => callback(payload);
    ipcRenderer.on('panel:open', listener);
    return () => ipcRenderer.removeListener('panel:open', listener);
  },
  captureSelected: (): Promise<{ text: string; error?: string; context: AppContext }> =>
    ipcRenderer.invoke('v:capture-selected'),
  getActiveContext: (): Promise<AppContext> => ipcRenderer.invoke('v:get-active-context'),
  rewrite: (request: RewriteRequest): Promise<RewriteResponse> => ipcRenderer.invoke('v:rewrite', request),
  replaceText: (text: string) => ipcRenderer.invoke('v:replace-text', text),
  getSettings: () => ipcRenderer.invoke('v:get-settings'),
  saveSetting: (key: string, value: string) => ipcRenderer.invoke('v:save-setting', key, value),
  listMemories: () => ipcRenderer.invoke('v:list-memories'),
  deleteMemory: (table: string, id: number) => ipcRenderer.invoke('v:delete-memory', table, id),
  upsertPreference: (key: string, value: string) => ipcRenderer.invoke('v:upsert-preference', key, value),
  addExcludedApp: (appName: string, reason: string) => ipcRenderer.invoke('v:add-excluded-app', appName, reason),
  addExcludedDomain: (domain: string, reason: string) => ipcRenderer.invoke('v:add-excluded-domain', domain, reason),
  updateUserProfile: (fields: Record<string, unknown>) => ipcRenderer.invoke('v:update-user-profile', fields),
  resetStyleLearning: () => ipcRenderer.invoke('v:reset-style-learning'),
  rememberExample: (payload: {
    exampleType: string; originalText: string; improvedText: string; lessonLearned: string;
  }) => ipcRenderer.invoke('v:remember-example', payload),
  saveHistory: (payload: {
    originalText: string; rewrittenText: string; appName: string | null; domain: string | null;
    writingGoal: string | null; audience: string | null; subject: string | null; actionType: string; userSelected: boolean;
  }) => ipcRenderer.invoke('v:save-history', payload),
  readClipboard: () => ipcRenderer.invoke('v:read-clipboard'),
  openExternal: (url: string) => ipcRenderer.invoke('v:open-external', url),
  hidePanel: () => ipcRenderer.invoke('v:hide-panel'),
  showSettings: () => ipcRenderer.invoke('v:show-settings'),
};

contextBridge.exposeInMainWorld('v', api);

export type VApi = typeof api;
