import { describe, expect, it } from 'vitest';
import { isSensitiveField, isTextField } from '../fieldDetector';

describe('fieldDetector', () => {
  it('flags password fields as sensitive', () => {
    expect(isSensitiveField(document.createElement('input'), {
      tagName: 'input',
      inputType: 'password',
    })).toBe(true);
  });

  it('accepts normal text fields', () => {
    const textarea = document.createElement('textarea');
    expect(isTextField(textarea)).toBe(true);
  });
});
