/**
 * DetailsStep Component
 * 
 * Second step of MentorGoalForm - allows user to optionally provide goal details
 * or proceed to questionnaire
 * Uses component library components
 */

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardList } from 'lucide-react';
import { Textarea } from '../../../../components/atoms/Textarea';
import { Button } from '../../../../components/atoms/Button';
import { Typography } from '../../../../components/atoms/Typography';
import { Divider } from '../../../../components/atoms';

interface DetailsStepProps {
  goalDescription: string;
  onGoalDescriptionChange: (value: string) => void;
  onManualSubmit: () => void;
  onQuestionnaireClick: () => void;
  onBack: () => void;
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  goalDescription,
  onGoalDescriptionChange,
  onManualSubmit,
  onQuestionnaireClick,
  onBack,
}) => {
  const hasDescription = goalDescription.trim().length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Typography variant="h2" className="mb-2">
          Tell us more about your goal (optional)
        </Typography>
        <Typography variant="body" color="muted">
          Provide any additional details about what you want to learn, or proceed to answer questions that will help us create a personalized learning path.
        </Typography>
      </div>

      <div className="space-y-6">
        {/* Optional Description Field */}
        <div className="space-y-4">
          <Textarea
            id="goal-description"
            label="Goal details (optional)"
            value={goalDescription}
            onChange={(e) => onGoalDescriptionChange(e.target.value)}
            placeholder="e.g., I want to learn machine learning to build AI applications. I have some programming experience but I'm new to ML concepts..."
            rows={6}
            autoFocus
          />

          {/* Manual Submit Button (shown when description is provided) */}
          {hasDescription && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={onManualSubmit}
                iconRight={ArrowRight}
              >
                Continue with Description
              </Button>
            </div>
          )}
        </div>

        {/* Divider with "or" text */}
        {hasDescription && (
          <Divider label="or" />
        )}

        {/* Questionnaire Option */}
        <div className="space-y-4">
          {!hasDescription && (
            <Typography variant="body" color="muted" className="text-center">
              Or answer a few questions to help us create a personalized learning goal
            </Typography>
          )}
          <Button
            type="button"
            variant={hasDescription ? "secondary" : "primary"}
            onClick={onQuestionnaireClick}
            iconRight={ClipboardList}
            className="w-full"
          >
            Answer Questions
          </Button>
        </div>
      </div>

      {/* Back Button */}
      <div className="flex justify-start mt-6">
        <Button
          variant="secondary"
          onClick={onBack}
          icon={ArrowLeft}
        >
          Back
        </Button>
      </div>
    </div>
  );
};

