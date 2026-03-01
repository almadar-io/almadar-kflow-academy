import React, { useState } from 'react';
import { Concept } from '../types';
import { 
  Sparkles,
  Loader2
} from 'lucide-react';
import { OperationType, OperationResult } from '../hooks/useMentorOperations';
import { ConceptsDiffModal } from './index';
import { ConceptDiff } from '../mentorSlice';
import { useAppSelector } from '../../../app/hooks';
import { selectLastDiff } from '../../concepts/conceptSlice';

interface GraphOperationButtonsProps {
  concepts: Concept[];
  onOperation: (operation: OperationType, concept: Concept | Concept[], ...args: any[]) => Promise<OperationResult>;
  isLoading?: boolean;
  conceptMap?: Map<string, Concept>;
  onConceptsAdded?: (concepts: Concept[]) => void;
  seedConcept?: Concept | null;
  onSelectConcept?: (concept: Concept) => void;
  onOpenCustomPanel?: (concepts: Concept[], primaryConcept?: Concept) => void;
}

const GraphOperationButtons: React.FC<GraphOperationButtonsProps> = ({
  concepts,
  onOperation,
  isLoading = false,
  conceptMap,
  onConceptsAdded,
  seedConcept,
  onSelectConcept,
  onOpenCustomPanel,
}) => {
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [lastOperationName, setLastOperationName] = useState<string>('');
  const [showDiffModal, setShowDiffModal] = useState(false);
  const diff = useAppSelector(selectLastDiff);

  const handleOperation = async (
    operation: OperationType,
    ...args: any[]
  ) => {
    setOperationLoading(operation);
    try {
      // For graph operations, pass all concepts
      const result = await onOperation(operation, concepts, ...args);
      if (result && result.diff) {
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


  return (
    <>
      <button
        onClick={() => {
          // Select seed concept when opening custom panel at graph level
          if (seedConcept && onSelectConcept) {
            onSelectConcept(seedConcept);
          }
          if (onOpenCustomPanel) {
            const conceptsToPass = seedConcept ? [seedConcept] : concepts;
            onOpenCustomPanel(conceptsToPass, seedConcept || undefined);
          }
        }}
        disabled={isLoading || operationLoading !== null}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 p-4 bg-purple-600 dark:bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Custom operation"
        title="Custom operation - Generate lessons, flash cards, or modify concepts"
      >
        {operationLoading === 'custom' ? (
          <Loader2 size={24} className="animate-spin" />
        ) : (
          <Sparkles size={24} />
        )}
      </button>



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

export default GraphOperationButtons;

