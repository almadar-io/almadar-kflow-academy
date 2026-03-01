import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { getRecommendedCourses, getContinueLearningCourses } from '../preferencesApi';

export const RecommendationsCard: React.FC = () => {
  const navigate = useNavigate();
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);
  const [continueCourses, setContinueCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      getRecommendedCourses(5),
      getContinueLearningCourses(5),
    ])
      .then(([recommended, continueLearning]) => {
        setRecommendedCourses(recommended);
        setContinueCourses(continueLearning);
        hasFetchedRef.current = true;
      })
      .catch((err: any) => {
        console.error('Failed to load recommendations:', err);
        setError(err.message || 'Failed to load recommendations');
      })
      .finally(() => {
        setIsLoading(false);
        isFetchingRef.current = false;
      });
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading recommendations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6">
        <div className="text-red-600 dark:text-red-400 text-sm">
          Error loading recommendations: {error}
        </div>
      </div>
    );
  }

  const hasRecommendations = recommendedCourses.length > 0 || continueCourses.length > 0;

  if (!hasRecommendations) {
    return null; // Don't show section if no recommendations
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
          <Sparkles size={20} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recommended for You</h3>
      </div>

      {/* Continue Learning Section */}
      {continueCourses.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Continue Learning
          </h4>
          <div className="space-y-2">
            {continueCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => navigate(`/course/${course.id}`)}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {course.title || course.seedConceptName || `Course ${course.id}`}
                    </div>
                    {course.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                        {course.description}
                      </div>
                    )}
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Courses Section */}
      {recommendedCourses.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Discover New Courses
          </h4>
          <div className="space-y-2">
            {recommendedCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => navigate(`/course/${course.id}`)}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 flex-shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {course.title || course.seedConceptName || `Course ${course.id}`}
                    </div>
                    {course.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                        {course.description}
                      </div>
                    )}
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

