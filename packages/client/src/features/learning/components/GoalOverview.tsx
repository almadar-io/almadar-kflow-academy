import React from 'react';
import { LearningGoal } from '../goalApi';
import { MilestoneList } from './MilestoneList';
import { Target, Clock, BookOpen, Award } from 'lucide-react';

interface GoalOverviewProps {
    goal: LearningGoal | Partial<LearningGoal>;
}

export const GoalOverview: React.FC<GoalOverviewProps> = ({ goal }) => {
    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {goal.title || <span className="text-gray-400 italic">Generating title...</span>}
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                        {goal.description || <span className="text-gray-400 italic">Generating description...</span>}
                    </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Target size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-0.5">
                                Target Outcome
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {goal.target || <span className="text-gray-400 italic">Generating...</span>}
                            </p>
                        </div>
                    </div>

                    {goal.estimatedTime && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-0.5">
                                    Est. Time
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {goal.estimatedTime} hours
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-0.5">
                                Type
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                {goal.type || <span className="text-gray-400 italic">Generating...</span>}
                            </p>
                        </div>
                    </div>

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

            {/* Milestones Section */}
            {goal.milestones && goal.milestones.length > 0 && (
                <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                        Learning Milestones
                    </h4>
                    <MilestoneList milestones={goal.milestones} />
                </div>
            )}

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
