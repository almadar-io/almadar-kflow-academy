/**
 * OnboardingTemplate Component
 * 
 * New user onboarding flow with step-by-step wizard.
 * Uses QuestionCard, Form organisms and ProgressCard, Card, ButtonGroup molecules.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, Check, User, Target, BookOpen, Sparkles } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { FormField } from '../../molecules/FormField';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Avatar } from '../../atoms/Avatar';
import { Radio } from '../../atoms/Radio';
import { cn } from '../../../utils/theme';

export interface OnboardingStep {
  /**
   * Step ID
   */
  id: string;
  
  /**
   * Step title
   */
  title: string;
  
  /**
   * Step description
   */
  description?: string;
  
  /**
   * Step icon
   */
  icon?: LucideIcon;
  
  /**
   * Is optional
   */
  optional?: boolean;
}

export interface OnboardingData {
  role?: 'student' | 'mentor';
  name?: string;
  avatar?: string;
  interests?: string[];
  goal?: string;
  experience?: 'beginner' | 'intermediate' | 'advanced';
}

export interface OnboardingTemplateProps {
  /**
   * Onboarding steps
   */
  steps?: OnboardingStep[];
  
  /**
   * Current step index
   */
  currentStep?: number;
  
  /**
   * On step change
   */
  onStepChange?: (step: number) => void;
  
  /**
   * Onboarding data
   */
  data?: OnboardingData;
  
  /**
   * On data change
   */
  onDataChange?: (data: Partial<OnboardingData>) => void;
  
  /**
   * On complete
   */
  onComplete?: (data: OnboardingData) => void;
  
  /**
   * On skip
   */
  onSkip?: () => void;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Interest options
   */
  interestOptions?: Array<{ value: string; label: string }>;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * App name
   */
  appName?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const defaultSteps: OnboardingStep[] = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'role', title: 'Your Role', icon: User },
  { id: 'profile', title: 'Profile', icon: User, optional: true },
  { id: 'interests', title: 'Interests', icon: BookOpen },
  { id: 'goal', title: 'Your Goal', icon: Target },
];

const defaultInterests = [
  { value: 'web-dev', label: 'Web Development' },
  { value: 'mobile', label: 'Mobile Development' },
  { value: 'data-science', label: 'Data Science' },
  { value: 'machine-learning', label: 'Machine Learning' },
  { value: 'devops', label: 'DevOps' },
  { value: 'design', label: 'UI/UX Design' },
  { value: 'security', label: 'Cybersecurity' },
  { value: 'cloud', label: 'Cloud Computing' },
];

export const OnboardingTemplate: React.FC<OnboardingTemplateProps> = ({
  steps = defaultSteps,
  currentStep = 0,
  onStepChange,
  data = {},
  onDataChange,
  onComplete,
  onSkip,
  loading = false,
  interestOptions = defaultInterests,
  logo,
  appName = 'KFlow',
  className,
}) => {
  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.(data);
    } else {
      onStepChange?.(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      onStepChange?.(currentStep - 1);
    }
  };

  const handleInterestToggle = (interest: string) => {
    const currentInterests = data.interests || [];
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter(i => i !== interest)
      : [...currentInterests, interest];
    onDataChange?.({ interests: newInterests });
  };

  const renderStepContent = () => {
    switch (currentStepData?.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <Typography variant="h3">
              Welcome to {appName}!
            </Typography>
            <Typography variant="body" color="secondary" className="max-w-md mx-auto">
              Let's personalize your learning experience. This will only take a minute.
            </Typography>
          </div>
        );

      case 'role':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Typography variant="h4" className="mb-2">How will you use {appName}?</Typography>
              <Typography variant="body" color="secondary">
                Choose your primary role
              </Typography>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto">
              {[
                { value: 'student', label: 'Student', description: 'I want to learn new skills', icon: '📚' },
                { value: 'mentor', label: 'Mentor', description: 'I want to create courses', icon: '👨‍🏫' },
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => onDataChange?.({ role: role.value as 'student' | 'mentor' })}
                  className={cn(
                    'p-4 sm:p-6 rounded-xl border-2 text-center transition-all',
                    data.role === role.value
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{role.icon}</div>
                  <Typography variant="h6" className="text-base sm:text-lg">{role.label}</Typography>
                  <Typography variant="small" color="secondary" className="text-xs sm:text-sm">
                    {role.description}
                  </Typography>
                </button>
              ))}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center mb-8">
              <Typography variant="h4" className="mb-2">Set up your profile</Typography>
              <Typography variant="body" color="secondary">
                This helps personalize your experience
              </Typography>
            </div>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Avatar
                  src={data.avatar}
                  initials={data.name ? data.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  size="xl"
                  className="w-24 h-24"
                />
                <button
                  type="button"
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700"
                >
                  <User className="w-4 h-4" />
                </button>
              </div>
            </div>
            <FormField
              label="Your Name"
              type="input"
              inputProps={{
                value: data.name || '',
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => onDataChange?.({ name: e.target.value }),
                placeholder: 'Enter your name',
              }}
            />
          </div>
        );

      case 'interests':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Typography variant="h4" className="mb-2">What are you interested in?</Typography>
              <Typography variant="body" color="secondary">
                Select all that apply
              </Typography>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 max-w-2xl mx-auto">
              {interestOptions.map((interest) => {
                const isSelected = data.interests?.includes(interest.value);
                return (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => handleInterestToggle(interest.value)}
                    className={cn(
                      'p-3 sm:p-4 rounded-lg border-2 text-center transition-all',
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <Typography variant="small" weight={isSelected ? 'semibold' : 'normal'} className="text-xs sm:text-sm">
                      {interest.label}
                    </Typography>
                    {isSelected && (
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 mx-auto mt-1 text-indigo-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'goal':
        return (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center mb-8">
              <Typography variant="h4" className="mb-2">What's your learning goal?</Typography>
              <Typography variant="body" color="secondary">
                This helps us recommend the right content
              </Typography>
            </div>
            <FormField
              label="Your Goal"
              type="textarea"
              inputProps={{
                value: data.goal || '',
                onChange: (e) => onDataChange?.({ goal: e.target.value }),
                placeholder: "e.g., I want to become a full-stack developer...",
                rows: 4,
              }}
            />
            <div>
              <Typography variant="body" weight="medium" className="mb-3">
                Experience Level
              </Typography>
              <div className="space-y-2">
                {[
                  { value: 'beginner', label: 'Beginner', description: 'New to programming' },
                  { value: 'intermediate', label: 'Intermediate', description: 'Some experience' },
                  { value: 'advanced', label: 'Advanced', description: 'Professional level' },
                ].map((level) => (
                  <label
                    key={level.value}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer',
                      data.experience === level.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <Radio
                      checked={data.experience === level.value}
                      onChange={() => onDataChange?.({ experience: level.value as OnboardingData['experience'] })}
                    />
                    <div>
                      <Typography variant="body" weight="medium">
                        {level.label}
                      </Typography>
                      <Typography variant="small" color="secondary">
                        {level.description}
                      </Typography>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn(
      'min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col',
      className
    )}>
      {/* Header with progress */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            {logo || (
              <Typography variant="h5" className="text-lg sm:text-xl md:text-2xl text-indigo-600 font-bold">
                {appName}
              </Typography>
            )}
            {onSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip} className="text-xs sm:text-sm">
                Skip
              </Button>
            )}
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center gap-1 sm:gap-2 mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'flex-1 h-1.5 sm:h-2 rounded-full',
                  index <= currentStep
                    ? 'bg-indigo-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            ))}
          </div>
          <Typography variant="small" color="muted" className="text-xs sm:text-sm">
            Step {currentStep + 1} of {steps.length}
            {currentStepData?.optional && ' (Optional)'}
          </Typography>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6">
        <Card className="w-full max-w-2xl">
          {renderStepContent()}
        </Card>
      </main>

      {/* Footer navigation */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex justify-between gap-2 sm:gap-4">
          <Button
            variant="secondary"
            icon={ChevronLeft}
            onClick={handleBack}
            disabled={isFirstStep}
            size="sm"
            className="text-xs sm:text-sm"
          >
            Back
          </Button>
          
          <Button
            variant="primary"
            iconRight={isLastStep ? Check : ChevronRight}
            onClick={handleNext}
            loading={loading}
            size="sm"
            className="text-xs sm:text-sm"
          >
            {isLastStep ? 'Get Started' : 'Continue'}
          </Button>
        </div>
      </footer>
    </div>
  );
};

OnboardingTemplate.displayName = 'OnboardingTemplate';

