import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StudentLessonView } from './StudentLessonView';
import { Typography } from '../../atoms/Typography';

const meta: Meta<typeof StudentLessonView> = {
  title: 'Organisms/StudentLessonView',
  component: StudentLessonView,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StudentLessonView>;

export const Default: Story = {
  args: {
    id: '1',
    title: 'Introduction to React',
    description: 'Learn the fundamentals of React and component-based development.',
    content: (
      <div className="space-y-4">
        <Typography variant="body">
          React is a JavaScript library for building user interfaces. In this lesson, you'll learn
          about components, props, and state.
        </Typography>
        <Typography variant="body">
          Components are the building blocks of React applications. They allow you to split
          the UI into independent, reusable pieces.
        </Typography>
      </div>
    ),
    progress: 60,
    onPrevious: () => alert('Previous lesson'),
    onNext: () => alert('Next lesson'),
  },
};

export const WithFlashcards: Story = {
  args: {
    id: '2',
    title: 'React Hooks',
    description: 'Understanding React hooks and their usage.',
    content: (
      <Typography variant="body">
        React Hooks are functions that let you use state and other React features in functional components.
      </Typography>
    ),
    flashcards: [
      { id: '1', front: 'What is useState?', back: 'A hook that allows you to add state to functional components.' },
      { id: '2', front: 'What is useEffect?', back: 'A hook that lets you perform side effects in functional components.' },
    ],
    progress: 40,
    onNext: () => alert('Next lesson'),
  },
};

export const WithAssessment: Story = {
  args: {
    id: '3',
    title: 'State Management',
    description: 'Learn how to manage state in React applications.',
    content: (
      <Typography variant="body">
        State management is crucial for building complex React applications.
      </Typography>
    ),
    assessment: {
      questions: [
        {
          id: '1',
          question: 'What is state in React?',
          type: 'single-choice',
          options: [
            { id: '1', label: 'A way to store data', value: 'storage' },
            { id: '2', label: 'A component property', value: 'prop' },
          ],
        },
      ],
    },
    progress: 80,
    onNext: () => alert('Next lesson'),
  },
};

export const Completed: Story = {
  args: {
    id: '4',
    title: 'Completed Lesson',
    description: 'This lesson has been completed.',
    content: (
      <Typography variant="body">
        Congratulations! You've completed this lesson.
      </Typography>
    ),
    progress: 100,
    completed: true,
    onPrevious: () => alert('Previous lesson'),
    onNext: () => alert('Next lesson'),
  },
};

export const Complete: Story = {
  args: {
    id: '5',
    title: 'Complete Lesson View',
    description: 'A complete lesson with all features.',
    content: (
      <div className="space-y-4">
        <Typography variant="h6">Section 1</Typography>
        <Typography variant="body">
          This is the lesson content with multiple sections.
        </Typography>
      </div>
    ),
    flashcards: [
      { id: '1', front: 'Question 1', back: 'Answer 1' },
    ],
    assessment: {
      questions: [
        {
          id: '1',
          question: 'Test question?',
          type: 'single-choice',
          options: [
            { id: '1', label: 'Option A', value: 'a' },
            { id: '2', label: 'Option B', value: 'b' },
          ],
        },
      ],
    },
    progress: 75,
    onPrevious: () => alert('Previous'),
    onNext: () => alert('Next'),
    onComplete: () => alert('Completed'),
  },
};
