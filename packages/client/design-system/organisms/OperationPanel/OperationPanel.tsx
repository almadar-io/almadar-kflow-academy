/**
 * OperationPanel Organism Component
 * 
 * A panel component for operations with buttons, loading states, result display, and error handling.
 * Uses Card, ButtonGroup, Alert, Modal molecules and Button, Icon, Spinner, Typography, ProgressBar, Badge atoms.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Alert, Badge, Button, ButtonGroup, Card, Icon, Modal, ProgressBar, Spinner, Typography } from '@almadar/ui';
import { cn } from '@utils/theme';

export interface Operation {
  /**
   * Operation ID
   */
  id: string;
  
  /**
   * Operation label
   */
  label: string;
  
  /**
   * Operation icon
   */
  icon?: LucideIcon;
  
  /**
   * Operation variant
   */
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  
  /**
   * Operation handler
   */
  onClick: () => void | Promise<void>;
}

export interface OperationPanelProps {
  /**
   * Panel title
   */
  title?: string;
  
  /**
   * Operations to display
   */
  operations: Operation[];
  
  /**
   * Currently executing operation ID
   */
  executingOperation?: string;
  
  /**
   * Operation result
   */
  result?: {
    success: boolean;
    message: string;
    data?: any;
  };
  
  /**
   * Streaming progress (0-100)
   */
  streamingProgress?: number;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Show result visualization
   * @default false
   */
  showResult?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const OperationPanel: React.FC<OperationPanelProps> = ({
  title,
  operations,
  executingOperation,
  result,
  streamingProgress,
  error,
  showResult = false,
  className,
}) => {
  const [showResultModal, setShowResultModal] = useState(false);

  const isExecuting = !!executingOperation;
  const executingOp = operations.find(op => op.id === executingOperation);

  return (
    <Card className={cn('', className)}>
      <div className="space-y-4">
        {/* Header */}
        {title && (
          <Typography variant="h5" className="mb-4">
            {title}
          </Typography>
        )}

        {/* Error */}
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Operations */}
        <ButtonGroup>
          {operations.map((operation) => (
            <Button
              key={operation.id}
              variant={operation.variant || 'primary'}
              icon={operation.icon}
              onClick={operation.onClick}
              disabled={isExecuting}
              isLoading={executingOperation === operation.id}
            >
              {operation.label}
            </Button>
          ))}
        </ButtonGroup>

        {/* Streaming Progress */}
        {streamingProgress !== undefined && isExecuting && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Typography variant="small" color="secondary">
                {executingOp?.label || 'Processing...'}
              </Typography>
              <Typography variant="small" color="secondary">
                {Math.round(streamingProgress)}%
              </Typography>
            </div>
            <ProgressBar value={streamingProgress} color="primary" />
          </div>
        )}

        {/* Loading State */}
        {isExecuting && streamingProgress === undefined && (
          <div className="flex items-center gap-3 p-4 bg-surface rounded-lg">
            <Spinner size="md" />
            <Typography variant="body" color="secondary">
              {executingOp?.label || 'Processing...'}
            </Typography>
          </div>
        )}

        {/* Result */}
        {result && showResult && (
          <div className="mt-4">
            <Alert
              variant={result.success ? 'success' : 'error'}
              title={result.success ? 'Success' : 'Error'}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResultModal(true)}
                >
                  View Details
                </Button>
              }
            >
              {result.message}
            </Alert>

            {result.data && (
              <Modal
                isOpen={showResultModal}
                onClose={() => setShowResultModal(false)}
                title="Operation Result"
                size="lg"
              >
                <pre className="p-4 bg-surface rounded-lg overflow-auto max-h-96">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </Modal>
            )}
          </div>
        )}

        {/* Result Summary */}
        {result && !showResult && (
          <div className={cn(
            'p-4 rounded-lg border',
            result.success
              ? 'bg-success/10 border-[var(--color-success)]/30'
              : 'bg-error/10 border-[var(--color-error)]/30'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={result.success ? 'success' : 'danger'} size="sm">
                {result.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
            <Typography variant="body">
              {result.message}
            </Typography>
          </div>
        )}
      </div>
    </Card>
  );
};

OperationPanel.displayName = 'OperationPanel';
