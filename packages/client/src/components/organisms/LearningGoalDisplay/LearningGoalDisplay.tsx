/**
 * LearningGoalDisplay Component
 * 
 * Displays learning goal for a layer with inline editing functionality.
 */

import React, { useState } from 'react';
import { Target, Info, Edit2, Save, X } from 'lucide-react';

export interface LearningGoalDisplayProps {
  goal?: string;
  layerNumber: number;
  graphId?: string;
  onGoalUpdated?: (newGoal: string) => void;
  onSave?: (goal: string) => Promise<void> | void;
  isSaving?: boolean;
}

export const LearningGoalDisplay: React.FC<LearningGoalDisplayProps> = ({
  goal,
  layerNumber,
  graphId,
  onGoalUpdated,
  onSave,
  isSaving = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState(goal || '');

  const handleEdit = () => {
    setEditedGoal(goal || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedGoal(goal || '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!graphId && !onSave) {
      console.warn('Cannot save goal: graphId or onSave callback is missing');
      return;
    }

    try {
      if (onSave) {
        await onSave(editedGoal);
      }
      setIsEditing(false);
      if (onGoalUpdated) {
        onGoalUpdated(editedGoal);
      }
    } catch (error) {
      alert(`Failed to update learning goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!goal && !isEditing) {
    return null; // Don't show anything if there's no goal and we're not editing
  }

  return (
    <div className="w-full mb-1 p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Target size={16} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Learning Goal</h4>
              <Info size={14} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
            </div>
            {!isEditing ? (
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
                title="Edit learning goal"
              >
                <Edit2 size={12} />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                  title="Save learning goal"
                >
                  <Save size={12} />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                  title="Cancel editing"
                >
                  <X size={12} />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={editedGoal}
              onChange={(e) => setEditedGoal(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y min-h-[80px]"
              placeholder="Enter learning goal for this layer..."
              disabled={isSaving}
            />
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{goal || 'No learning goal set'}</p>
          )}
        </div>
      </div>
    </div>
  );
};

LearningGoalDisplay.displayName = 'LearningGoalDisplay';
