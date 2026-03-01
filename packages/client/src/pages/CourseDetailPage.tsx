import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicApi } from '../features/public/publicApi';
import { CourseDetail } from '../features/student/components';
import { useAuthContext } from '../features/auth/AuthContext';
import PublicLayout from '../components/PublicLayout';

const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuthContext();
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const privateLink = searchParams.get('link');

  useEffect(() => {
    // Load course if we have either courseId or privateLink
    if (courseId || privateLink) {
      loadCourse();
    }
  }, [courseId, privateLink]);

  const loadCourse = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let result;
      if (privateLink) {
        // Load by private link (courseId is not required for private links)
        console.log('Loading course by private link:', privateLink);
        result = await publicApi.getCourseByLink(privateLink);
      } else if (courseId) {
        // Load public course by ID
        console.log('Loading public course by ID:', courseId);
        result = await publicApi.getPublicCourse(courseId);
      } else {
        setError('Course ID or private link is required');
        setIsLoading(false);
        return;
      }

      if (result.course) {
        console.log('Course loaded successfully:', result.course.id);
        setCourse(result.course);
      } else {
        console.error('Course not found in result:', result);
        setError('Course not found');
      }
    } catch (error: any) {
      console.error('Failed to load course:', error);
      setError(error.message || 'Failed to load course');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <CourseDetail
        courseId={course?.id || courseId || ''}
        course={course}
        isLoading={isLoading}
        error={error}
        showBackButton={true}
        backPath={user ? "/courses" : undefined}
        backLabel={user ? "Back to Courses" : "Back"}
        privateLink={privateLink || undefined}
      />
    </div>
  );

  // Wrap with PublicLayout if user is not authenticated
  if (!user) {
    return <PublicLayout>{content}</PublicLayout>;
  }

  // If authenticated, return without layout (they might be using the authenticated layout)
  return content;
};

export default CourseDetailPage;

