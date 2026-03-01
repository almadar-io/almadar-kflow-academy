import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Globe, Lock, BookOpen } from 'lucide-react';
import { publicApi } from '../features/public/publicApi';
import { useAuthContext } from '../features/auth/AuthContext';
import PublicLayout from '../components/PublicLayout';

const PublicCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const result = await publicApi.listPublicCourses();
      setCourses(result.courses || []);
    } catch (error: any) {
      console.error('Failed to load courses:', error);
      alert(error.message || 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Public Courses
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse and enroll in courses created by mentors.
        </p>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-8 w-8 text-indigo-600 animate-spin" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading courses...</p>
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => navigate(`/courses/${course.id}`)}
              className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {course.isPublic ? (
                    <Globe className="text-green-600 dark:text-green-400" size={16} />
                  ) : (
                    <Lock className="text-gray-400 dark:text-gray-500" size={16} />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {course.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {course.title || course.seedConceptName}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                {course.description}
              </p>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                  {course.moduleIds?.length || 0} modules
                </span>
                {course.estimatedDuration && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                    {Math.round(course.estimatedDuration)} min
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <BookOpen size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No public courses available</h3>
          <p className="text-gray-500 dark:text-gray-400">Check back later for new courses.</p>
        </div>
      )}
    </div>
  );

  // Wrap with PublicLayout if user is not authenticated
  if (!user) {
    return <PublicLayout>{content}</PublicLayout>;
  }

  // If authenticated, return without layout (they might be using the authenticated layout)
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-900">{content}</div>;
};

export default PublicCoursesPage;

