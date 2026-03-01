import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { DollarSign, MessageSquare, Award } from 'lucide-react';
import { MentorAnalyticsPanel } from './MentorAnalyticsPanel';

const meta: Meta<typeof MentorAnalyticsPanel> = {
  title: 'Organisms/MentorAnalyticsPanel',
  component: MentorAnalyticsPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MentorAnalyticsPanel>;

const sampleLanguageStats = [
  { language: 'en', name: 'English', studentCount: 850, percentage: 45 },
  { language: 'es', name: 'Spanish', studentCount: 420, percentage: 22 },
  { language: 'ar', name: 'Arabic', studentCount: 280, percentage: 15 },
  { language: 'zh', name: 'Chinese', studentCount: 190, percentage: 10 },
  { language: 'fr', name: 'French', studentCount: 150, percentage: 8 },
];

// Complete dashboard
export const Complete: Story = {
  args: {
    courseTitle: 'Introduction to React',
    totalEnrollments: 1890,
    enrollmentChange: 15,
    activeStudents: 456,
    activeChange: 8,
    completionRate: 72,
    completionChange: 3,
    averageRating: 4.7,
    ratingCount: 342,
    avgCompletionTime: 24,
    totalLessonsCompleted: 45230,
    languageStats: sampleLanguageStats,
    periodLabel: 'Last 30 days',
  },
};

// With custom metrics
export const WithCustomMetrics: Story = {
  args: {
    courseTitle: 'Advanced TypeScript',
    totalEnrollments: 876,
    enrollmentChange: 22,
    activeStudents: 234,
    activeChange: -5,
    completionRate: 65,
    completionChange: -2,
    averageRating: 4.5,
    ratingCount: 198,
    avgCompletionTime: 32,
    totalLessonsCompleted: 18500,
    periodLabel: 'Last 7 days',
    customMetrics: [
      {
        label: 'Revenue',
        value: '$12,450',
        change: 18,
        icon: DollarSign,
        iconColor: 'text-green-500',
      },
      {
        label: 'Discussion Posts',
        value: 1234,
        change: 25,
        icon: MessageSquare,
        iconColor: 'text-blue-500',
      },
      {
        label: 'Certificates',
        value: 567,
        change: 12,
        icon: Award,
        iconColor: 'text-orange-500',
      },
    ],
  },
};

// Without rating
export const WithoutRating: Story = {
  args: {
    courseTitle: 'New Course',
    totalEnrollments: 45,
    enrollmentChange: 100,
    activeStudents: 38,
    activeChange: 50,
    completionRate: 15,
    completionChange: 0,
    periodLabel: 'Last 7 days',
  },
};

// Declining metrics
export const DecliningMetrics: Story = {
  args: {
    courseTitle: 'Older Course',
    totalEnrollments: 2500,
    enrollmentChange: -8,
    activeStudents: 120,
    activeChange: -15,
    completionRate: 45,
    completionChange: -5,
    averageRating: 3.8,
    ratingCount: 890,
    avgCompletionTime: 40,
    totalLessonsCompleted: 65000,
    languageStats: [
      { language: 'en', name: 'English', studentCount: 2000, percentage: 80 },
      { language: 'es', name: 'Spanish', studentCount: 500, percentage: 20 },
    ],
    periodLabel: 'Last 30 days',
  },
};

// Minimal
export const Minimal: Story = {
  args: {
    totalEnrollments: 150,
    activeStudents: 45,
    completionRate: 60,
    periodLabel: 'All time',
  },
};

// High engagement
export const HighEngagement: Story = {
  args: {
    courseTitle: 'Popular Course',
    totalEnrollments: 15600,
    enrollmentChange: 25,
    activeStudents: 8900,
    activeChange: 18,
    completionRate: 89,
    completionChange: 5,
    averageRating: 4.9,
    ratingCount: 4500,
    avgCompletionTime: 18,
    totalLessonsCompleted: 250000,
    languageStats: sampleLanguageStats,
    periodLabel: 'Last 30 days',
  },
};

// New course (no changes)
export const NewCourse: Story = {
  args: {
    courseTitle: 'Just Launched',
    totalEnrollments: 12,
    activeStudents: 10,
    completionRate: 0,
    periodLabel: 'Since launch',
  },
};





