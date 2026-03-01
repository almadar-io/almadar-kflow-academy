import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import FlashCardsDisplay from '../../concepts/components/FlashCardsDisplay';
import { LessonPanel } from '../../../components/organisms/LessonPanel';
import type { LessonPreview } from '../types';
import type { CoursePreview as CoursePreviewType, PublishedModule } from '../hooks/useCoursePreview';

interface CoursePreviewProps {
  course: CoursePreviewType | null;
  modules: PublishedModule[];
  lessons: LessonPreview[];
  isLoading: boolean;
  error: string | null;
  onEnroll?: () => void;
}

const CoursePreview: React.FC<CoursePreviewProps> = ({ 
  course,
  modules,
  lessons,
  isLoading,
  error,
  onEnroll,
}) => {
  const [selectedLesson, setSelectedLesson] = useState<LessonPreview | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Select first lesson when lessons are loaded
  useEffect(() => {
    if (lessons.length > 0 && !selectedLesson) {
      setSelectedLesson(lessons[0]);
    }
  }, [lessons, selectedLesson]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {error || 'Course not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">{course.title || course.seedConceptName}</h2>
        {course.description && (
          <p className="text-indigo-100">{course.description}</p>
        )}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span>{modules.length} Modules</span>
          <span>{lessons.length} Lessons</span>
        </div>
      </div>

      {/* Lesson Preview */}
      {selectedLesson && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {selectedLesson.moduleTitle}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {selectedLesson.title}
              </h3>
              {selectedLesson.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedLesson.description}
                </p>
              )}
            </div>
          </div>

          {/* Flash Cards First */}
          {selectedLesson.flashCards && selectedLesson.flashCards.length > 0 && (
            <div className="mb-6">
              <FlashCardsDisplay
                flashCards={selectedLesson.flashCards}
                isEditing={false}
              />
            </div>
          )}

          {/* Show Details Button */}
          {selectedLesson.lessonContent && (
            <div className="mb-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <BookOpen size={16} />
                {showDetails ? 'Hide Details' : 'Show Details'}
                <ChevronRight
                  size={16}
                  className={`transition-transform ${showDetails ? 'rotate-90' : ''}`}
                />
              </button>
            </div>
          )}

          {/* Lesson Content */}
          {showDetails && selectedLesson.lessonContent && (
            <div className="mt-4">
              <LessonPanel
                renderedLesson={selectedLesson.lessonContent}
                conceptHasLesson={true}
                isGenerating={false}
                isEditing={false}
              />
              
              {/* Flash Cards at Bottom */}
              {selectedLesson.flashCards && selectedLesson.flashCards.length > 0 && (
                <div className="mt-6">
                  <FlashCardsDisplay
                    flashCards={selectedLesson.flashCards}
                    isEditing={false}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lesson Navigation */}
      {lessons.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Preview Other Lessons
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => {
                  setSelectedLesson(lesson);
                  setShowDetails(false);
                }}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  selectedLesson?.id === lesson.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {lesson.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {lesson.moduleTitle}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Enroll Button */}
      {onEnroll && (
        <div className="flex justify-center">
          <button
            onClick={onEnroll}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Enroll in Course
          </button>
        </div>
      )}
    </div>
  );
};

export default CoursePreview;

