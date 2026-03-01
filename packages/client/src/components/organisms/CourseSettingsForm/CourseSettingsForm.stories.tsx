import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { CourseSettingsForm } from './CourseSettingsForm';

const meta: Meta<typeof CourseSettingsForm> = {
  title: 'Organisms/CourseSettingsForm',
  component: CourseSettingsForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Form for course settings configuration including title, description, visibility, and enrollment settings.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: {
      action: 'submitted',
      description: 'Callback when form is submitted',
    },
    onCancel: {
      action: 'cancelled',
      description: 'Callback when form is cancelled',
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof CourseSettingsForm>;

export const CreateMode: Story = {
  args: {
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const EditMode: Story = {
  args: {
    initialSettings: {
      title: 'Introduction to React',
      description: 'Learn the fundamentals of React development',
      visibility: 'public',
      enrollmentEnabled: true,
      maxStudents: 50,
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const PublicCourse: Story = {
  args: {
    initialSettings: {
      title: 'Public Course',
      description: 'This course is publicly visible',
      visibility: 'public',
      enrollmentEnabled: true,
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const PrivateCourse: Story = {
  args: {
    initialSettings: {
      title: 'Private Course',
      description: 'This course is private',
      visibility: 'private',
      enrollmentEnabled: false,
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const UnlistedCourse: Story = {
  args: {
    initialSettings: {
      title: 'Unlisted Course',
      description: 'This course is unlisted',
      visibility: 'unlisted',
      enrollmentEnabled: true,
      maxStudents: 20,
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const WithMaxStudents: Story = {
  args: {
    initialSettings: {
      title: 'Limited Enrollment Course',
      description: 'This course has a maximum enrollment limit',
      visibility: 'public',
      enrollmentEnabled: true,
      maxStudents: 30,
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const WithErrors: Story = {
  args: {
    errors: {
      title: 'Course title is required',
      maxStudents: 'Maximum students must be a positive number',
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    onSubmit: () => {},
    onCancel: () => {},
  },
};
