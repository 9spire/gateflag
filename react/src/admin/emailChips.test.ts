import { describe, expect, it } from 'vitest';
import { parseEmailChips } from './emailChips.js';

describe('parseEmailChips', () => {
  it('parses comma, space, and newline separated emails', () => {
    expect(parseEmailChips('a@example.com, b@example.com\nc@example.com d@example.com')).toEqual({
      valid: ['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com'],
      invalid: [],
    });
  });

  it('rejects invalid emails inline', () => {
    expect(parseEmailChips('good@example.com, nope, also bad')).toEqual({
      valid: ['good@example.com'],
      invalid: ['nope', 'also', 'bad'],
    });
  });
});
