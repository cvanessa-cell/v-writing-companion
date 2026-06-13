import { describe, expect, it } from 'vitest';
import { buildRewriteUserPrompt } from '@v/shared';

describe('prompt construction', () => {
  it('includes original text and action', () => {
    const prompt = buildRewriteUserPrompt({
      originalText: 'hello world',
      appContext: { appName: 'Notepad', windowTitle: 'notes.txt', writingMode: 'unknown' },
      writingGoal: null,
      subject: null,
      audience: null,
      relationship: null,
      requestedAction: 'polish',
      customInstruction: null,
      styleProfile: {},
      appRules: 'Be clear',
      audienceNotes: 'None',
      subjectNotes: 'None',
    });
    expect(prompt).toContain('hello world');
    expect(prompt).toContain('polish');
    expect(prompt).toContain('Notepad');
  });
});
