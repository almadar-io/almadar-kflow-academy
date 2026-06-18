import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { OperationPanel } from './OperationPanel';
import { Play, RefreshCw, Trash2, Download } from 'lucide-react';
import { useState } from 'react';

const meta: Meta<typeof OperationPanel> = {
  title: 'Organisms/OperationPanel',
  component: OperationPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof OperationPanel>;

const OperationPanelWrapper = (args: Story['args']) => {
  const [executing, setExecuting] = useState<string | undefined>();
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>();

  const handleOperation = async (id: string): Promise<void> => {
    setExecuting(id);
    setProgress(0);
    setResult(undefined);

    // Simulate streaming progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(i);
    }

    setResult({
      success: true,
      message: `Operation "${id}" completed successfully!`,
      data: { operationId: id, timestamp: new Date().toISOString() },
    });
    setExecuting(undefined);
  };

  return (
    <OperationPanel
      {...args}
      executingOperation={executing}
      streamingProgress={executing ? progress : undefined}
      result={result}
      showResult={true}
      operations={args.operations?.map((op: any) => ({
        ...op,
        onClick: () => handleOperation(op.id),
      }))}
    />
  );
};

export const Default: Story = {
  render: (args: Story['args']) => <OperationPanelWrapper {...args} />,
  args: {
    title: 'Graph Operations',
    operations: [
      {
        id: 'generate',
        label: 'Generate Concepts',
        icon: Play,
        variant: 'primary' as const,
        onClick: async () => {},
      },
      {
        id: 'refresh',
        label: 'Refresh',
        icon: RefreshCw,
        variant: 'secondary' as const,
        onClick: async () => {},
      },
    ],
  },
};

export const MultipleOperations: Story = {
  render: (args: Story['args']) => <OperationPanelWrapper {...args} />,
  args: {
    title: 'Multiple Operations',
    operations: [
      {
        id: 'generate',
        label: 'Generate',
        icon: Play,
        variant: 'primary' as const,
        onClick: async () => {},
      },
      {
        id: 'download',
        label: 'Download',
        icon: Download,
        variant: 'success' as const,
        onClick: async () => {},
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger' as const,
        onClick: async () => {},
      },
    ],
  },
};

export const WithError: Story = {
  args: {
    title: 'Operations with Error',
    operations: [
      {
        id: 'operation',
        label: 'Run Operation',
        icon: Play,
        onClick: async () => {},
      },
    ],
    error: 'An error occurred while processing the operation.',
  },
};

export const WithResult: Story = {
  args: {
    title: 'Operation Results',
    operations: [
      {
        id: 'operation',
        label: 'Run Operation',
        icon: Play,
        onClick: async () => {},
      },
    ],
    result: {
      success: true,
      message: 'Operation completed successfully!',
      data: { items: 5, processed: 5 },
    },
    showResult: true,
  },
};
