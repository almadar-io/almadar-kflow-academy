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

  it('converts multi-line display LaTeX delimiters to $$...$$', () => {
    const input = `Momentum is conserved:
\\[
\\vec{p}_{\\text{total, before}} = \\vec{p}_{\\text{total, after}}
\\]
For a system of particles:`;
    expect(normalizeLatexDelimiters(input)).toBe(
      `Momentum is conserved:
$$
\\vec{p}_{\\text{total, before}} = \\vec{p}_{\\text{total, after}}
$$
For a system of particles:`
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

  it('un-escapes escaped backtick fences so code blocks render', () => {
    const input = '\\`\\`\\`python\ndef f():\n    return 1\n\\`\\`\\`';
    expect(normalizeLatexDelimiters(input)).toBe(
      '```python\ndef f():\n    return 1\n```'
    );
  });

  it('un-escapes escaped inline backticks so inline code renders', () => {
    const input = 'Use \\`code\\` here';
    expect(normalizeLatexDelimiters(input)).toBe('Use `code` here');
  });
});
