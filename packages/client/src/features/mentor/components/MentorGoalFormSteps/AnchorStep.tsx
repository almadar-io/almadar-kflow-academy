/**
 * AnchorStep Component
 * 
 * First step of MentorGoalForm - collects the anchor answer
 * Uses component library components
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Textarea } from '../../../../components/atoms/Textarea';
import { Button } from '../../../../components/atoms/Button';
import { Typography } from '../../../../components/atoms/Typography';

interface AnchorStepProps {
  anchorAnswer: string;
  onAnchorAnswerChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}

export const AnchorStep: React.FC<AnchorStepProps> = ({
  anchorAnswer,
  onAnchorAnswerChange,
  onSubmit,
  onCancel,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (anchorAnswer.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Typography variant="h2" className="mb-2">
          What would you like to learn?
        </Typography>
        <Typography variant="body" color="muted">
          Tell us about something you've always wanted to learn or improve.
        </Typography>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          id="anchor-answer"
          label="Your learning goal"
          value={anchorAnswer}
          onChange={(e) => onAnchorAnswerChange(e.target.value)}
          placeholder="e.g., I want to learn machine learning, I want to improve my Spanish, I want to master React..."
          rows={4}
          required
          autoFocus
        />

        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={!anchorAnswer.trim()}
            iconRight={ArrowRight}
          >
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
};

