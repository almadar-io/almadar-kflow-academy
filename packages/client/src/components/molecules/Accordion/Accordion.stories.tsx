import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Accordion } from './Accordion';
import { Typography } from '../../atoms/Typography';

const meta: Meta<typeof Accordion> = {
  title: 'Molecules/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Accordion>;

const sampleItems = [
  {
    id: '1',
    header: 'First Item',
    content: (
      <Typography variant="body">
        This is the content of the first accordion item. It can contain any React elements.
      </Typography>
    ),
  },
  {
    id: '2',
    header: 'Second Item',
    content: (
      <Typography variant="body">
        This is the content of the second accordion item.
      </Typography>
    ),
  },
  {
    id: '3',
    header: 'Third Item',
    content: (
      <Typography variant="body">
        This is the content of the third accordion item.
      </Typography>
    ),
  },
];

export const Default: Story = {
  args: {
    items: sampleItems,
  },
};

export const Multiple: Story = {
  args: {
    items: sampleItems,
    multiple: true,
  },
};

export const WithDefaultOpen: Story = {
  args: {
    items: [
      ...sampleItems,
      {
        id: '4',
        header: 'Default Open Item',
        content: <Typography variant="body">This item is open by default.</Typography>,
        defaultOpen: true,
      },
    ],
  },
};

export const WithDisabled: Story = {
  args: {
    items: [
      ...sampleItems,
      {
        id: '4',
        header: 'Disabled Item',
        content: <Typography variant="body">This item is disabled.</Typography>,
        disabled: true,
      },
    ],
  },
};
