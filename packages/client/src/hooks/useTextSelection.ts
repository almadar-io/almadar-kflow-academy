import { useState, useEffect } from 'react';

interface UseTextSelectionOptions {
  onTextSelected?: (text: string) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
  excludeRef?: React.RefObject<HTMLElement | null>; // Ref to element that should be excluded from selection handling
}

interface UseTextSelectionReturn {
  selectedText: string;
  clearSelection: () => void;
}

/**
 * Shared hook for text selection logic
 * Detects when text is selected and provides the selected text
 */
export const useTextSelection = ({
  onTextSelected,
  containerRef,
  excludeRef,
}: UseTextSelectionOptions = {}): UseTextSelectionReturn => {
  const [selectedText, setSelectedText] = useState<string>('');

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection) {
        return;
      }
      
      const text = selection.toString().trim();

      if (text.length > 0) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Only process if selection is not empty and has valid dimensions
          if (rect.width > 0 || rect.height > 0) {
            setSelectedText(text);
            if (onTextSelected) {
              onTextSelected(text);
            }
          }
        } catch (e) {
          // Ignore errors when getting range (e.g., if selection is collapsed)
          setSelectedText('');
        }
      } else {
        setSelectedText('');
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Don't process if clicking on excluded element (e.g., tooltip)
      if (excludeRef?.current && excludeRef.current.contains(e.target as Node)) {
        return;
      }
      
      // Small delay to allow selection to complete
      setTimeout(handleSelection, 100);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Small delay to allow selection to complete on mobile
      setTimeout(handleSelection, 200);
    };

    // Listen for selection changes and mouse/touch events
    // Use capture phase to catch events early
    document.addEventListener('selectionchange', handleSelection, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('touchend', handleTouchEnd, true);

    return () => {
      document.removeEventListener('selectionchange', handleSelection, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('touchend', handleTouchEnd, true);
    };
  }, [onTextSelected, excludeRef]);

  const clearSelection = () => {
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  return {
    selectedText,
    clearSelection,
  };
};

