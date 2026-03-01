import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { TranslationBanner } from './TranslationBanner';

const meta: Meta<typeof TranslationBanner> = {
  title: 'Molecules/TranslationBanner',
  component: TranslationBanner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['translated', 'stale', 'translating', 'error', 'original'],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TranslationBanner>;

// Status variants
export const Translated: Story = {
  args: {
    status: 'translated',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
    onViewOriginal: () => alert('View original clicked'),
    onRegenerate: () => alert('Regenerate clicked'),
  },
};

export const Stale: Story = {
  args: {
    status: 'stale',
    sourceLanguage: 'en',
    targetLanguage: 'ar',
    translatedAt: new Date(Date.now() - 86400000 * 7), // 7 days ago
    onViewOriginal: () => alert('View original clicked'),
    onRegenerate: () => alert('Regenerate clicked'),
  },
};

export const Translating: Story = {
  args: {
    status: 'translating',
    sourceLanguage: 'en',
    targetLanguage: 'zh',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    sourceLanguage: 'en',
    targetLanguage: 'ja',
    onRegenerate: () => alert('Retry clicked'),
  },
};

export const Original: Story = {
  args: {
    status: 'original',
    sourceLanguage: 'en',
    targetLanguage: 'en',
  },
};

// With dismiss
export const Dismissible: Story = {
  args: {
    status: 'translated',
    sourceLanguage: 'en',
    targetLanguage: 'fr',
    translatedAt: new Date(),
    onDismiss: () => alert('Dismissed'),
  },
};

// Compact mode
export const Compact: Story = {
  args: {
    status: 'translated',
    sourceLanguage: 'en',
    targetLanguage: 'de',
    compact: true,
  },
};

export const CompactStale: Story = {
  args: {
    status: 'stale',
    sourceLanguage: 'en',
    targetLanguage: 'ar',
    compact: true,
  },
};

export const CompactTranslating: Story = {
  args: {
    status: 'translating',
    sourceLanguage: 'en',
    targetLanguage: 'ko',
    compact: true,
  },
};

// Regenerating state
export const Regenerating: Story = {
  args: {
    status: 'translated',
    sourceLanguage: 'en',
    targetLanguage: 'pt',
    translatedAt: new Date(),
    isRegenerating: true,
    onViewOriginal: () => {},
    onRegenerate: () => {},
  },
};

// All statuses
export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-4">
      <TranslationBanner
        status="translated"
        sourceLanguage="en"
        targetLanguage="es"
        translatedAt={new Date()}
        onViewOriginal={() => {}}
        onRegenerate={() => {}}
      />
      <TranslationBanner
        status="stale"
        sourceLanguage="en"
        targetLanguage="ar"
        translatedAt={new Date(Date.now() - 86400000 * 7)}
        onViewOriginal={() => {}}
        onRegenerate={() => {}}
      />
      <TranslationBanner
        status="translating"
        sourceLanguage="en"
        targetLanguage="zh"
      />
      <TranslationBanner
        status="error"
        sourceLanguage="en"
        targetLanguage="ja"
        onRegenerate={() => {}}
      />
      <TranslationBanner
        status="original"
        sourceLanguage="en"
        targetLanguage="en"
      />
    </div>
  ),
};

// Compact variants
export const AllCompact: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <TranslationBanner status="translated" sourceLanguage="en" targetLanguage="es" compact />
      <TranslationBanner status="stale" sourceLanguage="en" targetLanguage="ar" compact />
      <TranslationBanner status="translating" sourceLanguage="en" targetLanguage="zh" compact />
      <TranslationBanner status="error" sourceLanguage="en" targetLanguage="ja" compact />
      <TranslationBanner status="original" sourceLanguage="en" targetLanguage="en" compact />
    </div>
  ),
};
