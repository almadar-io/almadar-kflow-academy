import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { DollarSign, MessageSquare } from 'lucide-react';
import { CourseStatsCard } from './CourseStatsCard';

const meta: Meta<typeof CourseStatsCard> = {
  title: 'Organisms/CourseStatsCard',
  component: CourseStatsCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CourseStatsCard>;

// Compact variant
export const Compact: Story = {
  args: {
    title: 'Course Statistics',
    enrollmentCount: 1234,
    enrollmentChange: 12,
    completionRate: 78,
    completionChange: 5,
    averageRating: 4.7,
    ratingCount: 342,
    variant: 'compact',
  },
};

// Compact without rating
export const CompactNoRating: Story = {
  args: {
    title: 'Course Statistics',
    enrollmentCount: 567,
    enrollmentChange: -3,
    completionRate: 45,
    completionChange: 8,
    variant: 'compact',
  },
};

// Detailed variant
export const Detailed: Story = {
  args: {
    title: 'Introduction to React',
    enrollmentCount: 2456,
    enrollmentChange: 18,
    completionRate: 82,
    completionChange: 3,
    averageRating: 4.8,
    ratingCount: 892,
    lessonsCompleted: 45230,
    avgCompletionTime: 24,
    certificatesIssued: 1892,
    variant: 'detailed',
  },
};

// Detailed with custom stats
export const DetailedWithCustomStats: Story = {
  args: {
    title: 'Advanced TypeScript',
    enrollmentCount: 876,
    enrollmentChange: 25,
    completionRate: 65,
    completionChange: -2,
    averageRating: 4.5,
    ratingCount: 234,
    lessonsCompleted: 12340,
    avgCompletionTime: 18,
    certificatesIssued: 543,
    variant: 'detailed',
    customStats: [
      {
        label: 'Revenue',
        value: '$12,450',
        icon: DollarSign,
        iconColor: 'text-green-500',
        change: 15,
        changePeriod: 'last month',
      },
      {
        label: 'Discussion Posts',
        value: 1234,
        icon: MessageSquare,
        iconColor: 'text-blue-500',
      },
    ],
  },
};

// Low numbers (new course)
export const NewCourse: Story = {
  args: {
    title: 'New Course',
    enrollmentCount: 12,
    completionRate: 0,
    variant: 'compact',
  },
};

// High numbers
export const HighNumbers: Story = {
  args: {
    title: 'Popular Course',
    enrollmentCount: 156789,
    enrollmentChange: 8,
    completionRate: 91,
    completionChange: 2,
    averageRating: 4.9,
    ratingCount: 45678,
    variant: 'compact',
  },
};

// Negative changes
export const NegativeChanges: Story = {
  args: {
    title: 'Declining Course',
    enrollmentCount: 456,
    enrollmentChange: -15,
    completionRate: 34,
    completionChange: -8,
    averageRating: 3.2,
    ratingCount: 123,
    variant: 'detailed',
    lessonsCompleted: 5670,
    avgCompletionTime: 32,
    certificatesIssued: 98,
  },
};

// Perfect rating
export const PerfectRating: Story = {
  args: {
    title: 'Top Rated Course',
    enrollmentCount: 789,
    completionRate: 95,
    averageRating: 5.0,
    ratingCount: 234,
    variant: 'compact',
  },
};





