import { getFieldMetadata, getFocusedTextField, isSensitiveField, isTextField } from './fieldDetector';
import { sendDiagnosticEvent } from './bridgeClient';

type ActivationTrigger = 'initial-focus' | 'focusin' | 'input';
type FrameType = 'top' | 'child';

interface ContentRuntimeModule {
  activateContentRuntime(options: {
    initialField?: HTMLElement | null;
    trigger: ActivationTrigger;
    bootstrapStartedAt: number;
    frameType: FrameType;
  }): void;
}

const bootstrapStartedAt = performance.now();
const frameType: FrameType = window.top === window ? 'top' : 'child';
let supportedFieldSeen = false;
let runtimeLoadRequested = false;
let runtimeLoadPromise: Promise<ContentRuntimeModule> | null = null;

function getRuntimeUrl(): string {
  return chrome.runtime.getURL('contentRuntime.js');
}

function describeField(field: HTMLElement): Record<string, unknown> {
  const meta = getFieldMetadata(field);
  return {
    tagName: meta.tagName,
    inputType: meta.inputType,
    isContentEditable: meta.isContentEditable,
    isSensitive: isSensitiveField(field, meta),
  };
}

function importRuntime(): Promise<ContentRuntimeModule> {
  if (!runtimeLoadPromise) {
    runtimeLoadPromise = import(getRuntimeUrl()) as Promise<ContentRuntimeModule>;
  }
  return runtimeLoadPromise;
}

function markSupportedFieldSeen(field: HTMLElement, trigger: ActivationTrigger): void {
  if (supportedFieldSeen) return;
  supportedFieldSeen = true;
  void sendDiagnosticEvent({
    eventName: 'supported_field_seen',
    source: 'extension',
    status: 'info',
    stage: 'activation',
    latencyMs: performance.now() - bootstrapStartedAt,
    detail: {
      domain: location.hostname,
      frameType,
      trigger,
      visibility: document.visibilityState,
      field: describeField(field),
    },
  });
}

function loadRuntimeForField(field: HTMLElement, trigger: ActivationTrigger): void {
  markSupportedFieldSeen(field, trigger);

  if (!runtimeLoadRequested) {
    runtimeLoadRequested = true;
    void sendDiagnosticEvent({
      eventName: 'full_runtime_load_requested',
      source: 'extension',
      status: 'info',
      stage: 'activation',
      latencyMs: performance.now() - bootstrapStartedAt,
      detail: {
        domain: location.hostname,
        frameType,
        trigger,
        visibility: document.visibilityState,
      },
    });
  }

  void importRuntime()
    .then((runtime) => {
      runtime.activateContentRuntime({
        initialField: field,
        trigger,
        bootstrapStartedAt,
        frameType,
      });
    })
    .catch((error) => {
      void sendDiagnosticEvent({
        eventName: 'full_runtime_load_failed',
        source: 'extension',
        status: 'error',
        stage: 'activation',
        detail: {
          domain: location.hostname,
          frameType,
          trigger,
          reason: error instanceof Error ? error.message : 'runtime_import_failed',
        },
      });
    });
}

function maybeActivateRuntime(target: EventTarget | null, trigger: ActivationTrigger): void {
  if (!(target instanceof Element)) return;
  if (!isTextField(target)) return;
  loadRuntimeForField(target, trigger);
}

const initiallyFocusedField = getFocusedTextField();
if (initiallyFocusedField) {
  loadRuntimeForField(initiallyFocusedField, 'initial-focus');
}

document.addEventListener('focusin', (event) => {
  maybeActivateRuntime(event.target, 'focusin');
});

document.addEventListener('input', (event) => {
  maybeActivateRuntime(event.target, 'input');
});

void sendDiagnosticEvent({
  eventName: 'content_script_bootstrapped',
  source: 'extension',
  status: 'info',
  stage: 'activation',
  detail: {
    domain: location.hostname,
    frameType,
    visibility: document.visibilityState,
    runtimeStrategy: 'deferred_until_supported_field',
    allFramesEnabled: true,
  },
});

export {};
