/**
 * LevelSelectionStep Component
 * 
 * Step to select user's experience level (beginner, intermediate, advanced)
 * Uses component library components
 */

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, BookOpen, Rocket, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/atoms/Button';
import { Typography } from '../../../../components/atoms/Typography';
import { Card } from '../../../../components/molecules/Card';

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

interface LevelSelectionStepProps {
  onSelectLevel: (level: ExperienceLevel) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const LevelSelectionStep: React.FC<LevelSelectionStepProps> = ({
  onSelectLevel,
  onBack,
  isLoading = false,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>('beginner');

  const levels = [
    {
      value: 'beginner' as const,
      label: 'Beginner',
      description: "I'm new to this topic or have limited experience",
      icon: BookOpen,
      colors: {
        border: 'border-green-200 dark:border-green-800',
        selectedBorder: 'border-green-500 dark:border-green-500',
        bg: 'bg-green-50 dark:bg-green-900/20',
        selectedBg: 'bg-green-100 dark:bg-green-900/40',
        icon: 'text-green-600 dark:text-green-400',
        text: 'text-green-800 dark:text-green-300',
      },
    },
    {
      value: 'intermediate' as const,
      label: 'Intermediate',
      description: 'I have some experience and understand the basics',
      icon: GraduationCap,
      colors: {
        border: 'border-blue-200 dark:border-blue-800',
        selectedBorder: 'border-blue-500 dark:border-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        selectedBg: 'bg-blue-100 dark:bg-blue-900/40',
        icon: 'text-blue-600 dark:text-blue-400',
        text: 'text-blue-800 dark:text-blue-300',
      },
    },
    {
      value: 'advanced' as const,
      label: 'Advanced',
      description: 'I have significant experience and want to deepen my knowledge',
      icon: Rocket,
      colors: {
        border: 'border-purple-200 dark:border-purple-800',
        selectedBorder: 'border-purple-500 dark:border-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        selectedBg: 'bg-purple-100 dark:bg-purple-900/40',
        icon: 'text-purple-600 dark:text-purple-400',
        text: 'text-purple-800 dark:text-purple-300',
      },
    },
  ];

  const handleContinue = () => {
    if (selectedLevel) {
      onSelectLevel(selectedLevel);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <Typography variant="h2" className="mb-2">
          What's Your Current Level?
        </Typography>
        <Typography variant="body" color="muted">
          Help us tailor your learning path to your experience level
        </Typography>
      </div>

      <div className="space-y-4 mb-8">
        {levels.map((level) => {
          const isSelected = selectedLevel === level.value;
          const Icon = level.icon;
          
          return (
            <Card
              key={level.value}
              variant="interactive"
              onClick={() => setSelectedLevel(level.value)}
              className={`p-6 border-2 transition-all cursor-pointer ${
                isSelected
                  ? `${level.colors.selectedBorder} ${level.colors.selectedBg}`
                  : `${level.colors.border} ${level.colors.bg} hover:border-opacity-60`
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  isSelected ? level.colors.selectedBg : level.colors.bg
                }`}>
                  <Icon size={24} className={level.colors.icon} />
                </div>
                <div className="flex-1">
                  <Typography variant="h3" className={`mb-1 ${level.colors.text}`}>
                    {level.label}
                  </Typography>
                  <Typography variant="body" color="muted">
                    {level.description}
                  </Typography>
                </div>
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? `${level.colors.selectedBorder} ${level.colors.icon}`
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && (
                    <div className={`w-3 h-3 rounded-full ${
                      level.value === 'beginner' ? 'bg-green-600 dark:bg-green-400' :
                      level.value === 'intermediate' ? 'bg-blue-600 dark:bg-blue-400' :
                      'bg-purple-600 dark:bg-purple-400'
                    }`} />
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="secondary"
          onClick={onBack}
          icon={ArrowLeft}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleContinue}
          iconRight={isLoading ? Loader2 : ArrowRight}
          disabled={!selectedLevel || isLoading}
          className={isLoading ? 'opacity-75' : ''}
        >
          {isLoading ? 'Setting up...' : `Continue as ${selectedLevel ? selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1) : ''}`}
        </Button>
      </div>
    </div>
  );
};

