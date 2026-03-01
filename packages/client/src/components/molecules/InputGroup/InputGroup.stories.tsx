import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { InputGroup } from './InputGroup';
import { Button } from '../../atoms/Button';
import { Search, Mail, DollarSign } from 'lucide-react';

const meta: Meta<typeof InputGroup> = {
  title: 'Molecules/InputGroup',
  component: InputGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InputGroup>;

export const WithLeftIcon: Story = {
  args: {
    leftAddon: Search,
    placeholder: 'Search...',
  },
};

export const WithRightIcon: Story = {
  args: {
    rightAddon: Mail,
    placeholder: 'Email address',
  },
};

export const WithTextAddon: Story = {
  args: {
    leftAddon: 'https://',
    placeholder: 'example.com',
  },
};

export const WithButton: Story = {
  args: {
    placeholder: 'Enter amount',
    leftAddon: <Button variant="secondary" size="sm">$</Button>,
  },
};

export const BothSides: Story = {
  args: {
    leftAddon: DollarSign,
    rightAddon: <Button variant="primary" size="sm">Submit</Button>,
    placeholder: 'Amount',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <InputGroup leftAddon={Search} placeholder="Search with icon" />
      <InputGroup rightAddon={Mail} placeholder="Email with icon" />
      <InputGroup leftAddon="https://" placeholder="URL with text" />
      <InputGroup
        leftAddon={<Button variant="secondary" size="sm">$</Button>}
        placeholder="Amount with button"
      />
    </div>
  ),
};
