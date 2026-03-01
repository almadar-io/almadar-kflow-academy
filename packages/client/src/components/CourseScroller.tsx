import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { publicApi } from '../features/public/publicApi';

interface CourseScrollerProps {
  title?: string;
  subtitle?: string;
  maxCourses?: number;
  showViewAll?: boolean;
  viewAllPath?: string;
  className?: string;
}

const CourseScroller: React.FC<CourseScrollerProps> = ({
  title = 'Featured Courses',
  subtitle = 'Explore courses created by our expert mentors',
  maxCourses = 6,
  showViewAll = true,
  viewAllPath = '/courses',
  className = '',
}) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCourses = async () => {
      setIsLoading(true);
      try {
        const result = await publicApi.listPublicCourses();
        const allCourses = result.courses || [];
        // Limit to maxCourses
        setCourses(allCourses.slice(0, maxCourses));
      } catch (error: any) {
        console.error('Failed to load courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCourses();
  }, [maxCourses]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    const newPosition = direction === 'left' 
      ? scrollPosition - scrollAmount 
      : scrollPosition + scrollAmount;
    
    container.scrollTo({
      left: Math.max(0, Math.min(newPosition, container.scrollWidth - container.clientWidth)),
      behavior: 'smooth',
    });
    
    setScrollPosition(newPosition);
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
    }
  };

  const handleCourseClick = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollContainerRef.current 
    ? scrollPosition < scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth - 10
    : false;

  if (isLoading) {
    return (
      <div className={`py-16 ${className}`}>
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 text-indigo-600 animate-spin" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return null;
  }

  return (
    <section className={`py-12 md:py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h2>
            {subtitle && (
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
          {showViewAll && (
            <button
              onClick={() => navigate(viewAllPath)}
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              View All Courses
              <ArrowRight size={18} />
            </button>
          )}
        </div>

        {/* Scroller Container */}
        <div className="relative">
          {/* Scroll Buttons */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700"
              aria-label="Scroll left"
            >
              <ChevronLeft size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700"
              aria-label="Scroll right"
            >
              <ChevronRight size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}

          {/* Courses Scroll Container */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="course-scroller flex gap-6 overflow-x-auto pb-4 scroll-smooth"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
              >
                {/* Course Image/Header */}
                <div className="h-40 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                  <Globe className="w-16 h-16 text-white/90" size={64} />
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
                      Public
                    </span>
                  </div>
                </div>

                {/* Course Content */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {course.title || course.seedConceptName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {course.description || 'Explore this comprehensive course designed to help you master new skills.'}
                  </p>
                  
                  {/* Course Stats */}
                  <div className="flex items-center gap-3 text-xs font-medium mb-4">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      {course.moduleIds?.length || 0} modules
                    </span>
                    {course.estimatedDuration && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                        {Math.round(course.estimatedDuration)} min
                      </span>
                    )}
                  </div>

                  {/* View Course Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCourseClick(course.id);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors font-medium text-sm group-hover:shadow-md"
                  >
                    View Course
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* View All Button (Mobile) */}
          {showViewAll && (
            <div className="mt-6 text-center md:hidden">
              <button
                onClick={() => navigate(viewAllPath)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                View All Courses
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .course-scroller::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default CourseScroller;

