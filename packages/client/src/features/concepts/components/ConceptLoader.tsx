import React, { useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { parseStreamingConcepts, ParsedConcept } from '../utils/streamParser';

interface LessonPreview {
  id: string;
  title: string;
  content: string;
}

interface ConceptLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  progress?: number;
  lessons?: LessonPreview[];
  emptyLessonsText?: string;
  className?: string;
  streamContent?: string;
  goal?: string; // Learning goal for the current layer
  onStreamChunk?: (chunk: string) => void;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
};

const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const ConceptLoader: React.FC<ConceptLoaderProps> = ({
  size = 'md',
  text = 'Loading...',
  progress,
  lessons = [],
  emptyLessonsText = "No lessons yet—give us a moment to craft something awesome for you! 🌱",
  className = '',
  streamContent = '',
  goal,
  onStreamChunk,
}) => {
  const [parsedConcepts, setParsedConcepts] = useState<ParsedConcept[]>([]);
  const [extractedGoal, setExtractedGoal] = useState<string | undefined>(goal);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  // Parse stream content whenever it changes
  useEffect(() => {
    if (streamContent) {
      const concepts = parseStreamingConcepts(streamContent);
      setParsedConcepts(concepts);
      
      // Extract goal from stream content if not provided as prop
      if (!goal) {
        const goalMatch = streamContent.match(/<goal>([\s\S]*?)<\/goal>/i);
        if (goalMatch) {
          setExtractedGoal(goalMatch[1].trim());
        }
      }
      
      // Auto-scroll to bottom if user hasn't scrolled up
      if (shouldScrollRef.current && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [streamContent, goal]);

  // Update extracted goal when goal prop changes
  useEffect(() => {
    if (goal) {
      setExtractedGoal(goal);
    }
  }, [goal]);

  // Handle scroll events to detect if user scrolled up
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // If user is near bottom (within 50px), auto-scroll
      shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  };

  // Expose onStreamChunk handler
  useEffect(() => {
    if (onStreamChunk) {
      // This will be called from parent component
    }
  }, [onStreamChunk]);
  const spinner = (
    <div className="flex flex-col items-center space-y-4">
      <div
        className={`animate-spin rounded-full border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 ${sizeClasses[size]}`}
      />
      {text && (
        <p className={`text-gray-600 dark:text-gray-300 font-medium text-center ${textSizes[size]}`}>{text}</p>
      )}
    </div>
  );

  const progressBar =
    typeof progress === 'number' ? (
      <div className="w-full">
        <div className="flex justify-between text-xs font-semibold text-indigo-400 dark:text-indigo-300 mb-2">
          <span>Progress</span>
          <span>{Math.min(progress, 100)}%</span>
        </div>
        <div className="w-full bg-indigo-100 dark:bg-indigo-900/30 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    ) : null;

  // Render streaming concepts if available, otherwise show lessons
  const renderContent = () => {
    if (streamContent && parsedConcepts.length > 0) {
      return (
        <div className="w-full">
          {/* Learning Goal Section */}
          {extractedGoal && (
            <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <Target size={16} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Learning Goal</h4>
                    <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Level Target</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{extractedGoal}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Generating Concepts
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">{parsedConcepts.length}</span>
          </div>
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="max-h-96 overflow-y-auto overflow-x-hidden pr-2 space-y-4 custom-scrollbar"
            style={{
              scrollBehavior: 'smooth',
            }}
          >
            {parsedConcepts.map((concept, index) => (
              <div
                key={`${concept.name}-${index}`}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 dark:bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-indigo-700 dark:text-indigo-300 mb-2">
                      {concept.name}
                    </h4>
                    {concept.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                        {concept.description}
                      </p>
                    )}
                    {concept.parents.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Prerequisites:</span>
                        {concept.parents.map((parent, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium"
                          >
                            {parent}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Fallback to lessons display
    if (lessons.length > 0) {
      return (
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Previous Lessons</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">{lessons.length}</span>
          </div>
          <div className="overflow-x-auto pb-2 -mx-2">
            <div className="flex gap-4 px-2 min-w-max">
              {lessons.map(lesson => (
                <article
                  key={lesson.id}
                  className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-4"
                >
                  <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2 line-clamp-2">{lesson.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-5">
                    {lesson.content.trim().length > 0
                      ? lesson.content.replace(/\s+/g, ' ').slice(0, 220) +
                        (lesson.content.length > 220 ? '…' : '')
                      : 'This lesson is ready for you to explore.'}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl py-3 px-4">
        {emptyLessonsText}
      </div>
    );
  };

  const lessonGallery = renderContent();

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-br from-indigo-950/80 via-purple-900/70 to-slate-900/80 dark:from-indigo-950/90 dark:via-purple-950/90 dark:to-slate-950/90 backdrop-blur ${
        className ?? ''
      }`}
    >
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-xl border border-indigo-100 dark:border-indigo-800 p-6 sm:p-8 space-y-6">
        {spinner}
        {progressBar}
        {lessonGallery}
      </div>
    </div>
  );
};

export type { LessonPreview, ConceptLoaderProps };
export default ConceptLoader;

