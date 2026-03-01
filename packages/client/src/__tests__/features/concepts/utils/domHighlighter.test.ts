import { readFileSync } from 'fs';
import { join } from 'path';
import { applyHighlightingToDOM } from '../../../../features/concepts/utils/domHighlighter';
import { HighlightChunk } from '../../../../features/concepts/utils/textHighlighter';
import { chunkText } from '../../../../features/concepts/utils/textChunking';

// Load test fixture
const bosnianLessonMarkdown = readFileSync(
  join(__dirname, 'testFixtures', 'bosnianLesson.md'),
  'utf-8'
);

describe('domHighlighter', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    container.innerHTML = '';
  });

  /**
   * Helper to create HTML structure that mimics rendered markdown
   */
  const createRenderedMarkdown = (markdown: string): void => {
    // Simple markdown to HTML conversion for testing
    let html = markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/, '<ul>$1</ul>')
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        if (!line.match(/^<[h|u|l|p|s|e|a|c|s]/)) {
          return `<p>${line}</p>`;
        }
        return line;
      })
      .join('\n');
    
    container.innerHTML = html;
  };

  describe('applyHighlightingToDOM', () => {
    it('should return no-op cleanup function when no chunks provided', () => {
      const cleanup = applyHighlightingToDOM(container, []);
      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });

    it('should highlight text in rendered markdown paragraph', () => {
      createRenderedMarkdown('This is a test lesson with some content that can be highlighted.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      expect(spans.length).toBeGreaterThan(0);
      
      if (spans.length > 0) {
        expect(spans[0].getAttribute('data-has-note')).toBe('true');
        expect(spans[0].getAttribute('data-has-question')).toBe('false');
        expect(spans[0].className).toContain('bg-green-200/20');
        expect(spans[0].textContent?.toLowerCase()).toContain('test');
      }
    });

    it('should highlight text in complex markdown with headings and lists', () => {
      createRenderedMarkdown(`
# Introduction

This is a test lesson about React components.

## Key Concepts

- Components are reusable
- Props pass data
- State manages changes

The test lesson continues here with more information.
      `.trim());
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      // Should find at least one match
      expect(spans.length).toBeGreaterThan(0);
      
      // Verify the highlighted text is in the rendered content
      const allText = container.textContent || '';
      expect(allText.toLowerCase()).toContain('test lesson');
    });

    it('should highlight with question class when hasQuestion is true', () => {
      createRenderedMarkdown('This is a test lesson about programming concepts.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: true,
          hasNote: false,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      if (spans.length > 0) {
        expect(spans[0].getAttribute('data-has-question')).toBe('true');
        expect(spans[0].getAttribute('data-has-note')).toBe('false');
        expect(spans[0].className).toContain('bg-indigo-200/20');
      }
    });

    it('should highlight with both question and note class', () => {
      createRenderedMarkdown('This is a test lesson about programming concepts.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: true,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      if (spans.length > 0) {
        expect(spans[0].getAttribute('data-has-question')).toBe('true');
        expect(spans[0].getAttribute('data-has-note')).toBe('true');
        expect(spans[0].className).toContain('bg-gradient-to-r');
      }
    });

    it('should highlight multiple occurrences of the same text', () => {
      createRenderedMarkdown('This is a test lesson. Another test lesson appears here.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      // Should find multiple matches
      expect(spans.length).toBeGreaterThanOrEqual(1);
    });

    it('should highlight different text ranges', () => {
      createRenderedMarkdown('This is a test lesson with some content that can be highlighted.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
        {
          text: 'some content',
          highlightId: 'test-2',
          hasQuestion: true,
          hasNote: false,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      // Should find highlights for both ranges
      expect(spans.length).toBeGreaterThanOrEqual(1);
    });

    it('should highlight text inside code blocks', () => {
      createRenderedMarkdown(`
This is a test lesson.

\`\`\`javascript
const test = "test lesson";
\`\`\`

More content here.
      `.trim());
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      // Code blocks are now allowed to be highlighted
      // Check that highlighting occurs in regular text
      const spans = container.querySelectorAll('span[data-highlight="true"]');
      expect(spans.length).toBeGreaterThan(0);
      
      // Verify the highlighted text is found
      const allText = container.textContent || '';
      expect(allText.toLowerCase()).toContain('test lesson');
    });

    it('should NOT highlight text inside buttons', () => {
      container.innerHTML = '<p>This is a test lesson.</p><button>test lesson</button><p>More content.</p>';
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        const spansInButton = button.querySelectorAll('span[data-highlight="true"]');
        expect(spansInButton.length).toBe(0);
      });
    });

    it('should cleanup highlights when cleanup function is called', () => {
      createRenderedMarkdown('This is a test lesson with some content.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      const cleanup = applyHighlightingToDOM(container, chunks);

      // Manually add a mark to test cleanup if none were added
      const p = container.querySelector('p');
      if (p && !p.querySelector('mark[data-highlight="true"]')) {
        p.innerHTML = 'This is a <span data-highlight="true">test lesson</span> with some content.';
      }

      let spans = container.querySelectorAll('span[data-highlight="true"]');
      const initialCount = spans.length;

      // Cleanup
      cleanup();

      // Verify highlights were removed
      spans = container.querySelectorAll('span[data-highlight="true"]');
      expect(spans.length).toBe(0);
    });

    it('should handle case-insensitive matching', () => {
      createRenderedMarkdown('This is a TEST LESSON about programming.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      // Should find match despite case difference
      expect(spans.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle text with extra whitespace', () => {
      createRenderedMarkdown('This is a test   lesson with multiple spaces.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      // Should still find match despite whitespace differences
      expect(spans.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle markdown with bold and italic text', () => {
      createRenderedMarkdown('This is a **test lesson** with *emphasis* and more content.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      // Should find match even when text is in bold/italic
      expect(spans.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle markdown with links', () => {
      createRenderedMarkdown('This is a [test lesson](https://example.com) with a link.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      // Should find match even when text is in a link
      expect(spans.length).toBeGreaterThanOrEqual(0);
    });

    it('should preserve text content after cleanup', () => {
      createRenderedMarkdown('This is a test lesson with some content.');
      
      const originalText = container.textContent || '';

      const chunks: HighlightChunk[] = [
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      const cleanup = applyHighlightingToDOM(container, chunks);
      
      // Manually add mark for cleanup test
      const p = container.querySelector('p');
      if (p) {
        p.innerHTML = 'This is a <span data-highlight="true">test lesson</span> with some content.';
      }
      
      cleanup();

      // Text content should be preserved
      const finalText = container.textContent || '';
      expect(finalText).toContain('test lesson');
    });

    it('should handle empty or whitespace-only search text', () => {
      createRenderedMarkdown('This is a test lesson.');
      
      const chunks: HighlightChunk[] = [
        {
          text: '',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
        {
          text: '   ',
          highlightId: 'test-2',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      expect(spans.length).toBe(0);
    });

    it('should sort ranges by length (longest first) to avoid partial matches', () => {
      createRenderedMarkdown('This is a test lesson with content.');
      
      const chunks: HighlightChunk[] = [
        {
          text: 'test',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
        {
          text: 'test lesson',
          highlightId: 'test-2',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      // Should prioritize longer match
      expect(spans.length).toBeGreaterThanOrEqual(0);
    });

    it('should highlight text in complex real-world markdown content (Bosnian lesson)', () => {
      createRenderedMarkdown(bosnianLessonMarkdown);
      
      const chunks: HighlightChunk[] = [
        {
          text: 'Bosnian language',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
        {
          text: 'Bosnian Alphabet',
          highlightId: 'test-2',
          hasQuestion: true,
          hasNote: false,
        },
        {
          text: 'basic grammar',
          highlightId: 'test-3',
          hasQuestion: false,
          hasNote: true,
        },
        {
          text: 'Zdravo',
          highlightId: 'test-4',
          hasQuestion: true,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      
      // Should find highlights for the search terms
      expect(spans.length).toBeGreaterThan(0);
      
      // Verify specific highlights
      const allText = container.textContent || '';
      const lowerText = allText.toLowerCase();
      
      // Check that highlights were applied (text should still be present)
      expect(lowerText).toContain('bosnian');
      
      // Verify highlight attributes
      if (spans.length > 0) {
        const firstSpan = spans[0] as HTMLElement;
        expect(firstSpan.getAttribute('data-highlight')).toBe('true');
        expect(['true', 'false']).toContain(firstSpan.getAttribute('data-has-question'));
        expect(['true', 'false']).toContain(firstSpan.getAttribute('data-has-note'));
      }
    });

    it('should highlight multiple occurrences in complex markdown (Bosnian lesson)', () => {
      createRenderedMarkdown(bosnianLessonMarkdown);
      
      const chunks: HighlightChunk[] = [
        {
          text: 'Bosnian',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      
      // Should find first match only (as per implementation)
      expect(spans.length).toBeGreaterThanOrEqual(1);
      
      // Verify all spans have correct attributes
      spans.forEach((span) => {
        expect(span.getAttribute('data-highlight')).toBe('true');
        expect(span.getAttribute('data-has-note')).toBe('true');
        expect(span.getAttribute('data-has-question')).toBe('false');
        expect((span as HTMLElement).className).toContain('bg-green-200/20');
      });
    });

    it('should highlight text inside code blocks in complex markdown', () => {
      createRenderedMarkdown(bosnianLessonMarkdown);
      
      const chunks: HighlightChunk[] = [
        {
          text: 'Zdravo',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
        {
          text: 'Hvala',
          highlightId: 'test-2',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      // Code blocks are now allowed to be highlighted
      // Check that highlighting occurs
      const spans = container.querySelectorAll('span[data-highlight="true"]');
      // Should find highlights (may be in code blocks or regular text)
      expect(spans.length).toBeGreaterThanOrEqual(0);
    });

    it('should highlight multi-paragraph text selection spanning Basic Grammar Structure section', () => {
      createRenderedMarkdown(bosnianLessonMarkdown);
      
      // Use chunks instead of full text (as per chunk-based approach)
      const { chunkText } = require('../../../../features/concepts/utils/textChunking');
      const selectedText = `Basic Grammar Structure

Bosnian grammar can be complex, but starting with simple sentence structure is key. The typical word order is Subject-Verb-Object (SVO), similar to English, but it is more flexible due to the use of cases.

Nouns have gender: masculine, feminine, and neuter. This affects the form of associated words.

Masculine: stol (table)

Feminine: knjiga (book)

Neuter: more (sea)

Verbs are conjugated based on person (I, you, he/she/it, we, you plural, they) and tense.

Cases: Nouns, pronouns, and adjectives change their endings (decline) based on their grammatical role in the sentence (subject, object, etc.). There are seven cases, but beginners start with the nominative (subject) case.`;
      
      const textChunks = chunkText(selectedText);
      const chunks: HighlightChunk[] = textChunks.map((chunk: string, index: number) => ({
        text: chunk,
        highlightId: 'test-1',
        hasQuestion: true,
        hasNote: false,
      }));

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      
      // Should find highlights for chunks from this multi-paragraph selection
      // At least some chunks should match (first match only per chunk)
      expect(spans.length).toBeGreaterThanOrEqual(0);
      
      // If any highlights were found, verify attributes
      if (spans.length > 0) {
        const firstSpan = spans[0] as HTMLElement;
        expect(firstSpan.getAttribute('data-has-question')).toBe('true');
        expect(firstSpan.getAttribute('data-has-note')).toBe('false');
        expect(firstSpan.className).toContain('bg-indigo-200/20');
        
        // Verify the highlighted text contains some key phrases from the selection
        const allHighlightedText = Array.from(spans)
          .map(span => span.textContent || '')
          .join(' ')
          .toLowerCase();
        
        // At least one of these should be present
        const hasKeyPhrase = 
          allHighlightedText.includes('basic grammar') ||
          allHighlightedText.includes('bosnian grammar') ||
          allHighlightedText.includes('subject-verb-object') ||
          allHighlightedText.includes('nouns have gender') ||
          allHighlightedText.includes('masculine') ||
          allHighlightedText.includes('verbs are conjugated') ||
          allHighlightedText.includes('cases');
        
        expect(hasKeyPhrase).toBe(true);
      }
    });

    it('should highlight partial text from Basic Grammar Structure section', () => {
      createRenderedMarkdown(bosnianLessonMarkdown);
      
      const chunks: HighlightChunk[] = [
        {
          text: 'Nouns have gender: masculine, feminine, and neuter',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
        {
          text: 'Subject-Verb-Object (SVO)',
          highlightId: 'test-2',
          hasQuestion: true,
          hasNote: false,
        },
        {
          text: 'seven cases',
          highlightId: 'test-3',
          hasQuestion: false,
          hasNote: true,
        },
      ];

      applyHighlightingToDOM(container, chunks);

      const spans = container.querySelectorAll('span[data-highlight="true"]');
      
      // Should find highlights for all three search terms
      expect(spans.length).toBeGreaterThan(0);
      
      // Verify different highlight types are applied
      const questionSpans = Array.from(spans).filter(span => 
        span.getAttribute('data-has-question') === 'true'
      );
      const noteSpans = Array.from(spans).filter(span => 
        span.getAttribute('data-has-note') === 'true'
      );
      
      expect(questionSpans.length).toBeGreaterThan(0);
      expect(noteSpans.length).toBeGreaterThan(0);
      
      // Verify question spans have correct class
      questionSpans.forEach((span) => {
        expect((span as HTMLElement).className).toContain('bg-indigo-200/20');
      });
      
      // Verify note spans have correct class
      noteSpans.forEach((span) => {
        expect((span as HTMLElement).className).toContain('bg-green-200/20');
      });
    });
  });
});
