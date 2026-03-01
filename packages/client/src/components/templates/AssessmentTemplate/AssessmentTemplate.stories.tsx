import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { AssessmentTemplate } from './AssessmentTemplate';
import { useState } from 'react';

const meta: Meta<typeof AssessmentTemplate> = {
  title: 'Templates/AssessmentTemplate',
  component: AssessmentTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AssessmentTemplate>;

const mockQuestions = [
  {
    id: 'q1',
    text: 'What is the primary purpose of React hooks?',
    type: 'single' as const,
    options: [
      { id: 'a', text: 'To style components' },
      { id: 'b', text: 'To add state and lifecycle features to functional components' },
      { id: 'c', text: 'To create class components' },
      { id: 'd', text: 'To optimize bundle size' },
    ],
    isAnswered: true,
    answer: 'b',
  },
  {
    id: 'q2',
    text: 'Which of the following are valid React hooks? (Select all that apply)',
    type: 'multiple' as const,
    options: [
      { id: 'a', text: 'useState' },
      { id: 'b', text: 'useEffect' },
      { id: 'c', text: 'useClass' },
      { id: 'd', text: 'useCallback' },
    ],
    isAnswered: false,
  },
  {
    id: 'q3',
    text: 'What does the useEffect hook do?',
    type: 'single' as const,
    options: [
      { id: 'a', text: 'Manages component state' },
      { id: 'b', text: 'Handles side effects in functional components' },
      { id: 'c', text: 'Creates memoized values' },
      { id: 'd', text: 'Handles form submissions' },
    ],
    isAnswered: false,
  },
  {
    id: 'q4',
    text: 'Which hook should be used to access context in a functional component?',
    type: 'single' as const,
    options: [
      { id: 'a', text: 'useState' },
      { id: 'b', text: 'useReducer' },
      { id: 'c', text: 'useContext' },
      { id: 'd', text: 'useMemo' },
    ],
    isAnswered: false,
    isFlagged: true,
  },
  {
    id: 'q5',
    text: 'What is the correct way to conditionally render a component in React?',
    type: 'single' as const,
    options: [
      { id: 'a', text: 'Using if statements inside JSX' },
      { id: 'b', text: 'Using ternary operators or && operator' },
      { id: 'c', text: 'Using switch statements inside JSX' },
      { id: 'd', text: 'React does not support conditional rendering' },
    ],
    isAnswered: false,
  },
];

const InteractiveAssessment = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState(mockQuestions);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return { ...q, answer, isAnswered: true, isFlagged: q.isFlagged ?? false } as unknown as typeof q;
      }
      return q;
    }));
  };

  const handleFlagToggle = (questionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return { ...q, isFlagged: !(q.isFlagged ?? false) } as unknown as typeof q;
      }
      return q;
    }));
  };

  return (
    <AssessmentTemplate
      id="assessment-1"
      title="React Fundamentals Quiz"
      questions={questions}
      currentQuestionIndex={currentIndex}
      onQuestionChange={setCurrentIndex}
      onAnswerChange={handleAnswerChange}
      onFlagToggle={handleFlagToggle}
      timeLimit={600}
      timeRemaining={342}
      onSubmit={() => setShowSubmitConfirm(true)}
      onExit={() => alert('Exit assessment')}
      showSubmitConfirmation={showSubmitConfirm}
      onConfirmSubmit={() => alert('Assessment submitted!')}
      onCancelSubmit={() => setShowSubmitConfirm(false)}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveAssessment />,
};

export const LowTime: Story = {
  args: {
    id: 'assessment-1',
    title: 'React Fundamentals Quiz',
    questions: mockQuestions,
    currentQuestionIndex: 0,
    timeLimit: 600,
    timeRemaining: 45,
    onQuestionChange: () => {},
    onAnswerChange: () => {},
    onSubmit: () => {},
    onExit: () => {},
  },
};

export const LastQuestion: Story = {
  args: {
    id: 'assessment-1',
    title: 'React Fundamentals Quiz',
    questions: mockQuestions,
    currentQuestionIndex: 4,
    timeLimit: 600,
    timeRemaining: 180,
    onQuestionChange: () => {},
    onAnswerChange: () => {},
    onSubmit: () => alert('Submit clicked'),
    onExit: () => {},
  },
};

export const MultipleChoice: Story = {
  args: {
    id: 'assessment-1',
    title: 'React Fundamentals Quiz',
    questions: mockQuestions,
    currentQuestionIndex: 1,
    timeLimit: 600,
    timeRemaining: 300,
    onQuestionChange: () => {},
    onAnswerChange: () => {},
    onSubmit: () => {},
    onExit: () => {},
  },
};

export const NoTimer: Story = {
  args: {
    id: 'assessment-1',
    title: 'Practice Quiz',
    description: 'Take your time to answer the questions.',
    questions: mockQuestions,
    currentQuestionIndex: 0,
    onQuestionChange: () => {},
    onAnswerChange: () => {},
    onSubmit: () => {},
    onExit: () => {},
  },
};

export const Mobile: Story = {
  render: () => <InteractiveAssessment />,
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

