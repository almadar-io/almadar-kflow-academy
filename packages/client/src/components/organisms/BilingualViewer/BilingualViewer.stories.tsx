import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { BilingualViewer } from './BilingualViewer';

const meta: Meta<typeof BilingualViewer> = {
  title: 'Organisms/BilingualViewer',
  component: BilingualViewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[900px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BilingualViewer>;

const sampleOriginal = `# Understanding React Components

React components are the building blocks of any React application. They are independent, reusable pieces of code that return HTML elements.

## Functional Components

Functional components are JavaScript functions that return JSX:

\`\`\`jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}
\`\`\`

## Class Components

Class components extend React.Component and have a render method.`;

const sampleSpanish = `# Entendiendo los Componentes de React

Los componentes de React son los bloques de construcción de cualquier aplicación React. Son piezas de código independientes y reutilizables que devuelven elementos HTML.

## Componentes Funcionales

Los componentes funcionales son funciones de JavaScript que devuelven JSX:

\`\`\`jsx
function Welcome(props) {
  return <h1>Hola, {props.name}</h1>;
}
\`\`\`

## Componentes de Clase

Los componentes de clase extienden React.Component y tienen un método render.`;

const sampleArabic = `# فهم مكونات React

مكونات React هي اللبنات الأساسية لأي تطبيق React. وهي قطع من التعليمات البرمجية المستقلة والقابلة لإعادة الاستخدام التي تُرجع عناصر HTML.

## المكونات الوظيفية

المكونات الوظيفية هي دوال JavaScript تُرجع JSX:

\`\`\`jsx
function Welcome(props) {
  return <h1>مرحباً، {props.name}</h1>;
}
\`\`\`

## مكونات الفئات

تمتد مكونات الفئات من React.Component ولها طريقة render.`;

// Default side-by-side view
export const SideBySide: Story = {
  args: {
    title: 'React Components Guide',
    originalContent: sampleOriginal,
    translatedContent: sampleSpanish,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
    onRegenerate: () => alert('Regenerate clicked'),
  },
};

// RTL language (Arabic)
export const RTLLanguage: Story = {
  args: {
    title: 'دليل مكونات React',
    originalContent: sampleOriginal,
    translatedContent: sampleArabic,
    sourceLanguage: 'en',
    targetLanguage: 'ar',
    translatedAt: new Date(),
    onRegenerate: () => alert('Regenerate clicked'),
  },
};

// Stale translation
export const StaleTranslation: Story = {
  args: {
    title: 'Outdated Translation',
    originalContent: sampleOriginal,
    translatedContent: sampleSpanish,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    isStale: true,
    onRegenerate: () => alert('Regenerate clicked'),
  },
};

// Regenerating
export const Regenerating: Story = {
  args: {
    title: 'Refreshing Translation',
    originalContent: sampleOriginal,
    translatedContent: sampleSpanish,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
    isRegenerating: true,
    onRegenerate: () => {},
  },
};

// Original view mode
export const OriginalViewMode: Story = {
  args: {
    title: 'Original Content Only',
    originalContent: sampleOriginal,
    translatedContent: sampleSpanish,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
    initialViewMode: 'original',
  },
};

// Translated view mode
export const TranslatedViewMode: Story = {
  args: {
    title: 'Translated Content Only',
    originalContent: sampleOriginal,
    translatedContent: sampleSpanish,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
    initialViewMode: 'translated',
  },
};

// Without title
export const NoTitle: Story = {
  args: {
    originalContent: sampleOriginal,
    translatedContent: sampleSpanish,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
  },
};

// Without regenerate
export const NoRegenerate: Story = {
  args: {
    title: 'Read-only Content',
    originalContent: sampleOriginal,
    translatedContent: sampleSpanish,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    translatedAt: new Date(),
  },
};





