import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InteractiveOrbitalPanel } from '@design-system/organisms/InteractiveOrbitalPanel';
import type { OrbitalSchema } from '@almadar/core';

const mockEmit = jest.fn();

jest.mock('@almadar/ui', () => ({
  Box: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  VStack: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  HStack: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  Card: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  Typography: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <span {...props}>{children}</span>,
  Button: ({
    children,
    onClick,
    disabled,
  }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  useEventBus: () => ({ emit: mockEmit }),
}));

const mockAlmadarApp = jest.fn((_props: Record<string, unknown>) => <div data-testid="almadar-app" />);
jest.mock('@almadar/sdk/react', () => ({
  AlmadarApp: (props: Record<string, unknown>) => mockAlmadarApp(props),
}));

const mockSchema: OrbitalSchema = { name: 'test-orbital', orbitals: [] };

const baseProps = {
  type: 'math' as const,
  description: 'A vector field',
  concept: { name: 'Vectors' },
};

describe('InteractiveOrbitalPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults showControls to false and omits exposedTiers from AlmadarApp', async () => {
    const onGenerate = jest.fn().mockResolvedValue(mockSchema);

    render(<InteractiveOrbitalPanel {...baseProps} onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockAlmadarApp).toHaveBeenCalled());

    const props = mockAlmadarApp.mock.calls[0][0];
    expect(props.showControls).toBe(false);
    expect(props).not.toHaveProperty('exposedTiers');
  });

  it('passes exposedTiers through to AlmadarApp when showControls is true', async () => {
    const onGenerate = jest.fn().mockResolvedValue(mockSchema);

    render(
      <InteractiveOrbitalPanel
        {...baseProps}
        onGenerate={onGenerate}
        showControls
        exposedTiers={['presentation']}
      />,
    );
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockAlmadarApp).toHaveBeenCalled());

    const props = mockAlmadarApp.mock.calls[0][0];
    expect(props.showControls).toBe(true);
    expect(props.exposedTiers).toEqual(['presentation']);
  });

  it('renders the phase string while generating', async () => {
    let resolveGenerate!: (schema: OrbitalSchema) => void;
    const onGenerate = jest.fn(
      () => new Promise<OrbitalSchema>((resolve) => { resolveGenerate = resolve; }),
    );

    render(<InteractiveOrbitalPanel {...baseProps} onGenerate={onGenerate} phase="classifying" />);
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('classifying')).toBeTruthy();

    resolveGenerate(mockSchema);
    await waitFor(() => expect(mockAlmadarApp).toHaveBeenCalled());
  });

  it('does not render phase text when not generating', () => {
    render(<InteractiveOrbitalPanel {...baseProps} onGenerate={jest.fn()} phase="classifying" />);
    expect(screen.queryByText('classifying')).toBeNull();
  });
});
