import React, { useState } from 'react';
import { LearningGoal, updateGoal, type UpdateGoalRequest } from '../../learning/goalApi';
import { MilestoneList } from '../../learning/components/MilestoneList';
import { Target, Clock, BookOpen, Award, Edit2, Save, X } from 'lucide-react';
import MilestonesEditor from './MilestonesEditor';

interface EditableGoalOverviewProps {
  goal: LearningGoal;
  onGoalUpdated?: (updatedGoal: LearningGoal) => void;
}

export const EditableGoalOverview: React.FC<EditableGoalOverviewProps> = ({ goal, onGoalUpdated }) => {
  const [editingSection, setEditingSection] = useState<'title' | 'description' | 'target' | 'type' | 'estimatedTime' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState({
    title: goal.title,
    description: goal.description,
    target: goal.target,
    type: goal.type,
    estimatedTime: goal.estimatedTime,
  });

  const handleStartEdit = (section: 'title' | 'description' | 'target' | 'type' | 'estimatedTime') => {
    setEditingSection(section);
    setEditedValues({
      title: goal.title,
      description: goal.description,
      target: goal.target,
      type: goal.type,
      estimatedTime: goal.estimatedTime,
    });
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditedValues({
      title: goal.title,
      description: goal.description,
      target: goal.target,
      type: goal.type,
      estimatedTime: goal.estimatedTime,
    });
  };

  const handleSave = async (section: 'title' | 'description' | 'target' | 'type' | 'estimatedTime') => {
    setIsSaving(true);
    try {
      const updates: UpdateGoalRequest = {};
      
      // Handle each section type explicitly to satisfy TypeScript
      switch (section) {
        case 'title':
          updates.title = editedValues.title;
          break;
        case 'description':
          updates.description = editedValues.description;
          break;
        case 'target':
          updates.target = editedValues.target;
          break;
        case 'type':
          updates.type = editedValues.type;
          break;
        case 'estimatedTime':
          updates.estimatedTime = editedValues.estimatedTime;
          break;
      }

      const response = await updateGoal(goal.id, updates);
      setEditingSection(null);
      onGoalUpdated?.(response.goal);
    } catch (error) {
      console.error('Failed to update goal:', error);
      alert(`Failed to update goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Title */}
        <div className="flex items-start justify-between gap-4">
          {editingSection === 'title' ? (
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={editedValues.title}
                onChange={(e) => setEditedValues({ ...editedValues, title: e.target.value })}
                className="w-full px-4 py-2 text-2xl font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSaving}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave('title')}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {goal.title}
                </h3>
                <button
                  type="button"
                  onClick={() => handleStartEdit('title')}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
                  title="Edit title"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="flex items-start justify-between gap-4">
          {editingSection === 'description' ? (
            <div className="flex-1 space-y-2">
              <textarea
                value={editedValues.description}
                onChange={(e) => setEditedValues({ ...editedValues, description: e.target.value })}
                className="w-full px-4 py-2 text-lg text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[120px]"
                disabled={isSaving}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave('description')}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  {goal.description}
                </p>
                <button
                  type="button"
                  onClick={() => handleStartEdit('description')}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors flex-shrink-0"
                  title="Edit description"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Target */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Target size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Target Outcome
                </p>
                {editingSection !== 'target' && (
                  <button
                    type="button"
                    onClick={() => handleStartEdit('target')}
                    className="p-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded transition-colors"
                    title="Edit target"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>
              {editingSection === 'target' ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editedValues.target}
                    onChange={(e) => setEditedValues({ ...editedValues, target: e.target.value })}
                    className="w-full px-2 py-1 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isSaving}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave('target')}
                      disabled={isSaving}
                      className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 disabled:opacity-50 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {goal.target}
                </p>
              )}
            </div>
          </div>

          {/* Estimated Time */}
          {goal.estimatedTime && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                <Clock size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Est. Time
                  </p>
                  {editingSection !== 'estimatedTime' && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit('estimatedTime')}
                      className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
                      title="Edit estimated time"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>
                {editingSection === 'estimatedTime' ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={editedValues.estimatedTime || ''}
                      onChange={(e) => setEditedValues({ ...editedValues, estimatedTime: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-2 py-1 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSaving}
                      min="0"
                      step="0.5"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSave('estimatedTime')}
                        disabled={isSaving}
                        className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 disabled:opacity-50 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {goal.estimatedTime} hours
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Type */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400">
              <BookOpen size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Type
                </p>
                {editingSection !== 'type' && (
                  <button
                    type="button"
                    onClick={() => handleStartEdit('type')}
                    className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded transition-colors"
                    title="Edit type"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>
              {editingSection === 'type' ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editedValues.type}
                    onChange={(e) => setEditedValues({ ...editedValues, type: e.target.value })}
                    className="w-full px-2 py-1 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={isSaving}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave('type')}
                      disabled={isSaving}
                      className="px-2 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 disabled:opacity-50 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {goal.type}
                </p>
              )}
            </div>
          </div>

          {/* Assessed Level */}
          {goal.assessedLevel && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800/50">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-lg text-pink-600 dark:text-pink-400">
                <Award size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400 mb-0.5">
                  Level
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {goal.assessedLevel}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Milestones Editor */}
      <div>
        <MilestonesEditor
          goal={goal}
          onGoalUpdated={onGoalUpdated}
        />
      </div>

      {/* Additional Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Short Term Goals */}
        {goal.shortTermGoals && goal.shortTermGoals.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Immediate Steps
            </h4>
            <ul className="space-y-3">
              {goal.shortTermGoals.map((shortTermGoal, index) => (
                <li key={index} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  <span>{shortTermGoal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

