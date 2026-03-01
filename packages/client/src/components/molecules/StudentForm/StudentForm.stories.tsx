import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StudentForm } from './StudentForm';
import { mockStudents } from '../../__mocks__/studentMocks';

const meta: Meta<typeof StudentForm> = {
  title: 'Molecules/StudentForm',
  component: StudentForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Form for creating/editing students with name, email, and optional phone fields.',
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
type Story = StoryObj<typeof StudentForm>;

export const CreateMode: Story = {
  args: {
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const EditMode: Story = {
  args: {
    initialValues: {
      name: mockStudents[0].name,
      email: mockStudents[0].email,
      phone: mockStudents[0].phone,
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const WithErrors: Story = {
  args: {
    errors: {
      name: 'Name is required',
      email: 'Please enter a valid email address',
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

export const Prefilled: Story = {
  args: {
    initialValues: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const WithoutPhone: Story = {
  args: {
    initialValues: {
      name: mockStudents[2].name,
      email: mockStudents[2].email,
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};
