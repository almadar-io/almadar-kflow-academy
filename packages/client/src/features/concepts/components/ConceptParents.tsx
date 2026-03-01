import React from 'react';
import { Concept } from '../types';

interface ConceptParentsProps {
  concept: Concept;
  onNavigateToParent: (parentName: string) => void;
  className?: string;
}

const ConceptParents: React.FC<ConceptParentsProps> = ({
  concept,
  onNavigateToParent,
  className = '',
}) => {
  const handleParentClick = (parentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigateToParent(parentName);
  };

  if (concept.parents.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {concept.parents.map(parentName => (
        <button
          key={parentName}
          onClick={(e) => handleParentClick(parentName, e)}
          className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors duration-200"
          title={`Navigate to ${parentName}`}
        >
          ← {parentName}
        </button>
      ))}
    </div>
  );
};

export default ConceptParents;

