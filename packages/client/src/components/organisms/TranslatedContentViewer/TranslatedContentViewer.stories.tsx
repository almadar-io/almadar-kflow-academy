import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { TranslatedContentViewer } from './TranslatedContentViewer';

const meta: Meta<typeof TranslatedContentViewer> = {
  title: 'Organisms/TranslatedContentViewer',
  component: TranslatedContentViewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TranslatedContentViewer>;

const sampleOriginal = `# Introduction to React Hooks

React Hooks are a powerful feature introduced in React 16.8. They allow you to use state and other React features without writing a class.

## useState

The useState hook lets you add state to functional components:

\`\`\`javascript
const [count, setCount] = useState(0);
\`\`\`

## useEffect

The useEffect hook lets you perform side effects in functional components.`;

const sampleTranslated = `# Introducción a los Hooks de React

Los Hooks de React son una característica poderosa introducida en React 16.8. Te permiten usar el estado y otras características de React sin escribir una clase.

## useState

El hook useState te permite agregar estado a los componentes funcionales:

\`\`\`javascript
const [count, setCount] = useState(0);
\`\`\`

## useEffect

El hook useEffect te permite realizar efectos secundarios en componentes funcionales.`;

// Translated content
export const Translated: Story = {
  args: {
    title: 'React Hooks Introduction',
    originalContent: sampleOriginal,
    translatedContent: sampleTranslated,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
    onLanguageChange: (code) => alert(`Language changed to: ${code}`),
    onRegenerate: () => alert('Regenerate clicked'),
  },
};

// Original content (same language)
export const Original: Story = {
  args: {
    title: 'React Hooks Introduction',
    originalContent: sampleOriginal,
    sourceLanguage: 'en',
    targetLanguage: 'en',
  },
};

// Stale translation
export const Stale: Story = {
  args: {
    title: 'Outdated Translation',
    originalContent: sampleOriginal,
    translatedContent: sampleTranslated,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    isStale: true,
    onLanguageChange: (code) => alert(`Language changed to: ${code}`),
    onRegenerate: () => alert('Regenerate clicked'),
  },
};

// Translating
export const Translating: Story = {
  args: {
    title: 'Loading Translation',
    originalContent: sampleOriginal,
    sourceLanguage: 'en',
    targetLanguage: 'ar',
    isTranslating: true,
  },
};

// Error (no translation available)
export const NoTranslation: Story = {
  args: {
    title: 'Translation Not Available',
    originalContent: sampleOriginal,
    sourceLanguage: 'en',
    targetLanguage: 'ja',
    onLanguageChange: (code) => alert(`Language changed to: ${code}`),
    onRegenerate: () => alert('Translate clicked'),
  },
};

// Without language selector
export const NoLanguageSelector: Story = {
  args: {
    title: 'Fixed Language View',
    originalContent: sampleOriginal,
    translatedContent: sampleTranslated,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
    showLanguageSelector: false,
    onRegenerate: () => alert('Regenerate clicked'),
  },
};

// Limited languages
export const LimitedLanguages: Story = {
  args: {
    title: 'Limited Language Options',
    originalContent: sampleOriginal,
    translatedContent: sampleTranslated,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
    availableLanguages: [
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    ],
    onLanguageChange: (code) => alert(`Language changed to: ${code}`),
  },
};

// Without title
export const NoTitle: Story = {
  args: {
    originalContent: sampleOriginal,
    translatedContent: sampleTranslated,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
    onLanguageChange: (code) => alert(`Language changed to: ${code}`),
  },
};





