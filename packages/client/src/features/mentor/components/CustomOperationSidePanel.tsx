import React, { useState, useRef, useEffect } from 'react';
import { Concept } from '../types';
import { ConceptDiff } from '../mentorSlice';
import { X, Sparkles, Loader2, Send, CheckCircle2, Plus, Minus, Edit, Trash2 } from 'lucide-react';

interface CustomOperationSidePanelProps {
  concept: Concept;
  concepts: Concept[];
  isOpen: boolean;
  onClose: () => void;
  onExecute: (prompt: string, onStream?: (chunk: string) => void) => Promise<void>;
  diff: ConceptDiff | null;
  isLoading: boolean;
}

const formatOperationName = (operationName: string): string => {
  return 'Custom Operation';
};

const ConceptCard: React.FC<{ concept: Concept }> = ({ concept }) => {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
            {concept.name}
          </h4>
          {concept.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {concept.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
            {concept.layer !== undefined && (
              <span>Layer: {concept.layer}</span>
            )}
            {concept.parents && concept.parents.length > 0 && (
              <span>Parents: {concept.parents.length}</span>
            )}
            {concept.children && concept.children.length > 0 && (
              <span>Children: {concept.children.length}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomOperationSidePanel: React.FC<CustomOperationSidePanelProps> = ({
  concept,
  concepts,
  isOpen,
  onClose,
  onExecute,
  diff,
  isLoading,
}) => {
  const [prompt, setPrompt] = useState('');
  const [streamingOutput, setStreamingOutput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingOutputRef = useRef<HTMLDivElement>(null);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Clear prompt and streaming output when panel closes
  useEffect(() => {
    if (!isOpen) {
      setPrompt('');
      setStreamingOutput('');
    }
  }, [isOpen]);

  // Auto-scroll streaming output to bottom
  useEffect(() => {
    if (streamingOutputRef.current) {
      streamingOutputRef.current.scrollTop = streamingOutputRef.current.scrollHeight;
    }
  }, [streamingOutput]);

  const handleExecute = async () => {
    if (!prompt.trim()) {
      return;
    }

    try {
      setStreamingOutput(''); // Clear previous output
      await onExecute(prompt, (chunk: string) => {
        // Update streaming output in real-time
        setStreamingOutput(prev => prev + chunk);
      });
      // Don't clear prompt - let user see what they executed
    } catch (error) {
      console.error('Error executing custom operation:', error);
    }
  };

  const handleClearOutput = () => {
    setStreamingOutput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleExecute();
    }
  };

  const totalChanges = diff ? diff.added.length + diff.updated.length + diff.deleted.length : 0;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col"
    >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Custom Operation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Streaming Output Section */}
        {streamingOutput && (
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className={`text-purple-600 dark:text-purple-400 ${isLoading ? 'animate-spin' : ''}`} />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  LLM Response {isLoading && '(Streaming...)'}
                </h4>
              </div>
              <button
                onClick={handleClearOutput}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Clear output"
                title="Clear output"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div
              ref={streamingOutputRef}
              className="p-4 max-h-64 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono"
            >
              {streamingOutput}
            </div>
          </div>
        )}

        {/* Diff Section */}
        <div className="flex-1 overflow-y-auto border-b border-gray-200 dark:border-gray-700">
          {diff && totalChanges > 0 ? (
            <div className="p-4">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Graph Changes
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">{totalChanges}</span> change{totalChanges !== 1 ? 's' : ''} from operation: <span className="font-semibold">{formatOperationName('custom')}</span>
                </p>
              </div>

              {/* Added and Deleted at the top */}
              {(diff.added.length > 0 || diff.deleted.length > 0) && (
                <div className="space-y-4 mb-6">
                  {/* Added Section */}
                  {diff.added.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Plus size={16} className="text-green-600 dark:text-green-400" />
                        <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          Added ({diff.added.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {diff.added.map((concept, index) => (
                          <div key={concept.id || concept.name || index} className="border-l-4 border-green-500 dark:border-green-600">
                            <ConceptCard concept={concept} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deleted Section */}
                  {diff.deleted.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Minus size={16} className="text-red-600 dark:text-red-400" />
                        <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          Deleted ({diff.deleted.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {diff.deleted.map((concept, index) => (
                          <div key={concept.id || concept.name || index} className="border-l-4 border-red-500 dark:border-red-600 opacity-75">
                            <ConceptCard concept={concept} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Updated at the bottom */}
              {diff.updated.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Edit size={16} className="text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      Updated ({diff.updated.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {diff.updated.map((concept, index) => (
                      <div key={concept.id || concept.name || index} className="border-l-4 border-blue-500 dark:border-blue-600">
                        <ConceptCard concept={concept} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              <div className="text-center py-8">
                <Sparkles size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No changes yet. Enter a prompt below to modify the concept graph.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input Section - Bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="mb-3">
            {concepts.length === 1 ? (
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Operating on: <span className="font-semibold">{concept.name}</span>
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Operating on: <span className="font-semibold">{concepts.length} concepts</span>
                {concept && ` (including ${concept.name})`}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Describe what you want to do. You can add, update, delete concepts, or generate lessons/flash cards.
            </p>
          </div>

          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., 'Generate a lesson for this concept', 'Add a new concept called X', 'Update the description'"
              className="flex-1 min-h-[80px] max-h-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
              disabled={isLoading}
            />
            <button
              onClick={handleExecute}
              disabled={isLoading || !prompt.trim()}
              className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0 self-end"
              title="Execute (Ctrl/Cmd + Enter)"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>

          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-xs text-blue-800 dark:text-blue-300 mb-1">
              <strong>Examples:</strong>
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-0.5">
              <li>• "Generate a lesson for this concept"</li>
              <li>• "Generate flash cards for this concept"</li>
              <li>• "Add a new concept called 'Advanced Topics' as a child"</li>
              <li>• "Update the description to include more examples"</li>
            </ul>
          </div>
        </div>
    </div>
  );
};

export default CustomOperationSidePanel;

