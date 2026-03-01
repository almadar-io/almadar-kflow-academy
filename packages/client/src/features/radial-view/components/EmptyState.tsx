import React from 'react';
import { EmptyStateProps } from '../types/radialViewTypes';

const EmptyState: React.FC<EmptyStateProps> = ({ onCreateConcept }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No concepts to display</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Create concepts to visualize them in the radial view
        </p>
        {onCreateConcept && (
          <button
            onClick={onCreateConcept}
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
          >
            Create Concept
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;

