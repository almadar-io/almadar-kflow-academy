import React, { useState } from 'react';
import { Concept } from '../types';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface CustomOperationDialogProps {
  concept: Concept;
  concepts: Concept[];
  onClose: () => void;
  onExecute: (prompt: string) => Promise<void>;
}

const CustomOperationDialog: React.FC<CustomOperationDialogProps> = ({
  concept,
  concepts,
  onClose,
  onExecute,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsExecuting(true);
    try {
      await onExecute(prompt);
    } catch (error) {
      console.error('Error executing custom operation:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Custom Operation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-4">
            {concepts.length === 1 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Operating on: <span className="font-semibold">{concept.name}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Operating on: <span className="font-semibold">{concepts.length} concepts</span>
                {concept && ` (including ${concept.name})`}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Describe what you want to do. You can add, update, or delete concepts. You can also generate lessons or flash cards.
            </p>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'Add a new concept called X that is a child of this concept', 'Update the description to be more detailed', 'Remove this concept and its children'"
            className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
            disabled={isExecuting}
          />

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <strong>Examples:</strong>
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-400 mt-1 list-disc list-inside space-y-1">
              <li>"Add a new concept called 'Advanced Topics' as a child"</li>
              <li>"Update the description to include more examples"</li>
              <li>"Remove this concept from the graph"</li>
              <li>"Add three related concepts that expand on this topic"</li>
              <li>"Generate a lesson for this concept"</li>
              <li>"Generate flash cards for this concept"</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={isExecuting || !prompt.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 dark:bg-purple-500 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExecuting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Execute
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomOperationDialog;

