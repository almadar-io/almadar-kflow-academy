import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { useState } from 'react';
import { SidePanel } from './SidePanel';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';

const meta: Meta<typeof SidePanel> = {
  title: 'Molecules/SidePanel',
  component: SidePanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SidePanel>;

const SidePanelWrapper = (args: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="mb-4">
        <Button onClick={() => setIsOpen(true)}>
          Open Side Panel
        </Button>
      </div>
      <SidePanel
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
};

export const RightSide: Story = {
  render: (args: any) => <SidePanelWrapper {...args} />,
  args: {
    title: 'Right Side Panel',
    position: 'right',
    width: 'w-96',
    children: (
      <div className="space-y-4">
        <Typography variant="body">
          This is a side panel that slides in from the right. It can contain any content you need.
        </Typography>
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <Typography variant="body" className="font-semibold mb-2">
            Example Content
          </Typography>
          <Typography variant="body" color="secondary">
            You can add forms, lists, or any other components here.
          </Typography>
        </div>
      </div>
    ),
  },
};

export const LeftSide: Story = {
  render: (args: any) => <SidePanelWrapper {...args} />,
  args: {
    title: 'Left Side Panel',
    position: 'left',
    width: 'w-80',
    children: (
      <div className="space-y-4">
        <Typography variant="body">
          This panel slides in from the left side.
        </Typography>
        <ul className="space-y-2">
          {['Item 1', 'Item 2', 'Item 3'].map((item) => (
            <li key={item} className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
              {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
};

export const WidePanel: Story = {
  render: (args: any) => <SidePanelWrapper {...args} />,
  args: {
    title: 'Wide Panel',
    position: 'right',
    width: 'w-[600px]',
    children: (
      <div className="space-y-4">
        <Typography variant="h6">Wide Content Area</Typography>
        <Typography variant="body" color="secondary">
          This panel has a wider width to accommodate more content. Useful for forms or detailed views.
        </Typography>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Typography variant="body">Card {i + 1}</Typography>
            </div>
          ))}
        </div>
      </div>
    ),
  },
};

export const WithOverlay: Story = {
  render: (args: any) => <SidePanelWrapper {...args} />,
  args: {
    title: 'Panel with Overlay',
    position: 'right',
    width: 'w-96',
    showOverlay: true,
    children: (
      <div className="space-y-4">
        <Typography variant="body">
          This panel shows an overlay on mobile devices when opened.
        </Typography>
        <Typography variant="body" color="secondary">
          The overlay helps focus attention on the panel content.
        </Typography>
      </div>
    ),
  },
};

export const ScrollableContent: Story = {
  render: (args: any) => <SidePanelWrapper {...args} />,
  args: {
    title: 'Scrollable Content',
    position: 'right',
    width: 'w-96',
    children: (
      <div className="space-y-4">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Typography variant="body" className="font-semibold mb-2">
              Section {i + 1}
            </Typography>
            <Typography variant="body" color="secondary">
              This is a scrollable section. The panel content area will scroll when content exceeds the available height.
            </Typography>
          </div>
        ))}
      </div>
    ),
  },
};
