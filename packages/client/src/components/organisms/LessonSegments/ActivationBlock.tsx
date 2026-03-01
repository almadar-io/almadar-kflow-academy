/**
 * ActivationBlock Component
 * 
 * Pre-lesson activation component that displays a thought-provoking question
 * to activate prior knowledge before the lesson begins.
 */

import React, { useState } from 'react';
import { Lightbulb } from 'lucide-react';

export interface ActivationBlockProps {
  question: string;
  savedResponse?: string;
  onSave: (response: string) => void;
}

export const ActivationBlock: React.FC<ActivationBlockProps> = ({
  question,
  savedResponse,
  onSave
}) => {
  const [response, setResponse] = useState(savedResponse || '');
  const [isExpanded, setIsExpanded] = useState(!savedResponse);

  const handleSubmit = () => {
    onSave(response);
    setIsExpanded(false);
  };

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg p-5 mb-6">
      <div className="flex items-start gap-3">
        <Lightbulb className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-1" size={24} />
        <div className="flex-1">
          <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
            🤔 Before You Begin...
          </h4>
          <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm md:text-base">
            {question}
          </p>

          {isExpanded ? (
            <>
              <textarea
                className="w-full p-3 border border-indigo-300 dark:border-indigo-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Jot down your thoughts..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
                >
                  Continue to Lesson →
                </button>
                <button
                  onClick={() => {
                    onSave('');
                    setIsExpanded(false);
                  }}
                  className="px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                >
                  Skip for now
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              ✓ Answered · Edit response
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ActivationBlock.displayName = 'ActivationBlock';
