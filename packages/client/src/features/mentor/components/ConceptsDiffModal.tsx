import React from 'react';
import { Concept } from '../types';
import { ConceptDiff } from '../mentorSlice';
import { X, CheckCircle2, Plus, Minus, Edit } from 'lucide-react';

interface ConceptsDiffModalProps {
  diff: ConceptDiff | null;
  operationName: string;
  onClose: () => void;
  onConceptsAdded?: (concepts: Concept[]) => void;
}

const formatOperationName = (operationName: string): string => {
  const nameMap: Record<string, string> = {
    'expand': 'Expand',
    'synthesize': 'Synthesize',
    'explore': 'Explore',
    'tracePath': 'Trace Path',
    'progressiveExpandSingle': 'Progressive Expand Single',
    'progressiveExplore': 'Progressive Explore',
    'progressiveExpandMultipleFromText': 'Expand Layer (Text)',
    'deriveParents': 'Derive Parents',
    'deriveSummary': 'Derive Summary',
    'explain': 'Explain',
    'generateNextConcept': 'Generate Next Concept',
    'custom': 'Custom Operation',
  };
  return nameMap[operationName] || operationName;
};

const ConceptCard: React.FC<{ concept: Concept }> = ({ concept }) => {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {concept.name}
          </h4>
          {concept.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
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

const ConceptsDiffModal: React.FC<ConceptsDiffModalProps> = ({
  diff,
  operationName,
  onClose,
  onConceptsAdded,
}) => {
  React.useEffect(() => {
    if (diff && diff.added.length > 0 && onConceptsAdded) {
      onConceptsAdded(diff.added);
    }
  }, [diff, onConceptsAdded]);

  if (!diff || (diff.added.length === 0 && diff.updated.length === 0 && diff.deleted.length === 0)) {
    return null;
  }

  const totalChanges = diff.added.length + diff.updated.length + diff.deleted.length;

  return (
    <div 
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
      onClick={(e) => {
        e.stopPropagation();
        // Close modal when clicking backdrop
        onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Graph Changes
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">{totalChanges}</span> change{totalChanges !== 1 ? 's' : ''} from operation: <span className="font-semibold">{formatOperationName(operationName)}</span>
            </p>
          </div>

          {/* Added and Deleted at the top */}
          {(diff.added.length > 0 || diff.deleted.length > 0) && (
            <div className="space-y-4 mb-6">
              {/* Added Section */}
              {diff.added.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Plus size={18} className="text-green-600 dark:text-green-400" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                    <Minus size={18} className="text-red-600 dark:text-red-400" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                <Edit size={18} className="text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConceptsDiffModal;

