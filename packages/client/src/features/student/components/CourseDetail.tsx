import React from 'react';
import { ArrowLeft, Globe, Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../../auth/AuthContext';
import EnrollButton from './EnrollButton';
import { useCourseEnrollment } from '../hooks';
import { useCoursePreview, type CoursePreview, type PublishedModule } from '../hooks/useCoursePreview';
import type { LessonPreview } from '../types';

interface CourseDetailProps {
  courseId: string;
  course: CoursePreview | null;
  isLoading?: boolean;
  error?: string | null;
  showBackButton?: boolean;
  backPath?: string;
  backLabel?: string;
  onEnrolled?: () => void;
  privateLink?: string; // If provided, this course was accessed via private link
}

const CourseDetail: React.FC<CourseDetailProps> = ({
  courseId,
  course,
  isLoading: externalLoading,
  error: externalError,
  showBackButton = true,
  backPath,
  backLabel = 'Back to Courses',
  onEnrolled,
  privateLink,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthContext();
  
  // Check if we should auto-enroll after login
  const shouldAutoEnroll = searchParams.get('enroll') === 'true';
  
  // Enrollment hooks (only work if user is logged in)
  // Use the course ID from the course object if available (for private link access)
  const effectiveCourseId = course?.id || courseId || '';
  const {
    enrollment,
    enrollmentId,
    isEnrolled,
    isChecking,
    isEnrolling,
    checkEnrollment,
    enroll,
    unenroll,
  } = useCourseEnrollment({
    courseId: effectiveCourseId,
  });

  // Auto-enroll after login if enroll=true is in URL
  React.useEffect(() => {
    if (shouldAutoEnroll && user && !isChecking && !isEnrolled && effectiveCourseId) {
      const autoEnroll = async () => {
        try {
          await enroll();
          await checkEnrollment();
          // Remove enroll=true from URL
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('enroll');
          setSearchParams(newSearchParams, { replace: true });
          // Navigate to enrolled course page
          navigate(`/course/${effectiveCourseId}`);
        } catch (error: any) {
          console.error('Auto-enrollment failed:', error);
          // Remove enroll=true from URL even on error
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('enroll');
          setSearchParams(newSearchParams, { replace: true });
        }
      };
      autoEnroll();
    }
  }, [shouldAutoEnroll, user, isChecking, isEnrolled, effectiveCourseId, enroll, checkEnrollment, navigate, searchParams, setSearchParams]);

  // Load course preview data (modules and lessons) for display
  // Always load if we have a courseId, regardless of enrollment status or authentication
  const { course: previewCourse, modules, lessons, isLoading: isPreviewLoading, error: previewError } = useCoursePreview(effectiveCourseId, {
    enabled: !!effectiveCourseId,
  });

  const handleEnroll = async () => {
    try {
      await enroll();
      await checkEnrollment();
      if (onEnrolled) {
        onEnrolled();
      } else {
        // Navigate to enrolled course page
        navigate(`/course/${effectiveCourseId}`);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleUnenroll = async () => {
    try {
      await unenroll();
    } catch (error: any) {
      throw error;
    }
  };

  // If user is enrolled, redirect to student course page
  React.useEffect(() => {
    if (isEnrolled && !onEnrolled) {
      navigate(`/course/${courseId}`);
    }
  }, [isEnrolled, courseId, navigate, onEnrolled]);

  const isLoading = externalLoading !== undefined ? externalLoading : false;
  const error = externalError !== undefined ? externalError : null;
  const displayCourse = course || previewCourse;

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading course...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !displayCourse) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error || 'Course not found'}</p>
          {showBackButton && (
            <button
              onClick={() => navigate(backPath || '/courses')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {backLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <div className="space-y-6">
        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={() => {
              if (backPath) {
                navigate(backPath);
              } else {
                navigate(-1);
              }
            }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>{backLabel || 'Back'}</span>
          </button>
        )}

        {/* Course Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {displayCourse.isPublic ? (
                <Globe className="text-green-600 dark:text-green-400" size={20} />
              ) : (
                <Lock className="text-gray-400 dark:text-gray-500" size={20} />
              )}
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {displayCourse.isPublic ? 'Public Course' : 'Private Course'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {displayCourse.title || displayCourse.seedConceptName}
            </h1>
            {displayCourse.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {displayCourse.description}
              </p>
            )}
          </div>
          {effectiveCourseId && (
            <EnrollButton
              isEnrolled={isEnrolled}
              isChecking={isChecking}
              isEnrolling={isEnrolling}
              onEnroll={handleEnroll}
              onUnenroll={handleUnenroll}
              course={privateLink ? displayCourse : previewCourse}
              modules={modules}
              lessons={lessons}
              courseLoading={isPreviewLoading}
              courseError={previewError}
              courseId={effectiveCourseId}
              privateLink={privateLink}
            />
          )}
        </div>

        {/* Course Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Course Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Modules:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100">{modules.length || displayCourse.moduleIds?.length || 0}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Lessons:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100">{lessons.length}</span>
            </div>
            {displayCourse.estimatedDuration && (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Duration:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{Math.round(displayCourse.estimatedDuration)} minutes</span>
              </div>
            )}
            {displayCourse.publishedAt && (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Published:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  {new Date(displayCourse.publishedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Course Curriculum - Modules and Lessons */}
        {(isPreviewLoading || modules.length > 0 || lessons.length > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Course Curriculum</h2>
            
            {isPreviewLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading curriculum...</p>
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No modules available yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {modules.map((module, moduleIndex) => {
                  const moduleLessons = lessons.filter(lesson => lesson.moduleId === module.id);
                  return (
                    <div
                      key={module.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700"
                    >
                      {/* Module Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                            {moduleIndex + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {module.title || module.conceptName}
                          </h3>
                          {module.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {module.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>{moduleLessons.length} {moduleLessons.length === 1 ? 'lesson' : 'lessons'}</span>
                            {module.estimatedDuration && (
                              <span>• {Math.round(module.estimatedDuration)} min</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lessons List */}
                      {moduleLessons.length > 0 && (
                        <div className="ml-14 space-y-2">
                          {moduleLessons.map((lesson, lessonIndex) => (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={() => {
                                // Navigate to lesson view
                                const effectiveCourseId = course?.id || courseId || '';
                                navigate(`/course/${effectiveCourseId}/lesson/${lesson.id}`);
                              }}
                              className="flex items-start gap-3 p-3 rounded-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors w-full text-left cursor-pointer"
                            >
                              <div className="flex-shrink-0 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mt-0.5">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                  {lessonIndex + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {lesson.title}
                                </h4>
                                {lesson.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                    {lesson.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;

