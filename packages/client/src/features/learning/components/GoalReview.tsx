/**
 * Goal Review Component
 * Displays the created learning goal and allows editing before confirmation
 */

import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import type { LearningGoal, Milestone } from '../goalApi';
import { updateGoal } from '../goalApi';
import { GoalOverview } from './GoalOverview';

interface GoalReviewProps {
  goal: LearningGoal;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const GoalReview: React.FC<GoalReviewProps> = ({ goal, onConfirm, onCancel }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Partial<LearningGoal>>({
    title: goal.title,
    description: goal.description,
    target: goal.target,
    estimatedTime: goal.estimatedTime,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateGoal(goal.id, {
        title: editedGoal.title,
        description: editedGoal.description,
        target: editedGoal.target,
        estimatedTime: editedGoal.estimatedTime,
      });
      setIsEditing(false);
      // Update the goal object with edited values
      Object.assign(goal, editedGoal);
    } catch (error) {
      console.error('Failed to update goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedGoal({
      title: goal.title,
      description: goal.description,
      target: goal.target,
      estimatedTime: goal.estimatedTime,
    });
    setIsEditing(false);
  };

  const displayGoal = isEditing ? editedGoal : goal;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
          Review Your Learning Goal
        </h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <Edit2 size={16} />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Check size={16} />
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {isEditing ? (
          <>
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={displayGoal.title || ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, title: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={displayGoal.description || ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, description: e.target.value })}
                rows={4}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>

            {/* Target */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Target
              </label>
              <input
                type="text"
                value={displayGoal.target || ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, target: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Goal Type
              </label>
              <p className="text-gray-700 dark:text-gray-300 capitalize">{goal.type}</p>
            </div>

            {/* Estimated Time */}
            {displayGoal.estimatedTime && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Time
                </label>
                <input
                  type="number"
                  value={displayGoal.estimatedTime || ''}
                  onChange={(e) => setEditedGoal({ ...editedGoal, estimatedTime: parseInt(e.target.value) || undefined })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Hours"
                />
              </div>
            )}

            {/* Milestones */}
            {goal.milestones && goal.milestones.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Milestones
                </label>
                <ul className="space-y-2">
                  {goal.milestones.map((milestone: Milestone) => (
                    <li key={milestone.id} className="text-gray-700 dark:text-gray-300">
                      • {milestone.title}
                      {milestone.description && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          - {milestone.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <GoalOverview goal={goal} />
        )}
      </div>

      {/* Action Buttons - Fixed to bottom */}
      <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 -mx-6 sm:-mx-6 md:-mx-6 px-6 -mb-6">
        <div className="flex justify-end gap-4">
          <button
            onClick={onConfirm}
            disabled={isEditing}
            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

