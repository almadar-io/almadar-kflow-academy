import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ErrorTemplate } from './ErrorTemplate';

const meta: Meta<typeof ErrorTemplate> = {
  title: 'Templates/ErrorTemplate',
  component: ErrorTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ErrorTemplate>;

export const NotFound: Story = {
  args: {
    variant: '404',
    onHomeClick: () => console.log('Home clicked'),
    onBackClick: () => console.log('Back clicked'),
    showSearch: true,
    onSearch: (query: string) => console.log('Search:', query),
    supportEmail: 'support@kflow.com',
  },
};

export const ServerError: Story = {
  args: {
    variant: '500',
    onHomeClick: () => console.log('Home clicked'),
    onRetryClick: () => console.log('Retry clicked'),
    supportEmail: 'support@kflow.com',
  },
};

export const Forbidden: Story = {
  args: {
    variant: '403',
    onHomeClick: () => console.log('Home clicked'),
    onBackClick: () => console.log('Back clicked'),
    supportEmail: 'support@kflow.com',
  },
};

export const Maintenance: Story = {
  args: {
    variant: 'maintenance',
    onHomeClick: () => console.log('Home clicked'),
  },
};

export const Offline: Story = {
  args: {
    variant: 'offline',
    onRetryClick: () => console.log('Retry clicked'),
  },
};

export const CustomMessage: Story = {
  args: {
    variant: '404',
    title: 'Course not found',
    message: 'The course you are looking for may have been removed or is no longer available.',
    onHomeClick: () => console.log('Home clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

export const CustomLogo: Story = {
  args: {
    variant: '404',
    logo: (
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎓</span>
        <span className="text-xl font-bold text-indigo-600">LearnHub</span>
      </div>
    ),
    appName: 'LearnHub',
    onHomeClick: () => console.log('Home clicked'),
  },
};

export const Mobile: Story = {
  args: {
    ...NotFound.args,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

