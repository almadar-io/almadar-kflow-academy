/**
 * ConceptNavigation Component
 * 
 * Previous/Next concept navigation component for concept detail pages.
 * Displays navigation buttons with concept names and arrow indicators.
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface ConceptNavigationProps {
  previousConcept?: {
    id: string;
    name: string;
  };
  nextConcept?: {
    id: string;
    name: string;
  };
  onPreviousClick?: (concept: { id: string; name: string }) => void;
  onNextClick?: (concept: { id: string; name: string }) => void;
  className?: string;
}

export const ConceptNavigation: React.FC<ConceptNavigationProps> = ({
  previousConcept,
  nextConcept,
  onPreviousClick,
  onNextClick,
  className = '',
}) => {
  if (!previousConcept && !nextConcept) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-8 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      {previousConcept ? (
        <button
          type="button"
          className="group inline-flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200"
          onClick={() => onPreviousClick?.(previousConcept)}
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
            <ArrowRight size={16} className="rotate-180" />
          </div>
          <div className="text-left">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">Previous</div>
            <div className="font-semibold">{previousConcept.name}</div>
          </div>
        </button>
      ) : (
        <span className="hidden sm:block" />
      )}

      {nextConcept && (
        <button
          type="button"
          className="group inline-flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 text-right"
          onClick={() => onNextClick?.(nextConcept)}
        >
          <div className="text-right">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">Next</div>
            <div className="font-semibold">{nextConcept.name}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
            <ArrowRight size={16} />
          </div>
        </button>
      )}
    </div>
  );
};

ConceptNavigation.displayName = 'ConceptNavigation';
