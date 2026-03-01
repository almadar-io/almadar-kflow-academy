import React, { useState } from 'react';
import { BookOpen, Loader2, X } from 'lucide-react';
import Modal from '../../../components/Modal';
import CoursePreview from './CoursePreview';
import type { CoursePreview as CoursePreviewType, PublishedModule } from '../hooks/useCoursePreview';
import type { LessonPreview } from '../types';

interface EnrollButtonProps {
  isEnrolled: boolean;
  isChecking: boolean;
  isEnrolling: boolean;
  onEnroll: () => Promise<void>;
  onUnenroll: () => Promise<void>;
  // Course preview data for modal
  course: CoursePreviewType | null;
  modules: PublishedModule[];
  lessons: LessonPreview[];
  courseLoading: boolean;
  courseError: string | null;
  className?: string;
  courseId?: string;
  privateLink?: string;
  // Callbacks (handled by container)
  user?: { id?: string; name?: string; email?: string } | null;
  onNavigateToLogin?: (returnUrl: string) => void;
}

const EnrollButton: React.FC<EnrollButtonProps> = ({
  isEnrolled,
  isChecking,
  isEnrolling,
  onEnroll,
  onUnenroll,
  course,
  modules,
  lessons,
  courseLoading,
  courseError,
  className = '',
  courseId,
  privateLink,
  user,
  onNavigateToLogin,
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const handleEnroll = async () => {
    // If user is not logged in, redirect to login with returnUrl
    if (!user && courseId && onNavigateToLogin) {
      // Build return URL with enrollment intent
      const returnUrl = new URL(window.location.origin + window.location.pathname + window.location.search);
      returnUrl.searchParams.set('enroll', 'true');
      if (privateLink) {
        returnUrl.searchParams.set('link', privateLink);
      }
      
      // Redirect to login with returnUrl
      onNavigateToLogin(returnUrl.pathname + returnUrl.search);
      return;
    }

    try {
      await onEnroll();
      setShowPreview(false);
    } catch (error: any) {
      alert(error.message || 'Failed to enroll in course');
    }
  };

  const handleUnenroll = async () => {
    if (!window.confirm('Are you sure you want to unenroll from this course?')) {
      return;
    }

    try {
      await onUnenroll();
    } catch (error: any) {
      alert(error.message || 'Failed to unenroll from course');
    }
  };

  if (isChecking) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-md ${className}`}
      >
        <Loader2 size={16} className="animate-spin" />
        Checking...
      </button>
    );
  }

  if (isEnrolled) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
          Enrolled
        </span>
        <button
          onClick={handleUnenroll}
          disabled={isEnrolling}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 rounded-md transition-colors disabled:opacity-50 ${className}`}
        >
          {isEnrolling ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={14} />
          )}
          Unenroll
        </button>
      </div>
    );
  }

  const handleShowPreview = () => {
    // If user is not logged in, redirect to login with returnUrl
    if (!user && courseId && onNavigateToLogin) {
      // Build return URL with enrollment intent
      const returnUrl = new URL(window.location.origin + window.location.pathname + window.location.search);
      returnUrl.searchParams.set('enroll', 'true');
      if (privateLink) {
        returnUrl.searchParams.set('link', privateLink);
      }
      
      // Redirect to login with returnUrl
      onNavigateToLogin(returnUrl.pathname + returnUrl.search);
      return;
    }
    
    setShowPreview(true);
  };

  return (
    <>
      <button
        onClick={handleShowPreview}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors ${className}`}
      >
        <BookOpen size={16} />
        Enroll in Course
      </button>

      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Course Preview"
        size="large"
      >
        <div className="space-y-6">
          <CoursePreview
            course={course}
            modules={modules}
            lessons={lessons}
            isLoading={courseLoading}
            error={courseError}
            onEnroll={handleEnroll}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEnroll}
              disabled={isEnrolling}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isEnrolling && <Loader2 size={16} className="animate-spin" />}
              Enroll in Course
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EnrollButton;

