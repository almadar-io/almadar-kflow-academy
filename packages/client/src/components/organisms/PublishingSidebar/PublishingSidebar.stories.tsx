import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { PublishingSidebar } from './PublishingSidebar';

const meta: Meta<typeof PublishingSidebar> = {
  title: 'Organisms/PublishingSidebar',
  component: PublishingSidebar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PublishingSidebar>;

const defaultStats = {
  modulesReady: 3,
  modulesTotal: 5,
  lessonsReady: 12,
  lessonsTotal: 15,
  flashcardsReady: 8,
  flashcardsTotal: 10,
  quizzesReady: 4,
  quizzesTotal: 5,
};

// Draft course
export const Draft: Story = {
  args: {
    courseTitle: 'Introduction to React',
    isPublished: false,
    visibility: 'private',
    stats: defaultStats,
    onPublishToggle: () => alert('Publish clicked'),
    onSettings: () => alert('Settings clicked'),
    onPreview: () => alert('Preview clicked'),
  },
};

// Published course
export const Published: Story = {
  args: {
    courseTitle: 'JavaScript Fundamentals',
    isPublished: true,
    visibility: 'public',
    stats: {
      modulesReady: 5,
      modulesTotal: 5,
      lessonsReady: 20,
      lessonsTotal: 20,
      flashcardsReady: 15,
      flashcardsTotal: 15,
      quizzesReady: 5,
      quizzesTotal: 5,
    },
    enrollmentCount: 247,
    onPublishToggle: () => alert('Unpublish clicked'),
    onSettings: () => alert('Settings clicked'),
    onPreview: () => alert('Preview clicked'),
  },
};

// Unlisted course
export const Unlisted: Story = {
  args: {
    courseTitle: 'Advanced TypeScript',
    isPublished: true,
    visibility: 'unlisted',
    stats: {
      modulesReady: 4,
      modulesTotal: 4,
      lessonsReady: 16,
      lessonsTotal: 16,
      flashcardsReady: 12,
      flashcardsTotal: 12,
      quizzesReady: 4,
      quizzesTotal: 4,
    },
    enrollmentCount: 42,
    onPublishToggle: () => alert('Unpublish clicked'),
    onSettings: () => alert('Settings clicked'),
    onPreview: () => alert('Preview clicked'),
  },
};

// Low readiness
export const LowReadiness: Story = {
  args: {
    courseTitle: 'New Course in Progress',
    isPublished: false,
    visibility: 'private',
    stats: {
      modulesReady: 1,
      modulesTotal: 5,
      lessonsReady: 3,
      lessonsTotal: 15,
      flashcardsReady: 0,
      flashcardsTotal: 10,
      quizzesReady: 0,
      quizzesTotal: 5,
    },
    onPublishToggle: () => alert('Publish clicked'),
    onSettings: () => alert('Settings clicked'),
    onPreview: () => alert('Preview clicked'),
  },
};

// With selected items
export const WithSelectedItems: Story = {
  args: {
    courseTitle: 'Python Basics',
    isPublished: false,
    visibility: 'private',
    stats: defaultStats,
    selectedItems: ['lesson-1', 'lesson-2', 'lesson-3'],
    onPublishSelected: () => alert('Publish selected clicked'),
    onSettings: () => alert('Settings clicked'),
  },
};

// Publishing in progress
export const Publishing: Story = {
  args: {
    courseTitle: 'Machine Learning 101',
    isPublished: false,
    visibility: 'public',
    stats: {
      modulesReady: 5,
      modulesTotal: 5,
      lessonsReady: 20,
      lessonsTotal: 20,
      flashcardsReady: 15,
      flashcardsTotal: 15,
      quizzesReady: 5,
      quizzesTotal: 5,
    },
    isPublishing: true,
    onPublishToggle: () => {},
    onSettings: () => alert('Settings clicked'),
  },
};

// Empty course
export const Empty: Story = {
  args: {
    courseTitle: 'Empty Course',
    isPublished: false,
    visibility: 'private',
    stats: {
      modulesReady: 0,
      modulesTotal: 0,
      lessonsReady: 0,
      lessonsTotal: 0,
      flashcardsReady: 0,
      flashcardsTotal: 0,
      quizzesReady: 0,
      quizzesTotal: 0,
    },
    onPublishToggle: () => alert('Publish clicked'),
    onSettings: () => alert('Settings clicked'),
  },
};
