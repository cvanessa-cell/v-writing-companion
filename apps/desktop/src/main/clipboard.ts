import { execFile } from 'child_process';
import { clipboard } from 'electron';
import { promisify } from 'util';
import type { CaptureResult, ReplacementResult } from '@v/shared';

const execFileAsync = promisify(execFile);

async function sendKeys(combo: string): Promise<void> {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Start-Sleep -Milliseconds 80
[System.Windows.Forms.SendKeys]::SendWait('${combo}')
`;
  await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    windowsHide: true,
  });
}

export async function captureSelectedText(): Promise<CaptureResult> {
  const previous = clipboard.readText();
  try {
    await sendKeys('^c');
    await new Promise((r) => setTimeout(r, 150));
    const captured = clipboard.readText().trim();

    if (previous !== clipboard.readText()) {
      clipboard.writeText(previous);
    } else if (previous) {
      clipboard.writeText(previous);
    }

    if (!captured) {
      return {
        text: '',
        clipboardRestored: true,
        error: 'Select text first or enable active-field reading.',
      };
    }

    return { text: captured, clipboardRestored: true };
  } catch (error) {
    clipboard.writeText(previous);
    return {
      text: '',
      clipboardRestored: true,
      error: error instanceof Error ? error.message : 'Failed to capture selected text',
    };
  }
}

export async function replaceSelectedText(newText: string): Promise<ReplacementResult> {
  const previous = clipboard.readText();
  try {
    clipboard.writeText(newText);
    await sendKeys('^v');
    await new Promise((r) => setTimeout(r, 120));
    clipboard.writeText(previous);
    return { success: true, clipboardRestored: true };
  } catch (error) {
    clipboard.writeText(previous);
    return {
      success: false,
      clipboardRestored: true,
      error: error instanceof Error ? error.message : 'Failed to replace selected text',
    };
  }
}

export function readClipboardText(): string {
  return clipboard.readText();
}
