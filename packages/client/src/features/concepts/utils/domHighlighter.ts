import { HighlightChunk } from './textHighlighter';
import { Concept, QuestionAnswer } from '../types';

/**
 * Block-level elements that markdown typically renders
 * These are the containers we'll search within
 */
const BLOCK_ELEMENTS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'div',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'hr', 'pre', 'code' // Added code and pre to allow highlighting in code blocks
];

/**
 * Inline elements that should be stripped when extracting text
 * These are formatting elements that don't affect text content
 * Note: 'code' is not included here as it's treated as a block element
 */
const INLINE_ELEMENTS = [
  'strong', 'b', 'em', 'i', 'a', 'span',
  'del', 'mark', 'sub', 'sup', 'small', 'u'
];

/**
 * @deprecated - No longer used for strict matching
 * Normalize text for matching - removes extra whitespace, normalizes line breaks, etc.
 */
function normalizeTextForMatching(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace all whitespace with single space
    .trim()
    .toLowerCase();
}

/**
 * Check if an element should be excluded from highlighting
 */
function shouldExcludeElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  
  // Exclude buttons, inputs, and already highlighted text
  // Note: code and pre tags are now allowed to be highlighted
  if (
    tagName === 'button' ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    (tagName === 'span' && element.getAttribute('data-highlight') === 'true') ||
    element.closest('button')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Check if an element is a block-level element
 */
function isBlockElement(element: HTMLElement): boolean {
  return BLOCK_ELEMENTS.includes(element.tagName.toLowerCase());
}

/**
 * Extract plain text from a block element, stripping inline formatting
 * This recursively walks through the element and collects text nodes
 * Preserves exact text structure (no normalization) for strict matching
 */
function extractBlockText(blockElement: HTMLElement): string {
  const textParts: string[] = [];
  
  const walker = document.createTreeWalker(
    blockElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip text nodes inside excluded elements
        let parent = node.parentElement;
        while (parent && parent !== blockElement) {
          if (shouldExcludeElement(parent)) {
            return NodeFilter.FILTER_REJECT;
          }
          // Include text from inline elements (we strip the tags, not the text)
          parent = parent.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    const text = textNode.textContent || '';
    // Preserve exact text, including whitespace
    textParts.push(text);
  }
  
  // Join with empty string to preserve exact spacing
  return textParts.join('');
}

/**
 * Find all block-level elements in the container
 */
function findBlockElements(container: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  
  // Use TreeWalker to find all block elements
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const element = node as HTMLElement;
        
        // Skip excluded elements
        if (shouldExcludeElement(element)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Check if this is a block element
        if (isBlockElement(element)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        // Continue searching in non-block elements
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  let element: HTMLElement | null;
  while ((element = walker.nextNode() as HTMLElement | null)) {
    blocks.push(element);
  }
  
  return blocks;
}

/**
 * Find text range within a block element using strict matching (no normalization)
 * Returns the first match only
 */
function findTextRangeInBlock(
  blockElement: HTMLElement,
  searchText: string
): Range | null {
  const ranges = findAllTextRangesInBlock(blockElement, searchText);
  return ranges.length > 0 ? ranges[0] : null;
}

/**
 * Find all text ranges within a block element using strict matching (no normalization)
 * Returns all matches
 */
function findAllTextRangesInBlock(
  blockElement: HTMLElement,
  searchText: string
): Range[] {
  const ranges: Range[] = [];
  
  if (!searchText || !searchText.trim()) {
    return ranges;
  }

  // Trim the search text for matching (but preserve case and spacing)
  const trimmedSearch = searchText.trim();
  if (!trimmedSearch) {
    return ranges;
  }

  // Extract text from block (strips inline tags, preserves exact text)
  const blockText = extractBlockText(blockElement);
  
  // Find all occurrences of the search text
  let searchIndex = 0;
  while ((searchIndex = blockText.indexOf(trimmedSearch, searchIndex)) !== -1) {
    const matchEnd = searchIndex + trimmedSearch.length;
    
    // Map the position back to actual DOM nodes
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      blockElement,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip text nodes inside excluded elements
          let parent = node.parentElement;
          while (parent && parent !== blockElement) {
            if (shouldExcludeElement(parent)) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let textNode: Text | null;
    while ((textNode = walker.nextNode() as Text | null)) {
      textNodes.push(textNode);
    }

    if (textNodes.length === 0) {
      searchIndex++;
      continue;
    }

    // Build text from text nodes to find positions (exact match, no normalization)
    let charCount = 0;
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;

    for (const node of textNodes) {
      const nodeText = node.textContent || '';
      const nodeLength = nodeText.length;

      // Check if match starts in this node
      if (charCount <= searchIndex && 
          searchIndex < charCount + nodeLength && 
          !startNode) {
        startNode = node;
        startOffset = searchIndex - charCount;
      }

      // Check if match ends in this node
      if (charCount < matchEnd && 
          matchEnd <= charCount + nodeLength && 
          !endNode) {
        endNode = node;
        endOffset = matchEnd - charCount;
        break;
      }

      charCount += nodeLength;
    }

    // Create range if we found both start and end nodes
    if (startNode && endNode) {
      try {
        const range = document.createRange();
        const maxStart = startNode.textContent?.length || 0;
        const maxEnd = endNode.textContent?.length || 0;
        range.setStart(startNode, Math.min(startOffset, maxStart));
        range.setEnd(endNode, Math.min(endOffset, maxEnd));
        ranges.push(range);
      } catch (e) {
        // Skip this match if range creation fails
      }
    }

    // Move to next position to find next match
    searchIndex++;
  }

  return ranges;
}

/**
 * @deprecated - No longer used with strict matching
 * This function was used for normalized text matching but is not needed for strict matching
 */
function findOffsetInNode(node: Text, normalizedOffset: number): number {
  // Not used anymore - strict matching uses direct character offsets
  return normalizedOffset;
}

/**
 * Wrap a range with a highlight span (preserves HTML structure)
 */
function wrapRangeInHighlight(
  range: Range,
  highlightClass: string,
  hasQuestion: boolean,
  hasNote: boolean,
  highlightId: string,
  noteText?: string,
  concept?: Concept | null,
  onQuestionClick?: (questionAnswer: QuestionAnswer) => void
): HTMLElement | null {
  try {
    // Check if range is already inside a highlight with the same ID
    const commonAncestor = range.commonAncestorContainer;
    if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
      const element = commonAncestor as Element;
      const existingHighlight = element.closest(`span[data-highlight-id="${highlightId}"]`);
      if (existingHighlight) {
        return null; // Already highlighted with this ID
      }
    }
    
    // Create the highlight span
    const highlightSpan = document.createElement('span');
    highlightSpan.className = highlightClass;
    highlightSpan.setAttribute('data-highlight', 'true');
    highlightSpan.setAttribute('data-highlight-id', highlightId);
    highlightSpan.setAttribute('data-has-question', String(hasQuestion));
    highlightSpan.setAttribute('data-has-note', String(hasNote));
    if (noteText) {
      highlightSpan.setAttribute('title', noteText); // Simple tooltip
      highlightSpan.setAttribute('data-note-text', noteText);
    }
    
    // Add click handler for questions
    if (hasQuestion && concept && onQuestionClick) {
      highlightSpan.style.cursor = 'pointer';
      const clickHandler = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Find the question by highlightId
        const questions = Array.isArray(concept.questions) ? concept.questions : [];
        const questionAnswer = questions.find((qa) => {
          const qaHighlightId = qa.highlightId || `q_${qa.timestamp || Date.now()}`;
          return qaHighlightId === highlightId;
        });
        if (questionAnswer) {
          onQuestionClick(questionAnswer);
        }
      };
      highlightSpan.addEventListener('click', clickHandler);
      // Store handler for cleanup (we'll need to pass this through)
    }
    
    highlightSpan.style.setProperty('display', 'inline');
    highlightSpan.style.setProperty('box-decoration-break', 'clone');
    highlightSpan.style.setProperty('-webkit-box-decoration-break', 'clone');
    
    // Surround the range with the span
    range.surroundContents(highlightSpan);
    return highlightSpan;
  } catch (e) {
    // If surroundContents fails (e.g., range spans multiple nodes), use extractContents
    try {
      const contents = range.extractContents();
      const highlightSpan = document.createElement('span');
      highlightSpan.className = highlightClass;
      highlightSpan.setAttribute('data-highlight', 'true');
      highlightSpan.setAttribute('data-highlight-id', highlightId);
      highlightSpan.setAttribute('data-has-question', String(hasQuestion));
      highlightSpan.setAttribute('data-has-note', String(hasNote));
      if (noteText) {
        highlightSpan.setAttribute('title', noteText); // Simple tooltip
        highlightSpan.setAttribute('data-note-text', noteText);
      }
      
      // Add click handler for questions
      if (hasQuestion && concept && onQuestionClick) {
        highlightSpan.style.cursor = 'pointer';
        const clickHandler = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          // Find the question by highlightId
          const questions = Array.isArray(concept.questions) ? concept.questions : [];
          const questionAnswer = questions.find((qa) => {
            const qaHighlightId = qa.highlightId || `q_${qa.timestamp || Date.now()}`;
            return qaHighlightId === highlightId;
          });
          if (questionAnswer) {
            onQuestionClick(questionAnswer);
          }
        };
        highlightSpan.addEventListener('click', clickHandler);
      }
      
      highlightSpan.style.setProperty('display', 'inline');
      highlightSpan.style.setProperty('box-decoration-break', 'clone');
      highlightSpan.style.setProperty('-webkit-box-decoration-break', 'clone');
      highlightSpan.appendChild(contents);
      range.insertNode(highlightSpan);
      return highlightSpan;
    } catch (e2) {
      console.warn('Failed to highlight range:', e2);
      return null;
    }
  }
  return null;
}

/**
 * Apply highlighting to DOM elements based on highlight chunks (simplified block-based approach)
 */
export function applyHighlightingToDOM(
  container: HTMLElement,
  highlightChunks: HighlightChunk[],
  concept?: Concept | null,
  onQuestionClick?: (questionAnswer: QuestionAnswer) => void
): () => void {
  if (highlightChunks.length === 0) {
    return () => {}; // No cleanup needed
  }

  // Group chunks by highlightId to apply same styling
  const chunksByHighlightId = new Map<string, HighlightChunk[]>();
  highlightChunks.forEach((chunk) => {
    if (!chunksByHighlightId.has(chunk.highlightId)) {
      chunksByHighlightId.set(chunk.highlightId, []);
    }
    chunksByHighlightId.get(chunk.highlightId)!.push(chunk);
  });

  // Find all block elements
  const blockElements = findBlockElements(container);

  // Process each highlight group
  chunksByHighlightId.forEach((chunks, highlightId) => {
    // Determine highlight class from first chunk (all chunks in group have same flags)
    const firstChunk = chunks[0];
    let highlightClass = '';
    if (firstChunk.hasQuestion && firstChunk.hasNote) {
      highlightClass = 'bg-gradient-to-r from-indigo-200/20 via-purple-200/20 to-green-200/20 dark:from-indigo-800/20 dark:via-purple-800/20 dark:to-green-800/20 px-0.5 py-0.5 rounded-sm cursor-pointer';
    } else if (firstChunk.hasQuestion) {
      highlightClass = 'bg-indigo-200/20 dark:bg-indigo-800/20 px-0.5 py-0.5 rounded-sm cursor-pointer';
    } else if (firstChunk.hasNote) {
      highlightClass = 'bg-green-200/20 dark:bg-green-800/20 px-0.5 py-0.5 rounded-sm cursor-help';
    }

    // Apply highlighting for each chunk (all matches in all blocks)
    chunks.forEach((chunk) => {
      // Search in each block element for all matches
      for (const block of blockElements) {
        const ranges = findAllTextRangesInBlock(block, chunk.text);
        // Highlight all matches found in this block
        ranges.forEach((range) => {
          wrapRangeInHighlight(
            range,
            highlightClass,
            firstChunk.hasQuestion,
            firstChunk.hasNote,
            highlightId,
            firstChunk.noteText, // Pass note text for tooltip
            concept, // Pass concept for question lookup
            onQuestionClick // Pass click handler
          );
        });
      }
    });
  });

  // Return cleanup function
  return () => {
    // Remove all highlight spans and restore original text nodes
    // Click handlers will be automatically removed when spans are removed
    const spans = container.querySelectorAll('span[data-highlight="true"]');
    spans.forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        const textNode = document.createTextNode(span.textContent || '');
        parent.replaceChild(textNode, span);
        // Normalize to merge adjacent text nodes
        parent.normalize();
      }
    });
  };
}
