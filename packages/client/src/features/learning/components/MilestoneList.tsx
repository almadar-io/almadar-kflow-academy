import React from 'react';
import { Milestone } from '../goalApi';
import { CheckCircle2, Circle, Calendar, Clock } from 'lucide-react';

interface MilestoneListProps {
    milestones: Milestone[];
}

export const MilestoneList: React.FC<MilestoneListProps> = ({ milestones }) => {
    if (!milestones || milestones.length === 0) return null;

    return (
        <div className="space-y-6 relative">
            {/* Vertical Line for Timeline Effect */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700 -z-10" />

            {milestones.map((milestone, index) => {
                const isCompleted = milestone.completed;
                const isNext = !isCompleted && (index === 0 || milestones[index - 1].completed);

                return (
                    <div key={milestone.id} className={`group relative flex gap-4 ${isCompleted ? 'opacity-75 hover:opacity-100 transition-opacity' : ''}`}>
                        {/* Icon/Status Indicator */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full border-4 flex items-center justify-center bg-white dark:bg-gray-800 transition-colors duration-300 ${isCompleted
                                ? 'border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400'
                                : isNext
                                    ? 'border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-50 dark:ring-blue-900/20'
                                    : 'border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-600'
                            }`}>
                            {isCompleted ? (
                                <CheckCircle2 size={20} className="fill-green-50 dark:fill-green-900/20" />
                            ) : (
                                <Circle size={16} className={isNext ? "fill-blue-50 dark:fill-blue-900/20" : ""} />
                            )}
                        </div>

                        {/* Content Card */}
                        <div className={`flex-1 min-w-0 rounded-xl border p-4 transition-all duration-200 ${isNext
                                ? 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800 shadow-sm'
                                : 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                            }`}>
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <h4 className={`font-semibold text-lg ${isCompleted
                                        ? 'text-gray-600 dark:text-gray-400'
                                        : 'text-gray-900 dark:text-white'
                                    }`}>
                                    {milestone.title}
                                </h4>
                                {milestone.targetDate && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                        <Calendar size={12} />
                                        {new Date(milestone.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                )}
                            </div>

                            {milestone.description && (
                                <p className={`text-sm mb-3 ${isCompleted ? 'text-gray-500 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'
                                    }`}>
                                    {milestone.description}
                                </p>
                            )}

                            {/* Status Badge (Optional, if we want explicit text) */}
                            <div className="flex items-center gap-3">
                                {isNext && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                        <Clock size={12} />
                                        Current Focus
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
