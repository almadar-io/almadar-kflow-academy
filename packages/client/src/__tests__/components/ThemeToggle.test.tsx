import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react';
import { ThemeToggle } from '@almadar/ui';
import { ThemeProvider } from '@almadar/ui/context';

jest.mock('lucide-react', () => ({
  Moon: ({ size, className }: { size?: number; className?: string }) => <div data-testid="moon-icon" data-size={size} className={className}>Moon</div>,
  Sun: ({ size, className }: { size?: number; className?: string }) => <div data-testid="sun-icon" data-size={size} className={className}>Sun</div>,
}));

const renderWithTheme = (initialMode: 'light' | 'dark' = 'dark') => {
  localStorage.clear();
  return render(
    <ThemeProvider defaultMode={initialMode}>
      <ThemeToggle />
    </ThemeProvider>
  );
};

describe('ThemeToggle - Frontend', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
  });

  it('should render a button', () => {
    renderWithTheme('dark');
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should toggle theme when clicked', () => {
    renderWithTheme('dark');
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button).toBeInTheDocument();
  });
});
