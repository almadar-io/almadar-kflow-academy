import React from 'react';
import { HelpCircle, StickyNote, X } from 'lucide-react';
import { chunkTextByNewline } from '../features/concepts/utils/textChunking';

interface SelectionData {
  text: string;
  html?: string; // Full HTML structure of the selection
  chunks?: string[]; // Deprecated - kept for backward compatibility
}

interface TextSelectionAlertProps {
  selectedText: string;
  selectedHTML?: string;
  onAskQuestion: (data: SelectionData) => void;
  onAddNote?: (data: SelectionData) => void;
  onDismiss: () => void;
}

/**
 * Mobile alert component that appears at the top of the screen when text is selected
 */
const TextSelectionAlert: React.FC<TextSelectionAlertProps> = ({
  selectedText,
  onAskQuestion,
  onAddNote,
  onDismiss,
}) => {
  if (!selectedText) {
    return null;
  }

  const handleAskQuestion = () => {
    // For mobile, create chunks from selected text
    const chunks = chunkTextByNewline(selectedText);
    onAskQuestion({ 
      text: selectedText,
      chunks: chunks.length > 0 ? chunks : undefined,
    });
    onDismiss();
  };

  const handleAddNote = () => {
    if (onAddNote) {
      const chunks = chunkTextByNewline(selectedText);
      onAddNote({ 
        text: selectedText,
        chunks: chunks.length > 0 ? chunks : undefined,
      });
      onDismiss();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] !mt-0 px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg border-b border-indigo-700 dark:border-indigo-600 md:hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex gap-2 flex-1 min-w-0">
          <button
            onClick={handleAskQuestion}
            className="flex items-center justify-center gap-2 flex-1 min-w-0 bg-white dark:bg-gray-100 text-indigo-600 dark:text-indigo-700 font-semibold rounded-lg px-3 py-2.5 shadow-md hover:bg-gray-50 dark:hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
          >
            <HelpCircle size={18} className="flex-shrink-0" />
            <span className="text-sm truncate">Ask about this</span>
          </button>
          {onAddNote && (
            <button
              onClick={handleAddNote}
              className="flex items-center justify-center gap-2 flex-1 min-w-0 bg-white dark:bg-gray-100 text-green-600 dark:text-green-700 font-semibold rounded-lg px-3 py-2.5 shadow-md hover:bg-gray-50 dark:hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
            >
              <StickyNote size={18} className="flex-shrink-0" />
              <span className="text-sm truncate">Note</span>
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default TextSelectionAlert;

