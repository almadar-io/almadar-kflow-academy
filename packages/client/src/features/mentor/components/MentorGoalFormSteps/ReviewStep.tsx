/**
 * ReviewStep Component
 * 
 * Fifth step of MentorGoalForm - review the created goal before completion
 */

import React, { useMemo } from 'react';
import { useAppSelector } from '../../../../app/hooks';
import { selectGraphById, selectNodeById } from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

interface ReviewStepProps {
  goalId: string;
  graphId: string;
  onComplete: () => void;
  onBack: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ goalId, graphId, onComplete, onBack }) => {
  const graph = useAppSelector((state) => selectGraphById(state, graphId));
  const goalNode = useAppSelector((state) => selectNodeById(state, graphId, goalId));

  const goalData = useMemo(() => {
    if (!goalNode || goalNode.type !== 'LearningGoal') {
      return null;
    }

    const props = goalNode.properties;
    return {
      title: props.name || '',  // Use name property instead of title
      description: props.description || '',
      type: props.type || '',
      target: props.target || '',
      estimatedTime: props.estimatedTime || null,
      milestones: props.milestones || [],
    };
  }, [goalNode]);

  // Get milestones from relationships
  const milestones = useMemo(() => {
    if (!graph || !goalId) return [];

    return graph.relationships
      .filter((rel: { source: string; type: string }) => rel.source === goalId && rel.type === 'hasMilestone')
      .map((rel: { target: string }) => {
        const milestoneNode = graph.nodes[rel.target];
        if (milestoneNode && milestoneNode.type === 'Milestone') {
          return {
            id: milestoneNode.id,
            title: milestoneNode.properties.name || '',  // Use name property instead of title
            description: milestoneNode.properties.description || '',
            completed: milestoneNode.properties.completed || false,
          };
        }
        return null;
      })
      .filter((m: any): m is NonNullable<typeof m> => m !== null);
  }, [graph, goalId]);

  if (!graph) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading goal...</span>
        </div>
      </div>
    );
  }

  if (!goalData) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Goal not found. Please try again.
          </p>
        </div>
        <div className="mt-4">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 size={32} className="text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Your Learning Goal is Ready!
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Review your learning goal and milestones below.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {goalData.title}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{goalData.description}</p>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          {goalData.type && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Type:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">
                {goalData.type}
              </span>
            </div>
          )}
          {goalData.target && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Target:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">
                {goalData.target}
              </span>
            </div>
          )}
          {goalData.estimatedTime && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Estimated Time:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">
                {goalData.estimatedTime} hours
              </span>
            </div>
          )}
        </div>

        {milestones.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Milestones
            </h4>
            <ul className="space-y-2">
              {milestones.map((milestone: { id: string; title: string; description?: string; completed: boolean }) => (
                <li
                  key={milestone.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                      {milestone.title}
                    </h5>
                    {milestone.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <button
          onClick={onComplete}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
        >
          Complete
          <CheckCircle2 size={18} />
        </button>
      </div>
    </div>
  );
};

