import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Card } from './Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';

const meta: Meta<typeof Card> = {
  title: 'Molecules/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <Typography variant="h3" className="mb-2">
          Card Title
        </Typography>
        <Typography variant="body">
          This is the card content. It can contain any React elements.
        </Typography>
      </div>
    ),
  },
};

export const WithHeader: Story = {
  args: {
    header: <Typography variant="h3">Card Header</Typography>,
    children: (
      <Typography variant="body">
        This card has a header section.
      </Typography>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    children: (
      <Typography variant="body">
        This card has a footer section.
      </Typography>
    ),
    footer: <Typography variant="small" className="text-gray-500">Footer text</Typography>,
  },
};

export const WithActions: Story = {
  args: {
    children: (
      <Typography variant="body">
        This card has action buttons.
      </Typography>
    ),
    actions: (
      <>
        <Button variant="secondary" size="sm">Cancel</Button>
        <Button variant="primary" size="sm">Save</Button>
      </>
    ),
  },
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <Card variant="default">
        <Typography variant="body">Default variant</Typography>
      </Card>
      <Card variant="elevated">
        <Typography variant="body">Elevated variant with shadow</Typography>
      </Card>
      <Card variant="outlined">
        <Typography variant="body">Outlined variant with border</Typography>
      </Card>
      <Card variant="interactive" onClick={() => alert('Clicked!')}>
        <Typography variant="body">Interactive variant (clickable)</Typography>
      </Card>
    </div>
  ),
};

export const Complete: Story = {
  args: {
    variant: 'elevated',
    header: <Typography variant="h3">Complete Card</Typography>,
    children: (
      <div>
        <Typography variant="body" className="mb-2">
          This is a complete card example with header, content, actions, and footer.
        </Typography>
        <Typography variant="small" className="text-gray-500">
          Additional content can go here.
        </Typography>
      </div>
    ),
    actions: (
      <>
        <Button variant="secondary" size="sm">Cancel</Button>
        <Button variant="primary" size="sm">Confirm</Button>
      </>
    ),
    footer: <Typography variant="small" className="text-gray-500">Last updated: Today</Typography>,
  },
};

export const Loading: Story = {
  args: {
    header: <Typography variant="h3">Loading Card</Typography>,
    children: <Typography variant="body">This content is loading...</Typography>,
    loading: true,
  },
};

