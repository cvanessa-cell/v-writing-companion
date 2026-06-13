import { describe, expect, it } from 'vitest';
import { isSensitiveField, classifyWritingMode, isSensitiveText } from '../utils';

describe('privacy utils', () => {
  it('detects password fields', () => {
    expect(isSensitiveField({ inputType: 'password' })).toBe(true);
    expect(isSensitiveField({ ariaLabel: 'Enter your password' })).toBe(true);
    expect(isSensitiveField({ inputType: 'text', placeholder: 'Email address' })).toBe(false);
  });

  it('detects sensitive text patterns', () => {
    expect(isSensitiveText('4111111111111111')).toBe(true);
    expect(isSensitiveText('sk-live-abc123')).toBe(true);
    expect(isSensitiveText('Hello world')).toBe(false);
  });
});

describe('writing mode classifier', () => {
  it('classifies gmail as email', () => {
    expect(classifyWritingMode({ domain: 'mail.google.com', windowTitle: 'Inbox' })).toBe('email');
  });

  it('classifies cursor as dev_prompt', () => {
    expect(classifyWritingMode({ appName: 'Cursor', windowTitle: 'project - Cursor' })).toBe('dev_prompt');
  });

  it('classifies unknown contexts', () => {
    expect(classifyWritingMode({ appName: 'Notepad', windowTitle: 'notes.txt' })).toBe('unknown');
  });
});
