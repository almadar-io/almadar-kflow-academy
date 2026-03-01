import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { LessonViewTemplate } from './LessonViewTemplate';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof LessonViewTemplate> = {
  title: 'Templates/LessonViewTemplate',
  component: LessonViewTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LessonViewTemplate>;

const mockModules = [
  {
    id: 'm1',
    title: 'Getting Started',
    lessons: [
      { id: 'l1', title: 'Introduction', status: 'completed' as const, duration: 10 },
      { id: 'l2', title: 'Setup', status: 'completed' as const, duration: 15 },
      { id: 'l3', title: 'First Steps', status: 'current' as const, duration: 20 },
    ],
    expanded: true,
  },
  {
    id: 'm2',
    title: 'Core Concepts',
    lessons: [
      { id: 'l4', title: 'Components', status: 'upcoming' as const, duration: 25 },
      { id: 'l5', title: 'Props', status: 'upcoming' as const, duration: 20 },
    ],
  },
];

const mockContent = `
<h2>Understanding React Components</h2>
<p>React components are the building blocks of any React application. They let you split the UI into independent, reusable pieces, and think about each piece in isolation.</p>

<h3>Functional Components</h3>
<p>The simplest way to define a component is to write a JavaScript function:</p>

<pre><code>function Welcome(props) {
  return &lt;h1&gt;Hello, {props.name}&lt;/h1&gt;;
}</code></pre>

<p>This function is a valid React component because it accepts a single "props" object argument with data and returns a React element.</p>

<h3>Key Points</h3>
<ul>
  <li>Components can be functions or classes</li>
  <li>They accept inputs called "props"</li>
  <li>They return React elements describing what should appear on screen</li>
</ul>

<blockquote>
  <p><strong>Note:</strong> Always start component names with a capital letter. React treats components starting with lowercase letters as DOM tags.</p>
</blockquote>

<h3>Composing Components</h3>
<p>Components can refer to other components in their output. This lets us use the same component abstraction for any level of detail.</p>
`;

const mockFlashcards = [
  {
    id: '1',
    question: 'What are React components?',
    answer: 'Building blocks of React applications that let you split UI into independent, reusable pieces.',
  },
  {
    id: '2',
    question: 'What do components accept as input?',
    answer: 'Props - a single object argument containing data passed to the component.',
  },
  {
    id: '3',
    question: 'Why should component names start with a capital letter?',
    answer: 'React treats components starting with lowercase letters as DOM tags.',
  },
];

const mockBreadcrumbs = [
  { label: 'Courses', href: '/courses' },
  { label: 'React Fundamentals', href: '/courses/react' },
  { label: 'First Steps' },
];

export const Default: Story = {
  args: {
    id: 'l3',
    title: 'Understanding React Components',
    content: mockContent,
    duration: 20,
    courseTitle: 'React Fundamentals',
    courseProgress: 35,
    modules: mockModules,
    currentLessonId: 'l3',
    flashcards: mockFlashcards,
    breadcrumbs: mockBreadcrumbs,
    hasPreviousLesson: true,
    hasNextLesson: true,
    readingProgress: 45,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
    onPreviousLesson: () => console.log('Previous lesson'),
    onNextLesson: () => console.log('Next lesson'),
    onComplete: () => console.log('Complete lesson'),
    onLessonClick: (id: string) => console.log('Lesson clicked:', id),
  },
};

export const Completed: Story = {
  args: {
    ...Default.args,
    isCompleted: true,
    readingProgress: 100,
  },
};

export const FirstLesson: Story = {
  args: {
    ...Default.args,
    hasPreviousLesson: false,
    currentLessonId: 'l1',
  },
};

export const LastLesson: Story = {
  args: {
    ...Default.args,
    hasNextLesson: false,
    currentLessonId: 'l5',
  },
};

export const WithoutFlashcards: Story = {
  args: {
    ...Default.args,
    flashcards: [],
  },
};

export const Mobile: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

const sampleLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

const translatedContent = `
<h2>Comprender los Componentes de React</h2>
<p>Los componentes de React son los bloques de construcción de cualquier aplicación React. Te permiten dividir la interfaz de usuario en piezas independientes y reutilizables, y pensar en cada pieza de forma aislada.</p>

<h3>Componentes Funcionales</h3>
<p>La forma más simple de definir un componente es escribir una función JavaScript:</p>

<pre><code>function Welcome(props) {
  return &lt;h1&gt;Hola, {props.name}&lt;/h1&gt;;
}</code></pre>

<p>Esta función es un componente React válido porque acepta un único argumento de objeto "props" con datos y devuelve un elemento React.</p>

<h3>Puntos Clave</h3>
<ul>
  <li>Los componentes pueden ser funciones o clases</li>
  <li>Aceptan entradas llamadas "props"</li>
  <li>Devuelven elementos React que describen lo que debería aparecer en pantalla</li>
</ul>

<blockquote>
  <p><strong>Nota:</strong> Siempre comienza los nombres de componentes con una letra mayúscula. React trata los componentes que empiezan con minúsculas como etiquetas DOM.</p>
</blockquote>

<h3>Composición de Componentes</h3>
<p>Los componentes pueden referirse a otros componentes en su salida. Esto nos permite usar la misma abstracción de componentes para cualquier nivel de detalle.</p>
`;

export const WithTranslation: Story = {
  args: {
    ...Default.args,
    availableLanguages: sampleLanguages,
    sourceLanguage: 'en',
    selectedLanguage: 'es',
    translatedContent: translatedContent,
    translationStatus: 'translated',
    translatedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    onLanguageChange: (code) => console.log('Language changed to:', code),
    onRegenerateTranslation: () => console.log('Regenerate translation'),
  },
};

export const TranslationLoading: Story = {
  args: {
    ...Default.args,
    availableLanguages: sampleLanguages,
    sourceLanguage: 'en',
    selectedLanguage: 'es',
    translationStatus: 'translating',
    onLanguageChange: (code) => console.log('Language changed to:', code),
  },
};

export const StaleTranslation: Story = {
  args: {
    ...Default.args,
    availableLanguages: sampleLanguages,
    sourceLanguage: 'en',
    selectedLanguage: 'es',
    translatedContent: translatedContent,
    translationStatus: 'stale',
    translatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    onLanguageChange: (code) => console.log('Language changed to:', code),
    onRegenerateTranslation: () => console.log('Regenerate translation'),
  },
};

export const BilingualMode: Story = {
  args: {
    ...Default.args,
    availableLanguages: sampleLanguages,
    sourceLanguage: 'en',
    selectedLanguage: 'es',
    translatedContent: translatedContent,
    translationStatus: 'translated',
    showBilingualToggle: true,
    isBilingualMode: true,
    onLanguageChange: (code) => console.log('Language changed to:', code),
    onBilingualModeToggle: (enabled) => console.log('Bilingual mode:', enabled),
  },
};

export const MultipleLanguages: Story = {
  args: {
    ...Default.args,
    availableLanguages: sampleLanguages,
    sourceLanguage: 'en',
    selectedLanguage: 'en',
    onLanguageChange: (code) => console.log('Language changed to:', code),
  },
};

