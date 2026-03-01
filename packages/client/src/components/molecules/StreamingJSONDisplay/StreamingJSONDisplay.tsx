/**
 * StreamingJSONDisplay Molecule Component
 * 
 * Displays incrementally parsed JSON content as it streams in.
 * Shows goal information and milestone cards as they become available.
 * Used for showing partial goal data during streaming API responses.
 */

import React, { useEffect, useState } from 'react';
import { parseIncrementalJSON } from '../../../utils/jsonParser';
import { Card } from '../Card';
import { Typography } from '../../atoms/Typography';
import { Spinner } from '../../atoms/Spinner';
import { cn } from '../../../utils/theme';

interface Milestone {
  id?: string;
  title?: string;
  description?: string;
  targetDate?: number;
  completed?: boolean;
}

interface ParsedGoal {
  title?: string;
  description?: string;
  type?: string;
  target?: string;
  estimatedTime?: number;
  milestones?: Milestone[];
}

export interface StreamingJSONDisplayProps {
  /**
   * The streaming JSON content (may be incomplete)
   */
  content: string;
  
  /**
   * Optional title to display
   */
  title?: string;
  
  /**
   * Show raw content alongside parsed data
   * @default false
   */
  showRaw?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const StreamingJSONDisplay: React.FC<StreamingJSONDisplayProps> = ({
  content,
  title = 'Generating goal...',
  showRaw = false,
  className,
}) => {
  const [parsedData, setParsedData] = useState<ParsedGoal>({});

  useEffect(() => {
    if (content) {
      const parsed = parseIncrementalJSON(content);
      setParsedData(parsed);
    }
  }, [content]);

  const milestones = parsedData.milestones || [];
  const hasGoalInfo = parsedData.title || parsedData.description || parsedData.type || parsedData.target;
  const hasData = hasGoalInfo || milestones.length > 0;

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* Goal Information Card - Matching ReviewStep style */}
      {hasGoalInfo && (
        <Card variant="outlined" className="mb-6">
          {parsedData.title && (
            <Typography variant="h3" className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {parsedData.title}
            </Typography>
          )}
          {parsedData.description && (
            <Typography variant="body" className="text-gray-700 dark:text-gray-300 mb-4">
              {parsedData.description}
            </Typography>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            {parsedData.type && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">
                  {parsedData.type}
                </span>
              </div>
            )}
            {parsedData.target && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Target:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">
                  {parsedData.target}
                </span>
              </div>
            )}
            {parsedData.estimatedTime && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Estimated Time:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">
                  {parsedData.estimatedTime} hours
                </span>
              </div>
            )}
          </div>

          {/* Milestones Section - Matching ReviewStep style */}
          {milestones.length > 0 && (
            <div className="mt-6">
              <Typography variant="h4" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Milestones
              </Typography>
              <ul className="space-y-2">
                {milestones.map((milestone, index) => {
                  const hasTitle = milestone.title && milestone.title.trim() !== '';
                  
                  // Only show milestone if it has at least a title
                  if (!hasTitle) return null;

                  return (
                    <li
                      key={milestone.id || `milestone-${index}`}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <Typography variant="body" className="font-medium text-gray-900 dark:text-gray-100">
                          {milestone.title}
                        </Typography>
                        {milestone.description && (
                          <Typography variant="small" className="text-gray-600 dark:text-gray-400 mt-1">
                            {milestone.description}
                          </Typography>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Loading State */}
      {!hasData && (
        <Card variant="outlined">
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Spinner size="lg" color="primary" className="mx-auto mb-2" />
            <Typography variant="small">Waiting for goal data...</Typography>
          </div>
        </Card>
      )}

      {/* Raw Content Toggle */}
      {showRaw && content && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            Show raw JSON content
          </summary>
          <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
            {content}
          </pre>
        </details>
      )}
    </div>
  );
};

StreamingJSONDisplay.displayName = 'StreamingJSONDisplay';

