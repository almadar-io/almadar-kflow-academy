import React, { useState } from 'react';
import { Target, Edit2, Save, X, Info } from 'lucide-react';
import { updateGoal, type LearningGoal, type UpdateGoalRequest } from '../../learning/goalApi';

interface MainLearningGoalEditorProps {
  goal: LearningGoal | null;
  onGoalUpdated?: (updatedGoal: LearningGoal) => void;
}

const MainLearningGoalEditor: React.FC<MainLearningGoalEditorProps> = ({
  goal,
  onGoalUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Partial<LearningGoal>>({
    title: goal?.title || '',
    description: goal?.description || '',
    target: goal?.target || '',
    type: goal?.type || '',
    estimatedTime: goal?.estimatedTime,
  });

  const handleEdit = () => {
    setEditedGoal({
      title: goal?.title || '',
      description: goal?.description || '',
      target: goal?.target || '',
      type: goal?.type || '',
      estimatedTime: goal?.estimatedTime,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedGoal({
      title: goal?.title || '',
      description: goal?.description || '',
      target: goal?.target || '',
      type: goal?.type || '',
      estimatedTime: goal?.estimatedTime,
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!goal) return;

    setIsSaving(true);
    try {
      const updates: UpdateGoalRequest = {
        title: editedGoal.title,
        description: editedGoal.description,
        target: editedGoal.target,
        type: editedGoal.type,
        estimatedTime: editedGoal.estimatedTime,
      };

      const response = await updateGoal(goal.id, updates);
      setIsEditing(false);
      onGoalUpdated?.(response.goal);
    } catch (error) {
      console.error('Failed to update learning goal:', error);
      alert(`Failed to update learning goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!goal) {
    return null;
  }

  return (
    <div className="w-full p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Target size={20} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Main Learning Goal</h3>
              <Info size={16} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
            </div>
            {!isEditing ? (
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
                title="Edit learning goal"
              >
                <Edit2 size={14} />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                  title="Save learning goal"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                  title="Cancel editing"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editedGoal.title || ''}
                  onChange={(e) => setEditedGoal({ ...editedGoal, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter goal title..."
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editedGoal.description || ''}
                  onChange={(e) => setEditedGoal({ ...editedGoal, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y min-h-[100px]"
                  placeholder="Enter goal description..."
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target
                </label>
                <input
                  type="text"
                  value={editedGoal.target || ''}
                  onChange={(e) => setEditedGoal({ ...editedGoal, target: e.target.value })}
                  className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter target (e.g., 'Data Science Certification', 'B1 Spanish')..."
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    value={editedGoal.type || ''}
                    onChange={(e) => setEditedGoal({ ...editedGoal, type: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Goal type..."
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estimated Time (hours)
                  </label>
                  <input
                    type="number"
                    value={editedGoal.estimatedTime || ''}
                    onChange={(e) => setEditedGoal({ ...editedGoal, estimatedTime: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Hours..."
                    disabled={isSaving}
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title</h4>
                <p className="text-base text-gray-900 dark:text-gray-100">{goal.title}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{goal.description}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Target</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{goal.target}</p>
              </div>
              <div className="flex gap-6">
                {goal.type && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Type</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{goal.type}</p>
                  </div>
                )}
                {goal.estimatedTime && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Estimated Time</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{goal.estimatedTime} hours</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainLearningGoalEditor;

