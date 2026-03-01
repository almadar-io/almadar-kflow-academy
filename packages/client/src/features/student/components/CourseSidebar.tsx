import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Lock, PlayCircle } from 'lucide-react';
import type { PublishedModule } from '../hooks/useCoursePreview';
import { LessonPreview, ProgressData } from '../types';

interface CourseSidebarProps {
    courseTitle: string;
    modules: PublishedModule[];
    lessons: LessonPreview[];
    progress: ProgressData | null;
    selectedLessonId: string | null;
    onLessonClick: (lessonId: string) => void;
}

const CourseSidebar: React.FC<CourseSidebarProps> = ({
    courseTitle,
    modules,
    lessons,
    progress,
    selectedLessonId,
    onLessonClick,
}) => {
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
        modules.reduce((acc, m) => ({ ...acc, [m.id]: true }), {})
    );

    // Expand module containing selected lesson
    useEffect(() => {
        if (selectedLessonId && lessons.length > 0) {
            const selectedLesson = lessons.find(l => l.id === selectedLessonId);
            if (selectedLesson?.moduleId) {
                setExpandedModules(prev => ({
                    ...prev,
                    [selectedLesson.moduleId]: true,
                }));
            }
        }
    }, [selectedLessonId, lessons]);

    // Group lessons by moduleId
    const lessonsByModule = useMemo(() => {
        const grouped: Record<string, LessonPreview[]> = {};
        lessons.forEach(lesson => {
            if (lesson.moduleId) {
                if (!grouped[lesson.moduleId]) {
                    grouped[lesson.moduleId] = [];
                }
                grouped[lesson.moduleId].push(lesson);
            }
        });
        return grouped;
    }, [lessons]);

    const toggleModule = (moduleId: string) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleId]: !prev[moduleId]
        }));
    };

    const isLessonCompleted = (lessonId: string) => {
        return progress?.enrollment?.completedLessonIds?.includes(lessonId);
    };

    const isLessonLocked = (lessonId: string) => {
        return progress?.enrollment?.lockedLessonIds?.includes(lessonId);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Progress bar - show at top if progress is available */}
            {progress && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                                style={{ width: `${progress.progressPercentage}%` }}
                            />
                        </div>
                        <span>{Math.round(progress.progressPercentage)}%</span>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {modules.map((module) => {
                    const moduleLessons = lessonsByModule[module.id] || [];
                    const isExpanded = expandedModules[module.id];

                    return (
                        <div key={module.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                            <button
                                onClick={() => toggleModule(module.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                                        {module.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {moduleLessons.length} lessons
                                    </p>
                                </div>
                                {isExpanded ? (
                                    <ChevronDown size={16} className="text-gray-400" />
                                ) : (
                                    <ChevronRight size={16} className="text-gray-400" />
                                )}
                            </button>

                            {isExpanded && (
                                <div className="bg-gray-50/50 dark:bg-gray-900/20 pb-2">
                                    {moduleLessons.map((lesson) => {
                                        const isSelected = selectedLessonId === lesson.id;
                                        const isCompleted = isLessonCompleted(lesson.id);
                                        const isLocked = isLessonLocked(lesson.id);

                                        return (
                                            <button
                                                key={lesson.id}
                                                onClick={() => !isLocked && onLessonClick(lesson.id)}
                                                disabled={isLocked}
                                                className={`
                          w-full flex items-start gap-3 px-4 py-2.5 text-sm transition-colors relative
                          ${isSelected
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                                    }
                          ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                                            >
                                                {isSelected && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 dark:bg-indigo-400" />
                                                )}

                                                <div className="mt-0.5 flex-shrink-0">
                                                    {isLocked ? (
                                                        <Lock size={16} className="text-gray-400" />
                                                    ) : isCompleted ? (
                                                        <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                                                    ) : isSelected ? (
                                                        <PlayCircle size={16} className="text-indigo-600 dark:text-indigo-400" />
                                                    ) : (
                                                        <Circle size={16} className="text-gray-300 dark:text-gray-600" />
                                                    )}
                                                </div>

                                                <span className={`flex-1 text-left ${isCompleted ? 'opacity-75' : ''}`}>
                                                    {lesson.title}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CourseSidebar;
