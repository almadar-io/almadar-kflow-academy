import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import FlashCardsStudy from './FlashCardsStudy';
import AssessmentView from './AssessmentView';
import { useStudentLesson } from '../hooks/useStudentLesson';
import type { LessonPreview } from '../types';
import { LessonPanel } from '../../../components/organisms/LessonPanel';

interface StudentLessonProps {
  lessons: LessonPreview[];
  lessonId: string | null;
  onLessonChange?: (lessonId: string) => void;
  enrollmentId: string;
  courseId: string;
}

const StudentLesson: React.FC<StudentLessonProps> = ({
  lessons,
  lessonId,
  onLessonChange,
  enrollmentId,
  courseId,
}) => {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [showFlashCards, setShowFlashCards] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  // Use hook for lesson state and API interactions
  const {
    assessment,
    isCompleted,
    showAssessment,
    completeLesson,
    setShowAssessment,
  } = useStudentLesson({
    lessonId,
    enrollmentId,
    courseId,
  });

  // Find current lesson index when lessonId or lessons change
  useEffect(() => {
    if (lessonId && lessons.length > 0) {
      const index = lessons.findIndex(l => l.id === lessonId);
      if (index >= 0) {
        setCurrentLessonIndex(index);
        setShowFlashCards(true); // Reset flash cards view when lesson changes
      }
    }
  }, [lessonId, lessons]);

  const currentLesson = lessons[currentLessonIndex] || null;
  const hasNext = currentLessonIndex < lessons.length - 1;
  const hasPrevious = currentLessonIndex > 0;

  const handleNext = async () => {
    if (!currentLesson) return;

    // If lesson is not completed, complete it first
    if (!isCompleted) {
      setIsCompleting(true);
      try {
        await completeLesson(currentLesson.id);
        // After completion, if there's an assessment, it will be shown automatically
        // If no assessment and there's a next lesson, move to next lesson
        if (!assessment && hasNext) {
          moveToNextLesson();
        }
        // If it's the last lesson, just complete it (don't try to move to next)
      } catch (error: any) {
        alert(error.message || 'Failed to mark lesson as complete');
      } finally {
        setIsCompleting(false);
      }
    } else {
      // Already completed, just move to next if there is one
      if (hasNext) {
        moveToNextLesson();
      }
    }
  };

  const moveToNextLesson = () => {
    if (hasNext && lessons[currentLessonIndex + 1]) {
      const nextLesson = lessons[currentLessonIndex + 1];
      setCurrentLessonIndex(currentLessonIndex + 1);
      setShowFlashCards(true);
      if (onLessonChange) {
        onLessonChange(nextLesson.id);
      }
    }
  };

  const handlePrevious = () => {
    if (hasPrevious && lessons[currentLessonIndex - 1]) {
      const prevLesson = lessons[currentLessonIndex - 1];
      setCurrentLessonIndex(currentLessonIndex - 1);
      setShowFlashCards(true);
      if (onLessonChange) {
        onLessonChange(prevLesson.id);
      }
    }
  };

  if (!currentLesson) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No lesson selected
      </div>
    );
  }

  const flashCards = currentLesson.flashCards || [];

  // Show assessment if it exists and lesson is completed
  if (showAssessment && assessment && currentLesson) {
    return (
      <div className="space-y-6">
        <AssessmentView
          assessment={assessment}
          lessonId={currentLesson.id}
          enrollmentId={enrollmentId}
          onComplete={() => {
            setShowAssessment(false);
            // After assessment completion, move to next lesson
            moveToNextLesson();
          }}
          onClose={() => setShowAssessment(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Lesson Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium">
              {currentLesson.moduleTitle}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {currentLesson.title}
            </h1>
            {currentLesson.description && (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {currentLesson.description}
              </p>
            )}
          </div>

          {/* Flash Cards Section - Show first if available */}
          {flashCards.length > 0 && showFlashCards && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Study Cards
                </h2>
                <button
                  onClick={() => setShowFlashCards(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Skip Cards
                </button>
              </div>
              <FlashCardsStudy
                flashCards={flashCards}
                onComplete={() => setShowFlashCards(false)}
              />
            </div>
          )}

          {/* Lesson Content - Always visible */}
          {currentLesson.lessonContent && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Lesson Content
                </h2>
                <LessonPanel
                  renderedLesson={currentLesson.lessonContent}
                  conceptHasLesson={true}
                  isGenerating={false}
                  isEditing={false}
                />
              </div>
            </div>
          )}

          {/* Completion Status */}
          {isCompleted && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                <span className="text-green-700 dark:text-green-300 font-medium">
                  Lesson Completed
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer - Fixed to bottom */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-10 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Info - Above buttons on mobile, inline on desktop */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-3 sm:mb-0 sm:absolute sm:left-1/2 sm:transform sm:-translate-x-1/2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{currentLessonIndex + 1}</span> / {lessons.length}
            </div>
            {!isCompleted && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Click Next to complete
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <button
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>

            {/* Spacer for desktop to center progress info */}
            <div className="hidden sm:block flex-1" />

            <button
              onClick={handleNext}
              disabled={isCompleting}
              className="flex items-center gap-2 px-5 sm:px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow flex-shrink-0"
            >
              {isCompleting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="hidden sm:inline">Completing...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  {isCompleted ? (
                    hasNext ? (
                      <>
                        <span className="hidden sm:inline">Next Lesson</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight size={18} />
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span className="hidden sm:inline">Completed</span>
                        <span className="sm:hidden">Done</span>
                      </>
                    )
                  ) : (
                    hasNext ? (
                      <>
                        <span className="hidden sm:inline">Complete & Next</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight size={18} />
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span className="hidden sm:inline">Complete Lesson</span>
                        <span className="sm:hidden">Complete</span>
                      </>
                    )
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLesson;

