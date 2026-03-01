/**
 * SelectionToolbar Molecule Component
 * 
 * A floating toolbar that appears when text is selected in the lesson content.
 * Provides options to ask a question or add a note about the selected text.
 * 
 * Mobile-friendly design:
 * - Desktop: Floating toolbar above the selection
 * - Mobile: Sticky header bar at the top of the screen that doesn't interfere
 *   with the browser's native context menu (copy, select all, etc.)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { MessageCircleQuestion, StickyNote, X, Highlighter } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { cn } from '../../../utils/theme';

export interface SelectionInfo {
  /**
   * The selected text content
   */
  text: string;
  
  /**
   * Selected text split into chunks for highlighting
   */
  textChunks: string[];
  
  /**
   * Position for the toolbar
   */
  position: {
    top: number;
    left: number;
  };
}

export interface SelectionToolbarProps {
  /**
   * Callback when "Ask Question" is clicked
   */
  onAskQuestion?: (selection: SelectionInfo) => void;
  
  /**
   * Callback when "Add Note" is clicked
   */
  onAddNote?: (selection: SelectionInfo) => void;
  
  /**
   * Container element to watch for text selection
   */
  containerRef: React.RefObject<HTMLElement | null>;
  
  /**
   * Whether the toolbar is disabled
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Split text into chunks for better highlight matching
 */
function splitIntoChunks(text: string): string[] {
  // Split by sentences or line breaks, keeping reasonable chunk sizes
  const chunks = text
    .split(/(?<=[.!?])\s+|\n+/)
    .filter(chunk => chunk.trim().length > 0)
    .map(chunk => chunk.trim());
  
  // If no good split points, split by length
  if (chunks.length === 1 && text.length > 100) {
    const words = text.split(/\s+/);
    const result: string[] = [];
    let current = '';
    
    for (const word of words) {
      if (current.length + word.length > 80) {
        if (current) result.push(current.trim());
        current = word;
      } else {
        current += (current ? ' ' : '') + word;
      }
    }
    if (current) result.push(current.trim());
    
    return result;
  }
  
  return chunks;
}

/**
 * SelectionToolbar component
 */
export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  onAskQuestion,
  onAddNote,
  containerRef,
  disabled = false,
  className,
}) => {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Detect mobile/touch devices
  useEffect(() => {
    const checkMobile = () => {
      // Check for touch capability and screen width
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice && isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /**
   * Handle text selection within the container
   */
  const handleSelectionChange = useCallback(() => {
    if (disabled) return;

    const windowSelection = window.getSelection();
    
    if (!windowSelection || windowSelection.isCollapsed) {
      // No selection or collapsed selection
      setSelection(null);
      setIsVisible(false);
      return;
    }

    const selectedText = windowSelection.toString().trim();
    
    if (!selectedText || selectedText.length < 3) {
      // Too short to be meaningful
      setSelection(null);
      setIsVisible(false);
      return;
    }

    // Check if selection is within our container
    const range = windowSelection.getRangeAt(0);
    const container = containerRef.current;
    
    if (!container || !container.contains(range.commonAncestorContainer)) {
      // Selection is outside our container
      setSelection(null);
      setIsVisible(false);
      return;
    }

    // Get position for toolbar (above the selection)
    const rect = range.getBoundingClientRect();
    
    // Position relative to viewport
    const position = {
      top: rect.top - 50, // Above the selection
      left: rect.left + (rect.width / 2), // Center horizontally
    };

    // Ensure toolbar stays within viewport
    position.left = Math.max(100, Math.min(position.left, window.innerWidth - 100));
    position.top = Math.max(60, position.top);

    setSelection({
      text: selectedText,
      textChunks: splitIntoChunks(selectedText),
      position,
    });
    setIsVisible(true);
  }, [containerRef, disabled]);

  /**
   * Debounced selection handler for mobile (prevents flickering from rapid selection changes)
   */
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedSelectionChange = useCallback(() => {
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }
    
    // On mobile, add a small delay to let the native selection UI settle
    const delay = isMobile ? 300 : 0;
    
    selectionTimeoutRef.current = setTimeout(() => {
      handleSelectionChange();
    }, delay);
  }, [handleSelectionChange, isMobile]);

  /**
   * Handle clicking outside to close toolbar
   */
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
      // Small delay to allow button clicks to register
      setTimeout(() => {
        const currentSelection = window.getSelection();
        if (!currentSelection || currentSelection.isCollapsed) {
          setIsVisible(false);
          setSelection(null);
        }
      }, 100);
    }
  }, []);

  /**
   * Handle ask question action
   */
  const handleAskQuestion = useCallback(() => {
    if (selection && onAskQuestion) {
      onAskQuestion(selection);
      // Clear selection after action
      window.getSelection()?.removeAllRanges();
      setIsVisible(false);
      setSelection(null);
    }
  }, [selection, onAskQuestion]);

  /**
   * Handle add note action
   */
  const handleAddNote = useCallback(() => {
    if (selection && onAddNote) {
      onAddNote(selection);
      // Clear selection after action
      window.getSelection()?.removeAllRanges();
      setIsVisible(false);
      setSelection(null);
    }
  }, [selection, onAddNote]);

  /**
   * Close the toolbar
   */
  const handleClose = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setIsVisible(false);
    setSelection(null);
  }, []);

  // Listen for selection changes
  useEffect(() => {
    document.addEventListener('selectionchange', debouncedSelectionChange);
    document.addEventListener('mousedown', handleClickOutside);
    
    // On mobile, also listen for touchend to catch when selection is complete
    if (isMobile) {
      document.addEventListener('touchend', debouncedSelectionChange);
    }
    
    return () => {
      document.removeEventListener('selectionchange', debouncedSelectionChange);
      document.removeEventListener('mousedown', handleClickOutside);
      if (isMobile) {
        document.removeEventListener('touchend', debouncedSelectionChange);
      }
      // Clean up timeout on unmount
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [debouncedSelectionChange, handleClickOutside, isMobile]);

  // Don't render if not visible or no selection
  if (!isVisible || !selection) {
    return null;
  }

  // Mobile: Sticky header bar at top of screen
  if (isMobile) {
    return ReactDOM.createPortal(
      <div
        ref={toolbarRef}
        className={cn(
          'fixed top-0 left-0 right-0 z-[9999]',
          'flex items-center justify-between px-3 py-2',
          'bg-indigo-600 dark:bg-indigo-700',
          'shadow-lg',
          'animate-in slide-in-from-top duration-200',
          className
        )}
      >
        {/* Left: Selection indicator */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Highlighter size={16} className="text-indigo-200 flex-shrink-0" />
          <span className="text-white text-sm truncate">
            "{selection.text.length > 30 ? selection.text.slice(0, 30) + '...' : selection.text}"
          </span>
        </div>
        
        {/* Right: Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onAskQuestion && (
            <button
              onClick={handleAskQuestion}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
              title="Ask a question about this text"
            >
              <MessageCircleQuestion size={16} />
              <span>Ask</span>
            </button>
          )}
          
          {onAddNote && (
            <button
              onClick={handleAddNote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
              title="Add a note about this text"
            >
              <StickyNote size={16} />
              <span>Note</span>
            </button>
          )}
          
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors ml-1"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // Desktop: Floating toolbar above selection
  return ReactDOM.createPortal(
    <div
      ref={toolbarRef}
      className={cn(
        'fixed z-[9999] flex items-center gap-1 p-1.5',
        'bg-white dark:bg-gray-800',
        'rounded-lg shadow-lg',
        'border border-gray-200 dark:border-gray-700',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        className
      )}
      style={{
        top: selection.position.top,
        left: selection.position.left,
        transform: 'translateX(-50%)',
      }}
    >
      {onAskQuestion && (
        <Button
          variant="ghost"
          size="sm"
          icon={MessageCircleQuestion}
          onClick={handleAskQuestion}
          className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          title="Ask a question about this text"
        >
          <span className="hidden sm:inline">Ask Question</span>
        </Button>
      )}
      
      {onAddNote && (
        <Button
          variant="ghost"
          size="sm"
          icon={StickyNote}
          onClick={handleAddNote}
          className="text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
          title="Add a note about this text"
        >
          <span className="hidden sm:inline">Add Note</span>
        </Button>
      )}
      
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        icon={X}
        onClick={handleClose}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
        title="Close"
      >
        <span className="sr-only">Close</span>
      </Button>
    </div>,
    document.body
  );
};

SelectionToolbar.displayName = 'SelectionToolbar';

