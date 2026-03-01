import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Input } from './Input';
import { Search, Mail } from 'lucide-react';
import { useState } from 'react';

const meta: Meta<typeof Input> = {
  title: 'Atoms/Input',
  component: Input,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A versatile input component with support for labels, errors, icons, and helper text. Fully accessible with proper ARIA attributes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'url', 'tel'],
      description: 'Input type',
    },
    label: {
      control: 'text',
      description: 'Label text (rendered above input)',
    },
    helperText: {
      control: 'text',
      description: 'Helper text (rendered below input)',
    },
    error: {
      control: 'text',
      description: 'Error message (rendered below input, overrides helperText)',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'you@example.com',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    helperText: 'Must be at least 8 characters',
    placeholder: 'Enter password',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    error: 'Please enter a valid email address',
    placeholder: 'you@example.com',
  },
};

export const WithIcon: Story = {
  args: {
    icon: Search,
    placeholder: 'Search...',
  },
};

export const WithRightIcon: Story = {
  args: {
    iconRight: Mail,
    placeholder: 'Email',
  },
};

export const Clearable: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        clearable
        onClear={() => setValue('')}
        placeholder="Type to search..."
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    value: 'This is disabled',
    disabled: true,
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Input type="text" label="Text" placeholder="Enter text" />
      <Input type="email" label="Email" placeholder="you@example.com" />
      <Input type="password" label="Password" placeholder="Enter password" />
      <Input type="number" label="Number" placeholder="Enter number" />
      <Input type="search" label="Search" placeholder="Search..." icon={Search} />
      <Input type="url" label="URL" placeholder="https://example.com" />
      <Input type="tel" label="Phone" placeholder="+1 (555) 000-0000" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Input label="Default" placeholder="Default state" />
      <Input label="With Helper Text" placeholder="Helper text" helperText="This is helpful information" />
      <Input label="With Error" placeholder="Error state" error="This field is required" />
      <Input label="Disabled" placeholder="Disabled" disabled value="Disabled value" />
    </div>
  ),
};

