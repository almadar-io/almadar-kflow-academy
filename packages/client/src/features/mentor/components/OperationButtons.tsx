import React, { useState } from 'react';
import { Concept } from '../types';
import { 
  Expand, 
  Compass, 
  ArrowUp, 
  BookOpen, 
  Sparkles,
  Loader2,
  GitBranch,
  ArrowRight
} from 'lucide-react';
import { OperationType, OperationResult } from '../hooks/useMentorOperations';
import { ConceptsDiffModal } from './index';
import { ConceptDiff } from '../mentorSlice';

interface OperationButtonsProps {
  concept: Concept;
  onOperation: (operation: OperationType, concept: Concept | Concept[], ...args: any[]) => Promise<OperationResult>;
  isLoading?: boolean;
  conceptMap?: Map<string, Concept>;
  onConceptsAdded?: (concepts: Concept[]) => void;
  onOpenCustomPanel?: (concepts: Concept[], primaryConcept?: Concept) => void;
}

const OperationButtons: React.FC<OperationButtonsProps> = ({
  concept,
  onOperation,
  isLoading = false,
  conceptMap,
  onConceptsAdded,
  onOpenCustomPanel,
}) => {
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [diff, setDiff] = useState<ConceptDiff | null>(null);
  const [lastOperationName, setLastOperationName] = useState<string>('');
  const [showDiffModal, setShowDiffModal] = useState(false);

  const handleOperation = async (
    operation: OperationType,
    ...args: any[]
  ) => {
    setOperationLoading(operation);
    try {
      const result = await onOperation(operation, concept, ...args);
      if (result && result.diff) {
        setDiff(result.diff);
        setLastOperationName(operation);
        setShowDiffModal(true);
      }
    } catch (error) {
      console.error(`Error executing ${operation}:`, error);
      alert(`Failed to execute ${operation}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const buttonClass = "px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5";
  const primaryButtonClass = `${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600`;
  const secondaryButtonClass = `${buttonClass} bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600`;

  return (
    <>
      <div 
        className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            handleOperation('expand');
          }}
          disabled={isLoading || operationLoading !== null}
          className={primaryButtonClass}
          title="Generate sub-concepts"
        >
          {operationLoading === 'expand' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Expand size={14} />
          )}
          Expand
        </button> */}

        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            handleOperation('deriveParents');
          }}
          disabled={isLoading || operationLoading !== null}
          className={secondaryButtonClass}
          title="Generate prerequisite concepts"
        >
          {operationLoading === 'deriveParents' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ArrowUp size={14} />
          )}
          Prerequisites
        </button> */}

        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            handleOperation('explain');
          }}
          disabled={isLoading || operationLoading !== null}
          className={secondaryButtonClass}
          title="Generate lesson content"
        >
          {operationLoading === 'explain' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <BookOpen size={14} />
          )}
          Explain
        </button> */}

        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            handleOperation('explore');
          }}
          disabled={isLoading || operationLoading !== null}
          className={secondaryButtonClass}
          title="Generate related concepts at the same level"
        >
          {operationLoading === 'explore' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Compass size={14} />
          )}
          Explore
        </button> */}

        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            handleOperation('progressiveExpandSingle');
          }}
          disabled={isLoading || operationLoading !== null}
          className={secondaryButtonClass}
          title="Generate one sub-layer under this concept"
        >
          {operationLoading === 'progressiveExpandSingle' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <GitBranch size={14} />
          )}
          Expand Sub-Layer
        </button> */}

        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            handleOperation('generateNextConcept');
          }}
          disabled={isLoading || operationLoading !== null}
          className={secondaryButtonClass}
          title="Generate multiple sequential learning steps from this concept"
        >
          {operationLoading === 'generateNextConcept' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ArrowRight size={14} />
          )}
          Next Steps
        </button> */}

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenCustomPanel) {
              const conceptsToPass = conceptMap ? Array.from(conceptMap.values()) : [concept];
              onOpenCustomPanel(conceptsToPass, concept);
            }
          }}
          disabled={isLoading || operationLoading !== null}
          className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 bg-purple-200 text-purple-700 hover:bg-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
          title="Custom operation with natural language prompt"
        >
          {operationLoading === 'custom' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          Custom
        </button>
      </div>

      {showDiffModal && (
        <ConceptsDiffModal
          diff={diff}
          operationName={lastOperationName}
          onClose={() => setShowDiffModal(false)}
          onConceptsAdded={onConceptsAdded}
        />
      )}
    </>
  );
};

export default OperationButtons;

