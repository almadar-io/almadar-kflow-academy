/**
 * AnnotatedLessonContent Organism Component
 * 
 * A dumb component that renders lesson content with text highlighting.
 * All state management (modals, streaming, questions, notes) is handled by the container.
 * This component only renders and triggers callbacks.
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { SelectionToolbar, SelectionInfo } from '../SelectionToolbar';
import { SegmentRenderer, parseLessonSegments } from '../LessonSegments';
import { InteractiveOrbitalPanel } from '../InteractiveOrbitalPanel';
import { useRunCodeSimulation } from '@features/learning/hooks/useRunCodeSimulation';
import { useGenerateInteractiveOrbital } from '@features/learning/hooks/useGenerateInteractiveOrbital';
import type { GenerateInteractiveOrbitalRequest } from '@features/learning/api/interactiveOrbitalAPI';
import { cn } from '@utils/theme';
import type { QuestionAnswerItem, NoteItem, AnnotationType } from '@features/knowledge-graph/types';

export interface AnnotatedLessonContentProps {
  /**
   * Lesson content (markdown)
   */
  content: string;
  
  /**
   * Existing questions for this lesson (for highlighting)
   */
  questions?: QuestionAnswerItem[];
  
  /**
   * Existing notes for this lesson (for highlighting)
   */
  notes?: NoteItem[];
  
  /**
   * Callback when user selects text and clicks "Ask Question"
   * Container handles the modal and streaming
   */
  onSelectForQuestion?: (selection: SelectionInfo) => void;
  
  /**
   * Callback when user selects text and clicks "Add Note"
   * Container handles the modal
   */
  onSelectForNote?: (selection: SelectionInfo) => void;
  
  /**
   * Callback when user clicks on a highlighted annotation
   * Container handles showing the annotation details
   */
  onAnnotationClick?: (type: AnnotationType, annotation: QuestionAnswerItem | NoteItem) => void;
  
  /**
   * Whether annotations are disabled
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Concept context used to generate interactive visualizations.
   */
  concept?: {
    id?: string;
    name: string;
    description?: string;
  };
}

// Re-export SelectionInfo for container use
export type { SelectionInfo } from '../SelectionToolbar';

/**
 * AnnotatedLessonContent component - Dumb component that renders and triggers callbacks
 */
export const AnnotatedLessonContent: React.FC<AnnotatedLessonContentProps> = ({
  content,
  questions = [],
  notes = [],
  onSelectForQuestion,
  onSelectForNote,
  onAnnotationClick,
  disabled = false,
  className,
  concept,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { run: runCodeSimulation } = useRunCodeSimulation();
  const { generate: generateInteractiveOrbital } = useGenerateInteractiveOrbital();

  const handleRunCodeSimulation = useCallback(
    async (code: string, language: string) => runCodeSimulation(language, code),
    [runCodeSimulation],
  );

  const handleGenerateInteractiveOrbital = useCallback(
    async (request: GenerateInteractiveOrbitalRequest) => generateInteractiveOrbital(request),
    [generateInteractiveOrbital],
  );

  // Parse lesson segments
  const segments = useMemo(() => {
    if (!content) return [];
    return parseLessonSegments(content);
  }, [content]);

  // Handle text selection for question - just trigger callback
  const handleAskQuestion = useCallback((selection: SelectionInfo) => {
    onSelectForQuestion?.(selection);
  }, [onSelectForQuestion]);

  // Handle text selection for note - just trigger callback
  const handleAddNote = useCallback((selection: SelectionInfo) => {
    onSelectForNote?.(selection);
  }, [onSelectForNote]);

  // Handle clicking on highlighted text - just trigger callback
  const handleHighlightClick = useCallback((
    type: AnnotationType,
    annotationId: string,
    _event: MouseEvent
  ) => {
    const annotation = type === 'question'
      ? questions.find(q => q.id === annotationId)
      : notes.find(n => n.id === annotationId);
    
    if (!annotation) return;
    
    onAnnotationClick?.(type, annotation);
  }, [questions, notes, onAnnotationClick]);

  // Apply highlighting to DOM after render
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const allAnnotations = [
      ...questions.map(q => ({ ...q, type: 'question' as AnnotationType })),
      ...notes.map(n => ({ ...n, type: 'note' as AnnotationType })),
    ];
    
    if (allAnnotations.length === 0) return;

    // Simple text-based highlighting using TreeWalker
    const applyHighlights = () => {
      allAnnotations.forEach(annotation => {
        const chunks = annotation.selectedTextChunks || [];
        if (chunks.length === 0) return;
        
        chunks.forEach(chunk => {
          if (!chunk || chunk.length < 3) return;
          
          const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let node: Text | null;
          while ((node = walker.nextNode() as Text | null)) {
            const text = node.textContent || '';
            const index = text.indexOf(chunk);
            
            if (index !== -1) {
              // Check if already highlighted
              const parent = node.parentElement;
              if (parent?.dataset.highlight === 'true') continue;
              
              // Create highlight span
              const before = text.substring(0, index);
              const match = text.substring(index, index + chunk.length);
              const after = text.substring(index + chunk.length);
              
              const span = document.createElement('span');
              span.dataset.highlight = 'true';
              span.dataset.highlightType = annotation.type;
              span.dataset.annotationId = annotation.id;
              span.className = annotation.type === 'question'
                ? 'bg-surface hover:bg-surface-hover cursor-pointer rounded-sm transition-colors'
                : 'bg-surface hover:bg-surface-hover cursor-pointer rounded-sm transition-colors';
              span.textContent = match;
              span.onclick = (e) => handleHighlightClick(annotation.type, annotation.id, e as MouseEvent);
              
              const fragment = document.createDocumentFragment();
              if (before) fragment.appendChild(document.createTextNode(before));
              fragment.appendChild(span);
              if (after) fragment.appendChild(document.createTextNode(after));
              
              node.parentNode?.replaceChild(fragment, node);
              break; // Only highlight first occurrence per chunk
            }
          }
        });
      });
    };
    
    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(applyHighlights, 100);
    
    return () => {
      clearTimeout(timeoutId);
      // Cleanup highlights
      const highlights = container.querySelectorAll('[data-highlight="true"]');
      highlights.forEach(span => {
        const text = document.createTextNode(span.textContent || '');
        span.parentNode?.replaceChild(text, span);
      });
    };
  }, [segments, questions, notes, handleHighlightClick]);

  return (
    <div className={cn('relative', className)}>
      {/* Lesson Content with highlighting */}
      <div 
        ref={containerRef}
        className="prose max-w-none"
      >
        <SegmentRenderer
          segments={segments}
          onRunCodeSimulation={handleRunCodeSimulation}
          onRenderVisualization={concept ? (type, description, index) => (
            <InteractiveOrbitalPanel
              key={`visualize-${index}`}
              type={type}
              description={description}
              concept={concept}
              onGenerate={handleGenerateInteractiveOrbital}
              autoGenerate={false}
            />
          ) : undefined}
        />
      </div>

      {/* Selection Toolbar - appears when text is selected, triggers callbacks */}
      {!disabled && (
        <SelectionToolbar
          containerRef={containerRef}
          onAskQuestion={onSelectForQuestion ? handleAskQuestion : undefined}
          onAddNote={onSelectForNote ? handleAddNote : undefined}
          disabled={disabled}
        />
      )}
    </div>
  );
};

AnnotatedLessonContent.displayName = 'AnnotatedLessonContent';
