import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { SelectDropdown } from './SelectDropdown';

const meta: Meta<typeof SelectDropdown> = {
  title: 'Molecules/SelectDropdown',
  component: SelectDropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SelectDropdown>;

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
  { value: '4', label: 'Option 4' },
  { value: '5', label: 'Option 5' },
];

export const Default: Story = {
  args: {
    options,
    placeholder: 'Select an option...',
  },
};

export const WithValue: Story = {
  args: {
    options,
    value: '2',
    placeholder: 'Select an option...',
  },
};

export const Multiple: Story = {
  args: {
    options,
    multiple: true,
    value: ['1', '3'],
    placeholder: 'Select options...',
  },
};

export const Searchable: Story = {
  args: {
    options: [
      { value: '1', label: 'Apple' },
      { value: '2', label: 'Banana' },
      { value: '3', label: 'Cherry' },
      { value: '4', label: 'Date' },
      { value: '5', label: 'Elderberry' },
    ],
    searchable: true,
    placeholder: 'Search and select...',
  },
};

export const WithGroups: Story = {
  args: {
    options: [
      { value: '1', label: 'Apple', group: 'Fruits' },
      { value: '2', label: 'Banana', group: 'Fruits' },
      { value: '3', label: 'Carrot', group: 'Vegetables' },
      { value: '4', label: 'Potato', group: 'Vegetables' },
      { value: '5', label: 'Chicken', group: 'Meat' },
    ],
    placeholder: 'Select an option...',
  },
};

export const Disabled: Story = {
  args: {
    options: [
      { value: '1', label: 'Enabled Option' },
      { value: '2', label: 'Disabled Option', disabled: true },
      { value: '3', label: 'Another Enabled' },
    ],
    disabled: true,
    placeholder: 'Disabled select...',
  },
};

export const Clearable: Story = {
  args: {
    options,
    value: '2',
    clearable: true,
    placeholder: 'Select an option...',
  },
};

export const AllFeatures: Story = {
  args: {
    options: [
      { value: '1', label: 'Option 1', group: 'Group A' },
      { value: '2', label: 'Option 2', group: 'Group A' },
      { value: '3', label: 'Option 3', group: 'Group B' },
      { value: '4', label: 'Option 4', group: 'Group B' },
    ],
    multiple: true,
    searchable: true,
    clearable: true,
    value: ['1', '3'],
    placeholder: 'Search and select multiple...',
  },
};
