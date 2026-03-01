import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { OnboardingTemplate } from './OnboardingTemplate';
import { useState } from 'react';

const meta: Meta<typeof OnboardingTemplate> = {
  title: 'Templates/OnboardingTemplate',
  component: OnboardingTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof OnboardingTemplate>;

const InteractiveOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({});

  return (
    <OnboardingTemplate
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      data={data}
      onDataChange={(newData) => setData(prev => ({ ...prev, ...newData }))}
      onComplete={(finalData) => {
        console.log('Onboarding complete:', finalData);
        alert('Onboarding complete! Check console for data.');
      }}
      onSkip={() => alert('Skipped onboarding')}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveOnboarding />,
};

export const WelcomeStep: Story = {
  args: {
    currentStep: 0,
    data: {},
    onStepChange: () => {},
    onDataChange: () => {},
  },
};

export const RoleStep: Story = {
  args: {
    currentStep: 1,
    data: { role: 'student' },
    onStepChange: () => {},
    onDataChange: () => {},
  },
};

export const ProfileStep: Story = {
  args: {
    currentStep: 2,
    data: { role: 'student', name: 'John Doe' },
    onStepChange: () => {},
    onDataChange: () => {},
  },
};

export const InterestsStep: Story = {
  args: {
    currentStep: 3,
    data: { 
      role: 'student', 
      name: 'John Doe',
      interests: ['web-dev', 'mobile']
    },
    onStepChange: () => {},
    onDataChange: () => {},
  },
};

export const GoalStep: Story = {
  args: {
    currentStep: 4,
    data: { 
      role: 'student', 
      name: 'John Doe',
      interests: ['web-dev', 'mobile'],
      goal: 'I want to become a full-stack developer',
      experience: 'intermediate'
    },
    onStepChange: () => {},
    onDataChange: () => {},
  },
};

export const Loading: Story = {
  args: {
    currentStep: 4,
    loading: true,
    data: {},
    onStepChange: () => {},
    onDataChange: () => {},
  },
};

export const Mobile: Story = {
  render: () => <InteractiveOnboarding />,
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

