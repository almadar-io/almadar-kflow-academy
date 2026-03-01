import React from 'react';
import { Plus } from 'lucide-react';
import { EmptyStateProps } from '../types/mindMapTypes';

const EmptyState: React.FC<EmptyStateProps> = ({ onCreateNote }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12">
      <div className="text-center space-y-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">No notes yet</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">Create your first note to start building your knowledge tree</p>
        <button 
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200 font-medium" 
          onClick={onCreateNote}
        >
          <Plus size={16} />
          Create your first note
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
