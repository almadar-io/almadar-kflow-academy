import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Form } from './Form';
import { useState } from 'react';

const meta: Meta<typeof Form> = {
  title: 'Organisms/Form',
  component: Form,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Form>;

export const Simple: Story = {
  args: {
    title: 'Contact Form',
    description: 'Please fill out the form below.',
    fields: [
      {
        type: 'input',
        label: 'Name',
        required: true,
        inputProps: {
          type: 'text',
          placeholder: 'Enter your name',
        },
      },
      {
        type: 'input',
        label: 'Email',
        required: true,
        inputProps: {
          type: 'email',
          placeholder: 'Enter your email',
        },
      },
      {
        type: 'textarea',
        label: 'Message',
        inputProps: {
          placeholder: 'Enter your message',
          rows: 4,
        },
      },
    ],
    submitLabel: 'Send Message',
    showCancel: true,
    onSubmit: (data: Record<string, any>) => alert(`Form submitted: ${JSON.stringify(data)}`),
  },
};

export const MultiStep: Story = {
  args: {
    title: 'Multi-Step Form',
    steps: [
      {
        id: '1',
        title: 'Personal Information',
        description: 'Tell us about yourself',
        fields: [
          {
            type: 'input',
            label: 'First Name',
            required: true,
            inputProps: { type: 'text', placeholder: 'First name' },
          },
          {
            type: 'input',
            label: 'Last Name',
            required: true,
            inputProps: { type: 'text', placeholder: 'Last name' },
          },
        ],
      },
      {
        id: '2',
        title: 'Contact Details',
        description: 'How can we reach you?',
        fields: [
          {
            type: 'input',
            label: 'Email',
            required: true,
            inputProps: { type: 'email', placeholder: 'Email address' },
          },
          {
            type: 'input',
            label: 'Phone',
            inputProps: { type: 'tel', placeholder: 'Phone number' },
          },
        ],
      },
      {
        id: '3',
        title: 'Preferences',
        description: 'Tell us your preferences',
        fields: [
          {
            type: 'checkbox',
            label: 'I agree to the terms',
            required: true,
            inputProps: { label: 'Accept terms and conditions' },
          },
        ],
      },
    ],
    onSubmit: (data: Record<string, any>) => alert(`Form submitted: ${JSON.stringify(data)}`),
  },
};

export const WithErrors: Story = {
  args: {
    title: 'Form with Validation',
    fields: [
      {
        type: 'input',
        label: 'Email',
        required: true,
        inputProps: {
          type: 'email',
          placeholder: 'Enter your email',
        },
      },
    ],
    errors: {
      'field-0': 'Please enter a valid email address',
    },
    errorMessage: 'Please fix the errors below before submitting.',
    onSubmit: (data: Record<string, any>) => alert(`Form submitted: ${JSON.stringify(data)}`),
  },
};

export const Loading: Story = {
  args: {
    title: 'Submitting Form',
    fields: [
      {
        type: 'input',
        label: 'Name',
        inputProps: { type: 'text', placeholder: 'Enter your name' },
      },
    ],
    loading: true,
    submitLabel: 'Submitting...',
  },
};
