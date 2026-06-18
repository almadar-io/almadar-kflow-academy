import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { useState } from 'react';
import { LanguageSelector, DEFAULT_LANGUAGES } from './LanguageSelector';

const meta: Meta<typeof LanguageSelector> = {
  title: 'Molecules/LanguageSelector',
  component: LanguageSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LanguageSelector>;

// Default
export const Default: Story = {
  args: {
    languages: DEFAULT_LANGUAGES,
    placeholder: 'Select a language',
  },
};

// With selection
export const WithSelection: Story = {
  args: {
    languages: DEFAULT_LANGUAGES,
    value: 'es',
  },
};

// RTL Language Selected
export const RTLLanguage: Story = {
  args: {
    languages: DEFAULT_LANGUAGES,
    value: 'ar',
  },
};

// Without native names
export const WithoutNativeNames: Story = {
  args: {
    languages: DEFAULT_LANGUAGES,
    value: 'fr',
    showNativeName: false,
  },
};

// Sizes
export const Small: Story = {
  args: {
    languages: DEFAULT_LANGUAGES,
    value: 'en',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    languages: DEFAULT_LANGUAGES,
    value: 'en',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    languages: DEFAULT_LANGUAGES,
    value: 'en',
    size: 'lg',
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    languages: DEFAULT_LANGUAGES,
    value: 'en',
    disabled: true,
  },
};

// Limited languages
export const LimitedLanguages: Story = {
  args: {
    languages: [
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', flag: '🇸🇦' },
    ],
    value: 'en',
  },
};

// Interactive
export const Interactive: Story = {
  render: function Render() {
    const [value, setValue] = useState('en');
    return (
      <div className="space-y-4">
        <LanguageSelector
          languages={DEFAULT_LANGUAGES}
          value={value}
          onChange={setValue}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Selected: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{value}</code>
        </p>
      </div>
    );
  },
};

// All sizes comparison
export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500 mb-1">Small</p>
        <LanguageSelector languages={DEFAULT_LANGUAGES} value="en" size="sm" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Medium</p>
        <LanguageSelector languages={DEFAULT_LANGUAGES} value="en" size="md" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Large</p>
        <LanguageSelector languages={DEFAULT_LANGUAGES} value="en" size="lg" />
      </div>
    </div>
  ),
};
