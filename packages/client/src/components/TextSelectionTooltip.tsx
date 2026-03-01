import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HelpCircle, StickyNote } from 'lucide-react';
import { useTextSelection } from '../hooks/useTextSelection';
import TextSelectionAlert from './TextSelectionAlert';
import { Concept } from '../features/concepts/types';
import { chunkTextByNewline } from '../features/concepts/utils/textChunking';

interface SelectionData {
  text: string;
  chunks?: string[];
}

interface TextSelectionTooltipProps {
  onAskQuestion: (data: SelectionData) => void;
  onAddNote?: (data: SelectionData) => void;
  concept?: Concept | null;
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Detects if device is mobile based on touch capability and screen width
 */
const isMobileDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.innerWidth <= 768)
  );
};

const TextSelectionTooltip: React.FC<TextSelectionTooltipProps> = ({
  onAskQuestion,
  onAddNote,
  concept,
  containerRef,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Use shared text selection hook
  const { selectedText, clearSelection } = useTextSelection({
    onTextSelected: (text) => {
      if (text && !isMobile) {
        // Only calculate position for desktop tooltip
        const selection = window.getSelection();
        if (selection) {
          try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            if (rect.width > 0 || rect.height > 0) {
              setSelectionRect(rect);
              setPosition({
                top: rect.top - 70,
                left: rect.left + rect.width / 2,
              });
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }
    },
    containerRef,
    excludeRef: tooltipRef, // Exclude tooltip from selection handling
  });

  // Adjust position if tooltip would go off screen (desktop only)
  useEffect(() => {
    if (isMobile || !position || !tooltipRef.current || !selectionRect) {
      return;
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedLeft = position.left;
    let adjustedTop = position.top;

    // Adjust horizontal position
    if (position.left + tooltipRect.width / 2 > viewportWidth) {
      adjustedLeft = viewportWidth - tooltipRect.width / 2 - 10;
    } else if (position.left - tooltipRect.width / 2 < 0) {
      adjustedLeft = tooltipRect.width / 2 + 10;
    }

    // Adjust vertical position - always try to keep it above the selection
    if (position.top < 0) {
      adjustedTop = 10;
    } else if (position.top + tooltipRect.height > viewportHeight) {
      adjustedTop = selectionRect.top - tooltipRect.height - 20;
      if (adjustedTop < 0) {
        adjustedTop = 10;
      }
    }

    if (adjustedLeft !== position.left || adjustedTop !== position.top) {
      setPosition({ top: adjustedTop, left: adjustedLeft });
    }
  }, [position, selectionRect, isMobile]);

  // Check if selected text has existing questions or notes (must be called before any early returns)
  const hasQuestion = useMemo(() => {
    if (!concept || !selectedText) return false;
    const questions = Array.isArray(concept.questions) ? concept.questions : [];
    return questions.some(qa => qa.selectedText?.trim().toLowerCase() === selectedText.trim().toLowerCase());
  }, [concept, selectedText]);

  const hasNote = useMemo(() => {
    if (!concept || !selectedText) return false;
    const notes = Array.isArray(concept.notes) ? concept.notes : [];
    return notes.some(note => note.selectedText?.trim().toLowerCase() === selectedText.trim().toLowerCase());
  }, [concept, selectedText]);

  // On mobile, show alert instead of tooltip
  if (isMobile) {
    return (
      <TextSelectionAlert
        selectedText={selectedText}
        onAskQuestion={onAskQuestion}
        onAddNote={onAddNote}
        onDismiss={clearSelection}
      />
    );
  }

  // On desktop, show tooltip
  if (!selectedText || !position) {
    return null;
  }

  const handleAskQuestion = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create chunks from selected text
    const chunks = chunkTextByNewline(selectedText);
    onAskQuestion({
      text: selectedText,
      chunks: chunks.length > 0 ? chunks : undefined,
    });
    
    clearSelection();
    setPosition(null);
    setSelectionRect(null);
  };

  const handleAddNote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onAddNote) return;
    
    // Create chunks from selected text
    console.log('selectedText', selectedText);
    const chunks = chunkTextByNewline(selectedText);
    console.log('chunks', chunks);
    onAddNote({
      text: selectedText,
      chunks: chunks.length > 0 ? chunks : undefined,
    });
    
    clearSelection();
    setPosition(null);
    setSelectionRect(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Always show both buttons side by side
  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] flex items-center gap-2 rounded-lg shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
        <button
          onClick={handleAskQuestion}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded hover:opacity-90 transition-colors ${
            hasQuestion
              ? 'bg-indigo-700 dark:bg-indigo-600'
              : 'bg-indigo-600 dark:bg-indigo-500'
          }`}
          title={hasQuestion ? 'Question already asked - Ask another' : 'Ask about this'}
        >
          <HelpCircle size={14} />
          <span className="text-xs font-medium">Ask about this</span>
        </button>
        {onAddNote && (
          <button
            onClick={handleAddNote}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded hover:opacity-90 transition-colors ${
              hasNote
                ? 'bg-green-700 dark:bg-green-600'
                : 'bg-green-600 dark:bg-green-500'
            }`}
            title={hasNote ? 'Note already added - Add another' : 'Add Note'}
          >
            <StickyNote size={14} />
            <span className="text-xs font-medium">Note</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TextSelectionTooltip;

