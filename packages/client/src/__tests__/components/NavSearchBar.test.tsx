import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavSearchBar } from '@design-system/molecules/NavSearchBar';
import type { LearningPathSummary } from '@features/knowledge-graph/api/types';

const mockEmit = jest.fn();

jest.mock('@almadar/ui', () => ({
  Box: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  Typography: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Input: ({ value, onChange, onFocus, onBlur, placeholder }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    placeholder?: string;
  }) => <input type="search" value={value} onChange={onChange} onFocus={onFocus} onBlur={onBlur} placeholder={placeholder} />,
  cn: (...args: Array<string | false | undefined>) => args.filter(Boolean).join(' '),
  useEventBus: () => ({ emit: mockEmit }),
  useTranslate: () => ({
    t: (key: string, params?: Record<string, string>) =>
      key === 'nav.createLabel' ? `Create "${params?.query ?? ''}"` : key,
  }),
}));

const mockPaths: { learningPaths: LearningPathSummary[] } = { learningPaths: [] };

jest.mock('@features/knowledge-graph/hooks/useLearningPaths', () => ({
  useLearningPaths: () => ({ learningPaths: mockPaths.learningPaths }),
}));

jest.mock('@features/knowledge-graph/hooks/useConceptIcon', () => ({ useConceptIcon: () => null }));

jest.mock('lucide-react', () => ({ Search: () => null, BookOpen: () => null, Plus: () => null }));

jest.mock('@iconify/react', () => ({ Icon: () => null }));

const typeQuery = (query: string): HTMLInputElement => {
  const input = screen.getByRole('searchbox') as HTMLInputElement;
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: query } });
  return input;
};

describe('NavSearchBar — create from search', () => {
  beforeEach(() => {
    mockEmit.mockClear();
    mockPaths.learningPaths = [];
  });

  it('offers to create a new path when the query matches nothing', () => {
    render(<NavSearchBar value="" onChange={jest.fn()} />);
    typeQuery('quantum computing');
    expect(screen.getByText('Create "quantum computing"')).toBeTruthy();
  });

  it('navigates to the goal form with the query as anchor when create is clicked', () => {
    render(<NavSearchBar value="" onChange={jest.fn()} />);
    const input = typeQuery('quantum computing');
    fireEvent.click(screen.getByText('Create "quantum computing"'));
    expect(mockEmit).toHaveBeenCalledWith('UI:NAVIGATE', {
      url: '/home?create=true&anchor=quantum%20computing',
    });
    expect(input.value).toBe('');
  });

  it('still offers create alongside matching results', () => {
    mockPaths.learningPaths = [
      {
        id: 'g1',
        title: 'Quantum Basics',
        conceptCount: 3,
        updatedAt: '2026-01-01T00:00:00Z',
      } as LearningPathSummary,
    ];
    render(<NavSearchBar value="" onChange={jest.fn()} />);
    typeQuery('quantum');
    expect(screen.getByText('Quantum Basics')).toBeTruthy();
    expect(screen.getByText('Create "quantum"')).toBeTruthy();
  });
});
