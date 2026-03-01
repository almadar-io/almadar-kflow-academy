import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { useState } from 'react';
import { Radio } from './Radio';

const meta: Meta<typeof Radio> = {
  title: 'Atoms/Radio',
  component: Radio,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
    },
    helperText: {
      control: 'text',
    },
    error: {
      control: 'text',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Radio>;

export const Default: Story = {
  args: {
    label: 'Option 1',
  },
};

export const Checked: Story = {
  args: {
    label: 'Selected option',
    checked: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Premium plan',
    helperText: 'Includes all features and priority support',
  },
};

export const WithError: Story = {
  args: {
    label: 'Required option',
    error: 'Please select an option',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled option',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: 'Disabled selected',
    checked: true,
    disabled: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Radio label="Small radio" size="sm" />
      <Radio label="Medium radio" size="md" />
      <Radio label="Large radio" size="lg" />
    </div>
  ),
};

export const RadioGroup: Story = {
  render: () => {
    const [selected, setSelected] = useState('option1');
    return (
      <div className="space-y-3">
        <Radio
          label="Option 1"
          name="group"
          value="option1"
          checked={selected === 'option1'}
          onChange={(e) => setSelected(e.target.value)}
        />
        <Radio
          label="Option 2"
          name="group"
          value="option2"
          checked={selected === 'option2'}
          onChange={(e) => setSelected(e.target.value)}
        />
        <Radio
          label="Option 3"
          name="group"
          value="option3"
          checked={selected === 'option3'}
          onChange={(e) => setSelected(e.target.value)}
        />
      </div>
    );
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-md">
      <Radio label="Default unselected" />
      <Radio label="Selected" checked />
      <Radio label="With helper text" helperText="This is helpful information" />
      <Radio label="With error" error="This field has an error" />
      <Radio label="Disabled" disabled />
      <Radio label="Disabled selected" checked disabled />
    </div>
  ),
};

