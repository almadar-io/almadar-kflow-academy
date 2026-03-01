import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { EnrollmentToggle } from './EnrollmentToggle';

const meta: Meta<typeof EnrollmentToggle> = {
  title: 'Molecules/EnrollmentToggle',
  component: EnrollmentToggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Toggle component for enrolling/unenrolling students in courses.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isEnrolled: {
      control: 'boolean',
      description: 'Whether student is enrolled',
    },
    onToggle: {
      action: 'toggled',
      description: 'Callback when toggle is clicked',
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading state',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable toggle',
    },
  },
};

export default meta;
type Story = StoryObj<typeof EnrollmentToggle>;

export const NotEnrolled: Story = {
  args: {
    studentId: 'student-1',
    courseId: 'course-1',
    isEnrolled: false,
    onToggle: () => {},
  },
};

export const Enrolled: Story = {
  args: {
    studentId: 'student-1',
    courseId: 'course-1',
    isEnrolled: true,
    onToggle: () => {},
  },
};

export const Loading: Story = {
  args: {
    studentId: 'student-1',
    courseId: 'course-1',
    isEnrolled: false,
    isLoading: true,
    onToggle: () => {},
  },
};

export const LoadingEnrolled: Story = {
  args: {
    studentId: 'student-1',
    courseId: 'course-1',
    isEnrolled: true,
    isLoading: true,
    onToggle: () => {},
  },
};

export const Disabled: Story = {
  args: {
    studentId: 'student-1',
    courseId: 'course-1',
    isEnrolled: false,
    disabled: true,
    onToggle: () => {},
  },
};

export const DisabledEnrolled: Story = {
  args: {
    studentId: 'student-1',
    courseId: 'course-1',
    isEnrolled: true,
    disabled: true,
    onToggle: () => {},
  },
};
