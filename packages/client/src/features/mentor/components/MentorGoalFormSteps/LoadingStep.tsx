/**
 * LoadingStep Component
 * 
 * Fourth step of MentorGoalForm - shows loading/streaming state during goal generation
 * Uses component library components
 */

import React from 'react';
import { Typography } from '../../../../components/atoms/Typography';
import { Spinner } from '../../../../components/atoms/Spinner';
import { Card } from '../../../../components/molecules/Card';
import { StreamingJSONDisplay } from '../../../../components/molecules/StreamingJSONDisplay';

interface LoadingStepProps {
  anchorAnswer: string;
  streamingContent?: string;
  isLoading: boolean;
}

export const LoadingStep: React.FC<LoadingStepProps> = ({
  anchorAnswer,
  streamingContent,
  isLoading,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Spinner size="xl" color="primary" />
        </div>
        <Typography variant="h2" className="mb-2">
          Creating your learning path...
        </Typography>
        <Typography variant="body" color="muted">
          We're generating a personalized learning goal based on: <strong>{anchorAnswer}</strong>
        </Typography>
      </div>

      {streamingContent && (
        <StreamingJSONDisplay
          content={streamingContent}
          title="Generating goal..."
        />
      )}

      {!streamingContent && isLoading && (
        <Card variant="outlined" className="bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <Spinner size="sm" color="primary" />
            <Typography variant="body">
              Processing your request...
            </Typography>
          </div>
        </Card>
      )}
    </div>
  );
};

