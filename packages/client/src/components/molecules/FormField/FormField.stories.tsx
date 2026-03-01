import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { FormField } from './FormField';

const meta: Meta<typeof FormField> = {
  title: 'Molecules/FormField',
  component: FormField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const InputField: Story = {
  args: {
    type: 'input',
    label: 'Email',
    required: true,
    helperText: 'We will never share your email',
    inputProps: {
      type: 'email',
      placeholder: 'Enter your email',
    },
  },
};

export const InputFieldWithError: Story = {
  args: {
    type: 'input',
    label: 'Email',
    error: 'Please enter a valid email address',
    inputProps: {
      type: 'email',
      placeholder: 'Enter your email',
      value: 'invalid-email',
    },
  },
};

export const TextareaField: Story = {
  args: {
    type: 'textarea',
    label: 'Message',
    required: true,
    helperText: 'Please provide a detailed message',
    inputProps: {
      placeholder: 'Enter your message...',
      rows: 4,
    },
  },
};

export const CheckboxField: Story = {
  args: {
    type: 'checkbox',
    label: 'I agree to the terms and conditions',
    required: true,
    helperText: 'You must accept the terms to continue',
    inputProps: {
      checked: false,
    },
  },
};

export const RadioField: Story = {
  args: {
    type: 'radio',
    label: 'Option 1',
    inputProps: {
      name: 'options',
      value: 'option1',
      checked: true,
    },
  },
};

export const AllFieldTypes: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-md">
      <FormField
        type="input"
        label="Email Address"
        required
        helperText="Enter your email"
        inputProps={{
          type: 'email',
          placeholder: 'email@example.com',
        }}
      />
      <FormField
        type="textarea"
        label="Description"
        helperText="Provide a detailed description"
        inputProps={{
          placeholder: 'Enter description...',
          rows: 4,
        }}
      />
      <FormField
        type="checkbox"
        label="Accept terms"
        required
        inputProps={{
          checked: false,
        }}
      />
      <FormField
        type="radio"
        label="Select option"
        inputProps={{
          name: 'group',
          value: 'option1',
          checked: true,
        }}
      />
    </div>
  ),
};

