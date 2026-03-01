import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { DayOfWeekSelector } from './DayOfWeekSelector';

const meta: Meta<typeof DayOfWeekSelector> = {
  title: 'Atoms/DayOfWeekSelector',
  component: DayOfWeekSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A dropdown selector for selecting day of the week. Values are 0-6 where 0 is Sunday.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'select',
      options: ['0', '1', '2', '3', '4', '5', '6'],
      description: 'Selected day (0=Sunday, 6=Saturday)',
    },
    onChange: {
      action: 'changed',
      description: 'Callback when day changes',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable selector',
    },
    required: {
      control: 'boolean',
      description: 'Required field',
    },
  },
};

export default meta;
type Story = StoryObj<typeof DayOfWeekSelector>;

export const Default: Story = {
  args: {
    label: 'Day of Week',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Day of Week',
    value: '1', // Monday
  },
};

export const Monday: Story = {
  args: {
    label: 'Day of Week',
    value: '1',
  },
};

export const Friday: Story = {
  args: {
    label: 'Day of Week',
    value: '5',
  },
};

export const WithError: Story = {
  args: {
    label: 'Day of Week',
    error: 'Please select a day',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Day of Week',
    value: '1',
    helperText: 'Select the day for this schedule slot',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Day of Week',
    value: '1',
    disabled: true,
  },
};

export const Required: Story = {
  args: {
    label: 'Day of Week',
    required: true,
  },
};
