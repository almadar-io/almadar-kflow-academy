import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Typography, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Body, Small, Large, Code, Blockquote } from './Typography';

const meta: Meta<typeof Typography> = {
  title: 'Atoms/Typography',
  component: Typography,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Typography components for consistent text styling across the application. Includes headings, body text, links, code, and blockquotes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'small', 'large', 'code', 'blockquote'],
      description: 'Typography variant',
    },
    color: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'muted'],
      description: 'Text color variant',
    },
    weight: {
      control: 'select',
      options: ['light', 'normal', 'medium', 'semibold', 'bold'],
      description: 'Font weight',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Typography>;

export const Headings: Story = {
  render: () => (
    <div className="space-y-4">
      <Heading1>Heading 1</Heading1>
      <Heading2>Heading 2</Heading2>
      <Heading3>Heading 3</Heading3>
      <Heading4>Heading 4</Heading4>
      <Heading5>Heading 5</Heading5>
      <Heading6>Heading 6</Heading6>
    </div>
  ),
};

export const BodyText: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <Body>
        This is body text. It's the default text style used for most content in the application.
        It provides a comfortable reading experience with appropriate line height and spacing.
      </Body>
      <Large>
        This is large body text. It's used for emphasized content or introductory paragraphs.
        The increased size and relaxed line height make it perfect for important information.
      </Large>
      <Small>
        This is small text. It's used for captions, metadata, or secondary information that
        doesn't need as much emphasis.
      </Small>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="space-y-2">
      <Typography color="default">Default color</Typography>
      <Typography color="primary">Primary color</Typography>
      <Typography color="secondary">Secondary color</Typography>
      <Typography color="success">Success color</Typography>
      <Typography color="warning">Warning color</Typography>
      <Typography color="error">Error color</Typography>
      <Typography color="muted">Muted color</Typography>
    </div>
  ),
};

export const Weights: Story = {
  render: () => (
    <div className="space-y-2">
      <Typography weight="light">Light weight text</Typography>
      <Typography weight="normal">Normal weight text</Typography>
      <Typography weight="medium">Medium weight text</Typography>
      <Typography weight="semibold">Semibold weight text</Typography>
      <Typography weight="bold">Bold weight text</Typography>
    </div>
  ),
};

export const CodeExample: Story = {
  render: () => (
    <div className="space-y-4">
      <Body>
        You can use inline <Code>code</Code> within text, or display code blocks.
      </Body>
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Code className="block">
          {`function greet(name: string) {
  return \`Hello, \${name}!\`;
}`}
        </Code>
      </div>
    </div>
  ),
};

export const BlockquoteExample: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Blockquote>
        "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle."
      </Blockquote>
    </div>
  ),
};

export const TypographyScale: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <Heading1>Typography Scale</Heading1>
        <Body color="secondary">
          A comprehensive overview of all typography variants and their use cases.
        </Body>
      </div>
      
      <div className="space-y-4">
        <div>
          <Heading2>Headings</Heading2>
          <Body>
            Headings provide hierarchy and structure to your content. Use them to break up
            sections and guide readers through your content.
          </Body>
        </div>
        
        <div>
          <Heading3>Body Text</Heading3>
          <Body>
            Body text is the foundation of readable content. It should be comfortable to read
            for extended periods, with appropriate line height and spacing.
          </Body>
        </div>
        
        <div>
          <Heading4>Special Cases</Heading4>
          <Body>
            Use <Code>code</Code> for technical terms and code snippets. Use blockquotes for
            quotes, testimonials, or highlighted content.
          </Body>
        </div>
      </div>
    </div>
  ),
};

