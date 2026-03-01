import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ScheduleTimeInput } from './ScheduleTimeInput';

const meta: Meta<typeof ScheduleTimeInput> = {
  title: 'Atoms/ScheduleTimeInput',
  component: ScheduleTimeInput,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A time picker input component for schedule slots. Uses HTML5 time input with validation.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'Time value in HH:mm format',
    },
    onChange: {
      action: 'changed',
      description: 'Callback when time changes',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable input',
    },
    required: {
      control: 'boolean',
      description: 'Required field',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScheduleTimeInput>;

export const Default: Story = {
  args: {
    label: 'Start Time',
    value: '09:00',
  },
};

export const WithValue: Story = {
  args: {
    label: 'End Time',
    value: '17:30',
  },
};

export const Empty: Story = {
  args: {
    label: 'Time',
    value: '',
    placeholder: 'Select time',
  },
};

export const WithError: Story = {
  args: {
    label: 'Time',
    value: '25:00',
    error: 'Invalid time format',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Time',
    value: '10:00',
    helperText: 'Select the start time for this schedule slot',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Time',
    value: '14:00',
    disabled: true,
  },
};

export const Required: Story = {
  args: {
    label: 'Time',
    value: '',
    required: true,
  },
};
