import { execFile } from 'child_process';
import { promisify } from 'util';
import type { ActiveWindowInfo } from '@v/shared';

const execFileAsync = promisify(execFile);

export async function getActiveWindow(): Promise<ActiveWindowInfo> {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Diagnostics;
public class WinFocus {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
$hwnd = [WinFocus]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 512
[void][WinFocus]::GetWindowText($hwnd, $title, 512)
$pid = 0
[void][WinFocus]::GetWindowThreadProcessId($hwnd, [ref]$pid)
$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
$procName = if ($proc) { $proc.ProcessName } else { 'unknown' }
$appName = if ($proc) { $proc.MainWindowTitle } else { $title.ToString() }
if ([string]::IsNullOrWhiteSpace($appName)) { $appName = $procName }
@{
  title = $title.ToString()
  appName = $appName
  processName = $procName
  pid = [int]$pid
} | ConvertTo-Json -Compress
`;

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout.trim()) as ActiveWindowInfo;
    return parsed;
  } catch {
    return { title: 'Unknown', appName: 'Unknown', processName: 'unknown', pid: 0 };
  }
}

export function extractFileName(windowTitle: string): string | null {
  const match = windowTitle.match(/([^\\/:*?"<>|]+\.(?:txt|md|docx?|pdf|json|ts|tsx|js|jsx|py|rs|go|java|html|css))\b/i);
  return match?.[1] ?? null;
}
