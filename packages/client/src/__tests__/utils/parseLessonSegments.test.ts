import {
  parseLessonSegments,
  parseMarkdownWithCodeBlocks,
} from '../../../design-system/utils/parseLessonSegments';

describe('parseMarkdownWithCodeBlocks', () => {
  it('extracts fenced code blocks and normalizes LaTeX delimiters in markdown parts', () => {
    const input = `Before math \\[x^2\\].
\`\`\`python
def f():
    return 1
\`\`\`
After math \\(y\\).`;

    const segments = parseMarkdownWithCodeBlocks(input);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({
      type: 'markdown',
      content: 'Before math $$x^2$$.\n',
    });
    expect(segments[1]).toEqual({
      type: 'code',
      language: 'python',
      content: 'def f():\n    return 1',
      runnable: false,
    });
    expect(segments[2]).toEqual({
      type: 'markdown',
      content: '\nAfter math $y$.',
    });
  });

  it('does not alter already-normalized math delimiters', () => {
    const input = 'Inline $x$ and display $$y$$';
    const segments = parseMarkdownWithCodeBlocks(input);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      type: 'markdown',
      content: 'Inline $x$ and display $$y$$',
    });
  });
});

describe('parseLessonSegments', () => {
  it('normalizes LaTeX display math delimiters before segmenting', () => {
    const input = `Intro text.
\\[
\\vec{p}_{\\text{total, before}} = \\vec{p}_{\\text{total, after}}
\\]
More text.`;

    const segments = parseLessonSegments(input);

    const markdownSegments = segments.filter((s) => s.type === 'markdown');
    expect(markdownSegments.length).toBeGreaterThan(0);
    expect(
      markdownSegments.some(
        (s) =>
          s.type === 'markdown' &&
          s.content.includes(
            '$$\n\\vec{p}_{\\text{total, before}} = \\vec{p}_{\\text{total, after}}\n$$',
          ),
      )
    ).toBe(true);
    expect(
      markdownSegments.every(
        (s) => s.type === 'markdown' && !s.content.includes('\\['),
      )
    ).toBe(true);
  });

  it('preserves code block content and normalizes math outside code blocks', () => {
    const input = `Math \\[a\\] before.
\`\`\`python
# code with backslash-bracket \\[not math\\]
def elastic_collision(m1, m2):
    return m1 + m2
\`\`\`
Math \\(b\\) after.`;

    const segments = parseLessonSegments(input);

    const codeSegments = segments.filter((s) => s.type === 'code');
    expect(codeSegments).toHaveLength(1);
    expect(codeSegments[0]).toMatchObject({
      type: 'code',
      language: 'python',
    });
    expect((codeSegments[0] as any).content).toContain(
      '\\[not math\\]',
    );

    const markdownSegments = segments.filter((s) => s.type === 'markdown');
    expect(
      markdownSegments.some(
        (s) => s.type === 'markdown' && s.content.includes('$$a$$'),
      )
    ).toBe(true);
    expect(
      markdownSegments.some(
        (s) => s.type === 'markdown' && s.content.includes('$b$'),
      )
    ).toBe(true);
  });
});
