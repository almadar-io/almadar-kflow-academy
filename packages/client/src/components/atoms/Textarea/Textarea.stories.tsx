import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Atoms/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text displayed above the textarea',
    },
    helperText: {
      control: 'text',
      description: 'Helper text displayed below the textarea',
    },
    error: {
      control: 'text',
      description: 'Error message displayed below the textarea',
    },
    showCounter: {
      control: 'boolean',
      description: 'Show character counter',
    },
    maxLength: {
      control: 'number',
      description: 'Maximum character count',
    },
    autoResize: {
      control: 'boolean',
      description: 'Auto-resize textarea to fit content',
    },
    minRows: {
      control: 'number',
      description: 'Minimum number of rows',
    },
    maxRows: {
      control: 'number',
      description: 'Maximum number of rows',
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Message',
    placeholder: 'Enter your message...',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Description',
    helperText: 'Please provide a detailed description',
    placeholder: 'Enter description...',
  },
};

export const WithError: Story = {
  args: {
    label: 'Message',
    error: 'This field is required',
    placeholder: 'Enter your message...',
  },
};

export const WithCounter: Story = {
  args: {
    label: 'Bio',
    showCounter: true,
    maxLength: 200,
    placeholder: 'Tell us about yourself...',
  },
};

export const AutoResize: Story = {
  args: {
    label: 'Auto-resizing Textarea',
    autoResize: true,
    minRows: 3,
    maxRows: 10,
    placeholder: 'This textarea will grow as you type...',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Textarea',
    value: 'This textarea is disabled',
    disabled: true,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-md">
      <Textarea
        label="Default"
        placeholder="Default textarea"
      />
      <Textarea
        label="With Helper Text"
        helperText="This is helpful information"
        placeholder="Textarea with helper"
      />
      <Textarea
        label="With Error"
        error="This field has an error"
        placeholder="Textarea with error"
      />
      <Textarea
        label="With Counter"
        showCounter
        maxLength={100}
        placeholder="Type here..."
      />
      <Textarea
        label="Auto-resize"
        autoResize
        minRows={2}
        maxRows={6}
        placeholder="This grows as you type..."
      />
      <Textarea
        label="Disabled"
        value="This is disabled"
        disabled
      />
    </div>
  ),
};

