/**
 * ChoiceStep Component
 * 
 * Second step of MentorGoalForm - choose between form-based or manual goal entry
 * Uses component library components
 */

import React from 'react';
import { ArrowLeft, ClipboardList, Edit3 } from 'lucide-react';
import { Button } from '../../../../components/atoms/Button';
import { Typography } from '../../../../components/atoms/Typography';
import { Card } from '../../../../components/molecules/Card';

interface ChoiceStepProps {
  onSelect: (choice: 'form' | 'manual') => void;
  onBack: () => void;
}

export const ChoiceStep: React.FC<ChoiceStepProps> = ({ onSelect, onBack }) => {
  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Typography variant="h2" className="mb-2">
          How would you like to create your learning goal?
        </Typography>
        <Typography variant="body" color="muted">
          Choose how you'd like to define your learning path.
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card
          variant="interactive"
          onClick={() => onSelect('form')}
          className="p-6 border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
              <ClipboardList size={24} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <Typography variant="h3" className="text-lg font-semibold">
              Guided Form
            </Typography>
          </div>
          <Typography variant="small" color="muted">
            Answer a few questions to help us create a personalized learning goal tailored to your needs.
          </Typography>
        </Card>

        <Card
          variant="interactive"
          onClick={() => onSelect('manual')}
          className="p-6 border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
              <Edit3 size={24} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <Typography variant="h3" className="text-lg font-semibold">
              Manual Entry
            </Typography>
          </div>
          <Typography variant="small" color="muted">
            Enter your learning goal directly. We'll generate milestones to help you achieve it.
          </Typography>
        </Card>
      </div>

      <div className="flex justify-start">
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

