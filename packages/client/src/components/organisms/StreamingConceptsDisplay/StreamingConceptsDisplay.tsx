/**
 * StreamingConceptsDisplay Organism Component
 * 
 * Displays streaming concepts as they are parsed from stream content.
 * Shows learning goal, concept list with descriptions and prerequisites.
 * Used in goal creation flows and concept generation.
 */

import React, { useEffect, useState, useRef } from 'react';
import { parseStreamingConcepts, ParsedConcept } from '../../../features/concepts/utils/streamParser';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Spinner } from '../../atoms/Spinner';
import { Target } from 'lucide-react';
import { cn } from '../../../utils/theme';

export interface StreamingConceptsDisplayProps {
  /**
   * The streaming content containing concepts
   */
  streamContent: string;
  
  /**
   * Optional learning goal to display
   */
  goal?: string;
  
  /**
   * Whether content is currently loading
   * @default false
   */
  isLoading?: boolean;
  
  /**
   * Auto-scroll to bottom as new concepts arrive
   * @default true
   */
  autoScroll?: boolean;
  
  /**
   * Maximum height for the concepts list
   * @default '24rem' (96 in Tailwind)
   */
  maxHeight?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const StreamingConceptsDisplay: React.FC<StreamingConceptsDisplayProps> = ({
  streamContent,
  goal,
  isLoading = false,
  autoScroll = true,
  maxHeight = '24rem',
  className,
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
      if (autoScroll && shouldScrollRef.current && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [streamContent, goal, autoScroll]);

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

  const displayGoal = extractedGoal || goal;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Learning Goal Section */}
      {displayGoal && (
        <Card variant="outlined" className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border-indigo-200 dark:border-indigo-700">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Target size={16} className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Typography variant="h4" className="text-sm font-semibold">
                  Learning Goal
                </Typography>
                <Badge variant="info" size="sm">
                  Level Target
                </Badge>
              </div>
              <Typography variant="body" className="text-sm leading-relaxed">
                {displayGoal}
              </Typography>
            </div>
          </div>
        </Card>
      )}

      {/* Concepts List */}
      <Card 
        variant="outlined"
        header={
          <div className="flex items-center justify-between">
            <Typography variant="h3" className="text-sm font-semibold uppercase tracking-wide">
              Generating Concepts
            </Typography>
            <div className="flex items-center gap-2">
              {isLoading && <Spinner size="sm" color="primary" />}
              {parsedConcepts.length > 0 && (
                <Badge variant="default" size="sm">
                  {parsedConcepts.length}
                </Badge>
              )}
            </div>
          </div>
        }
      >
        {parsedConcepts.length > 0 ? (
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="overflow-y-auto overflow-x-hidden space-y-3 pr-2"
            style={{
              maxHeight,
              scrollBehavior: 'smooth',
            }}
          >
            {parsedConcepts.map((concept, index) => (
              <Card
                key={`${concept.name}-${index}`}
                variant="outlined"
                className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 dark:bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Typography variant="h4" className="text-base font-bold mb-2 text-indigo-700 dark:text-indigo-300">
                      {concept.name}
                    </Typography>
                    {concept.description && (
                      <Typography variant="body" className="text-sm mb-2 leading-relaxed">
                        {concept.description}
                      </Typography>
                    )}
                    {concept.parents.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Typography variant="small" className="text-xs font-medium">
                          Prerequisites:
                        </Typography>
                        {concept.parents.map((parent, i) => (
                          <Badge
                            key={i}
                            variant="info"
                            size="sm"
                            className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                          >
                            {parent}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {isLoading ? (
              <>
                <Spinner size="lg" color="primary" className="mx-auto mb-2" />
                <Typography variant="small">Generating concepts...</Typography>
              </>
            ) : (
              <Typography variant="small">No concepts yet</Typography>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

StreamingConceptsDisplay.displayName = 'StreamingConceptsDisplay';

