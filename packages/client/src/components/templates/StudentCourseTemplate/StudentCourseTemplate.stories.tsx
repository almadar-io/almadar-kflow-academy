import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { 
  Home, 
  BookOpen, 
  Award, 
  Settings, 
  User,
} from 'lucide-react';
import { StudentCourseTemplate } from './StudentCourseTemplate';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta = {
  title: 'Templates/StudentCourseTemplate',
  component: StudentCourseTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof StudentCourseTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultUser = {
  name: 'Alex Johnson',
  email: 'alex.j@email.com',
};

const defaultNavigation = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'courses', label: 'My Courses', icon: BookOpen, active: true },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const sampleInstructor = {
  id: 'inst-1',
  name: 'Dr. Sarah Chen',
  title: 'Professor of Computer Science',
};

const sampleModules = [
  {
    id: 'm1',
    title: 'Module 1: Introduction',
    description: 'Getting started with the fundamentals',
    lessons: [
      { id: 'l1', title: 'Welcome to the Course', duration: 5, status: 'completed' as const },
      { id: 'l2', title: 'Course Overview', duration: 10, status: 'completed' as const, hasFlashcards: true },
      { id: 'l3', title: 'Setting Up Your Environment', duration: 15, status: 'completed' as const },
    ],
  },
  {
    id: 'm2',
    title: 'Module 2: Core Concepts',
    description: 'Understanding the key principles',
    lessons: [
      { id: 'l4', title: 'Understanding Neural Networks', duration: 20, status: 'completed' as const, hasFlashcards: true, hasAssessment: true },
      { id: 'l5', title: 'Activation Functions', duration: 15, status: 'current' as const, hasFlashcards: true },
      { id: 'l6', title: 'Loss Functions', duration: 18, status: 'available' as const },
      { id: 'l7', title: 'Backpropagation', duration: 25, status: 'available' as const, hasAssessment: true },
    ],
  },
  {
    id: 'm3',
    title: 'Module 3: Advanced Topics',
    description: 'Diving deeper into complex concepts',
    lessons: [
      { id: 'l8', title: 'Convolutional Neural Networks', duration: 30, status: 'locked' as const, hasFlashcards: true, hasAssessment: true },
      { id: 'l9', title: 'Recurrent Neural Networks', duration: 30, status: 'locked' as const },
      { id: 'l10', title: 'Transformers', duration: 35, status: 'locked' as const, hasFlashcards: true },
    ],
    isLocked: true,
  },
  {
    id: 'm4',
    title: 'Module 4: Final Project',
    description: 'Apply what you\'ve learned',
    lessons: [
      { id: 'l11', title: 'Project Overview', duration: 10, status: 'locked' as const },
      { id: 'l12', title: 'Building Your Model', duration: 45, status: 'locked' as const },
      { id: 'l13', title: 'Final Assessment', duration: 30, status: 'locked' as const, hasAssessment: true },
    ],
    isLocked: true,
  },
];

const sampleLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

export const Default: Story = {
  args: {
    courseId: 'course-1',
    courseTitle: 'Introduction to Machine Learning',
    courseDescription: 'Learn the fundamentals of machine learning, from basic concepts to advanced neural network architectures.',
    instructor: sampleInstructor,
    user: defaultUser,
    navigationItems: defaultNavigation,
    modules: sampleModules,
    progress: 38,
    completedLessons: 5,
    totalLessons: 13,
    currentLessonId: 'l5',
    timeRemaining: 180,
    rating: 4.7,
    studentCount: 1234,
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    availableLanguages: sampleLanguages,
    selectedLanguage: 'en',
    onLanguageChange: (code) => alert(`Language changed to ${code}`),
    onLessonClick: (id) => alert(`Navigate to lesson ${id}`),
    onContinue: () => alert('Continue learning'),
    onBack: () => alert('Back to courses'),
  },
};

export const JustStarted: Story = {
  args: {
    ...Default.args,
    progress: 8,
    completedLessons: 1,
    currentLessonId: 'l2',
    timeRemaining: 320,
    modules: sampleModules.map((m, i) => ({
      ...m,
      lessons: m.lessons.map((l, j) => ({
        ...l,
        status: i === 0 && j === 0 
          ? 'completed' as const 
          : i === 0 && j === 1 
            ? 'current' as const 
            : i === 0 
              ? 'available' as const 
              : 'locked' as const,
      })),
      isLocked: i > 0,
    })),
  },
};

export const AlmostComplete: Story = {
  args: {
    ...Default.args,
    progress: 92,
    completedLessons: 12,
    currentLessonId: 'l13',
    timeRemaining: 30,
    modules: sampleModules.map(m => ({
      ...m,
      lessons: m.lessons.map((l, i) => ({
        ...l,
        status: l.id === 'l13' ? 'current' as const : 'completed' as const,
      })),
      isLocked: false,
    })),
  },
};

export const Completed: Story = {
  args: {
    ...Default.args,
    progress: 100,
    completedLessons: 13,
    totalLessons: 13,
    currentLessonId: undefined,
    timeRemaining: 0,
    modules: sampleModules.map(m => ({
      ...m,
      lessons: m.lessons.map(l => ({
        ...l,
        status: 'completed' as const,
      })),
      isLocked: false,
    })),
    onViewCertificate: () => alert('View certificate'),
  },
};

export const SingleLanguage: Story = {
  args: {
    ...Default.args,
    availableLanguages: [{ code: 'en', name: 'English', nativeName: 'English' }],
  },
};

export const WithArabic: Story = {
  args: {
    ...Default.args,
    selectedLanguage: 'ar',
  },
};

export const NoInstructor: Story = {
  args: {
    ...Default.args,
    instructor: undefined,
    courseDescription: undefined,
  },
};
