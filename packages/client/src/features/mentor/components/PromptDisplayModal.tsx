import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface PromptDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string | undefined;
  operationName: string;
}

const PromptDisplayModal: React.FC<PromptDisplayModalProps> = ({
  isOpen,
  onClose,
  prompt,
  operationName,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !prompt) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const formatOperationName = (name: string): string => {
    const nameMap: Record<string, string> = {
      'custom': 'Custom Operation',
      'explain': 'Explain / Generate Lesson',
      'progressiveExpandMultipleFromText': 'Progressive Expand Multiple From Text',
      'enrichment': 'Graph Enrichment',
    };
    return nameMap[name] || name;
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Prompt Used: {formatOperationName(operationName)}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Copy prompt"
            >
              {copied ? (
                <Check size={18} className="text-green-600 dark:text-green-400" />
              ) : (
                <Copy size={18} />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Collapsible section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isExpanded ? 'Hide Prompt' : 'Show Prompt'}
                </span>
                {isExpanded ? (
                  <ChevronUp size={18} className="text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown size={18} className="text-gray-500 dark:text-gray-400" />
                )}
              </button>
              
              {isExpanded && (
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                    {prompt}
                  </pre>
                </div>
              )}
            </div>

            {/* Info text */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This is the prompt that was sent to the LLM to generate this operation. You can copy it to reuse or modify it.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptDisplayModal;

