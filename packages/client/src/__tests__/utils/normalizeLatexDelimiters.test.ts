import { describe, it, expect } from 'vitest';
import { normalizeLatexDelimiters } from '../../../design-system/utils/normalizeLatexDelimiters';

describe('normalizeLatexDelimiters', () => {
  it('converts inline LaTeX delimiters to $...$', () => {
    const input = 'When \\( x \\to \\infty \\), we have ...';
    expect(normalizeLatexDelimiters(input)).toBe(
      'When $ x \\to \\infty $, we have ...'
    );
  });

  it('converts display LaTeX delimiters to $$...$$', () => {
    const input = 'Here is the formula:\\[\\frac{a}{b}\\]';
    expect(normalizeLatexDelimiters(input)).toBe(
      'Here is the formula:$$\\frac{a}{b}$$'
    );
  });

  it('leaves $...$ and $$...$$ delimiters unchanged', () => {
    const input = 'Inline $x + y$ and display $$\\sum_{i=1}^{n} i$$';
    expect(normalizeLatexDelimiters(input)).toBe(input);
  });

  it('returns empty/undefined input as-is', () => {
    expect(normalizeLatexDelimiters('')).toBe('');
    expect(normalizeLatexDelimiters(undefined as unknown as string)).toBe(undefined);
  });
});
