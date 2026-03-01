import React, { useState } from 'react';
import { Milestone as MilestoneIcon, CheckCircle2, Circle, Edit2, Save, X, Plus, Trash2, Calendar } from 'lucide-react';
import { updateGoal, type LearningGoal, type UpdateGoalRequest, type Milestone as MilestoneType } from '../../learning/goalApi';

interface MilestonesEditorProps {
  goal: LearningGoal | null;
  onGoalUpdated?: (updatedGoal: LearningGoal) => void;
}

const MilestonesEditor: React.FC<MilestonesEditorProps> = ({
  goal,
  onGoalUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneType[]>(goal?.milestones || []);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState<Partial<MilestoneType>>({
    title: '',
    description: '',
    targetDate: undefined,
    completed: false,
  });

  const handleEdit = () => {
    setMilestones(goal?.milestones || []);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setMilestones(goal?.milestones || []);
    setIsEditing(false);
    setEditingMilestoneId(null);
    setNewMilestone({ title: '', description: '', targetDate: undefined, completed: false });
  };

  const handleSave = async () => {
    if (!goal) return;

    setIsSaving(true);
    try {
      const updates: UpdateGoalRequest = {
        milestones: milestones,
      };

      const response = await updateGoal(goal.id, updates);
      setIsEditing(false);
      setEditingMilestoneId(null);
      onGoalUpdated?.(response.goal);
    } catch (error) {
      console.error('Failed to update milestones:', error);
      alert(`Failed to update milestones: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMilestone = () => {
    if (!newMilestone.title?.trim()) return;

    const milestone: MilestoneType = {
      id: `milestone-${Date.now()}`,
      title: newMilestone.title.trim(),
      description: newMilestone.description?.trim() || '',
      targetDate: newMilestone.targetDate,
      completed: false,
    };

    setMilestones([...milestones, milestone]);
    setNewMilestone({ title: '', description: '', targetDate: undefined, completed: false });
  };

  const handleUpdateMilestone = (id: string, updates: Partial<MilestoneType>) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, ...updates } : m));
    setEditingMilestoneId(null);
  };

  const handleDeleteMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleToggleComplete = (id: string) => {
    if (!isEditing) return;
    setMilestones(milestones.map(m => 
      m.id === id 
        ? { ...m, completed: !m.completed, completedAt: !m.completed ? Date.now() : undefined }
        : m
    ));
  };

  if (!goal) {
    return null;
  }

  const displayMilestones = goal.milestones || [];

  return (
    <div className="w-full p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-xl shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm">
            <MilestoneIcon size={20} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Milestones</h3>
            </div>
            {!isEditing ? (
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
                title="Edit milestones"
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
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                  title="Save milestones"
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
              {/* Existing milestones */}
              {milestones.map((milestone) => (
                <div key={milestone.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(milestone.id)}
                      className="flex-shrink-0 mt-1"
                      title={milestone.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {milestone.completed ? (
                        <CheckCircle2 size={20} className="text-green-500" />
                      ) : (
                        <Circle size={20} className="text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1 space-y-2">
                      {editingMilestoneId === milestone.id ? (
                        <>
                          <input
                            type="text"
                            value={milestone.title}
                            onChange={(e) => handleUpdateMilestone(milestone.id, { title: e.target.value })}
                            className="w-full px-2 py-1 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Milestone title..."
                          />
                          <textarea
                            value={milestone.description || ''}
                            onChange={(e) => handleUpdateMilestone(milestone.id, { description: e.target.value })}
                            className="w-full px-2 py-1 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y min-h-[60px]"
                            placeholder="Description (optional)..."
                          />
                          <input
                            type="date"
                            value={milestone.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleUpdateMilestone(milestone.id, { targetDate: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                            className="w-full px-2 py-1 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingMilestoneId(null)}
                            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                          >
                            Done
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className={`text-sm font-semibold ${milestone.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                {milestone.title}
                              </h4>
                              {milestone.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{milestone.description}</p>
                              )}
                              {milestone.targetDate && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-500">
                                  <Calendar size={12} />
                                  <span>{new Date(milestone.targetDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingMilestoneId(milestone.id)}
                                className="p-1 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                                title="Edit milestone"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMilestone(milestone.id)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                title="Delete milestone"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add new milestone */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newMilestone.title || ''}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    className="w-full px-2 py-1 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="New milestone title..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMilestone();
                      }
                    }}
                  />
                  <textarea
                    value={newMilestone.description || ''}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    className="w-full px-2 py-1 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y min-h-[60px]"
                    placeholder="Description (optional)..."
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newMilestone.targetDate ? new Date(newMilestone.targetDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setNewMilestone({ ...newMilestone, targetDate: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                      className="flex-1 px-2 py-1 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddMilestone}
                      disabled={!newMilestone.title?.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {displayMilestones.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No milestones defined yet.</p>
              ) : (
                displayMilestones.map((milestone) => (
                  <div key={milestone.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      {milestone.completed ? (
                        <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${milestone.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {milestone.title}
                        </h4>
                        {milestone.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{milestone.description}</p>
                        )}
                        {milestone.targetDate && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-500">
                            <Calendar size={12} />
                            <span>{new Date(milestone.targetDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MilestonesEditor;

