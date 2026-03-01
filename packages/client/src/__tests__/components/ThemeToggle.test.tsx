import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react';
import ThemeToggle from '../../components/ThemeToggle';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Moon: ({ size, className }: any) => <div data-testid="moon-icon" data-size={size} className={className}>Moon</div>,
  Sun: ({ size, className }: any) => <div data-testid="sun-icon" data-size={size} className={className}>Sun</div>,
}));

// Helper to render with ThemeProvider
const renderWithTheme = (initialTheme: 'light' | 'dark' = 'dark') => {
  // Clear localStorage before each test
  localStorage.clear();
  if (initialTheme !== 'dark') {
    localStorage.setItem('kflow-theme', initialTheme);
  }

  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
};

describe('ThemeToggle - Frontend', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset document class
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('Theme Toggle', () => {
    it('should switch from dark to light theme when clicked', () => {
      renderWithTheme('dark');

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // Initially dark theme
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Click to toggle to light
      fireEvent.click(button);

      // Should now be light theme
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should switch from light to dark theme when clicked', () => {
      renderWithTheme('light');

      const button = screen.getByRole('button');
      
      // Initially light theme
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Click to toggle to dark
      fireEvent.click(button);

      // Should now be dark theme
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should toggle theme multiple times correctly', () => {
      renderWithTheme('dark');

      const button = screen.getByRole('button');
      
      // Dark -> Light
      fireEvent.click(button);
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Light -> Dark
      fireEvent.click(button);
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Dark -> Light again
      fireEvent.click(button);
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should display correct icon for current theme', () => {
      renderWithTheme('dark');
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();
    });
  });

  describe('Theme Persistence', () => {
    it('should persist theme preference in localStorage', () => {
      renderWithTheme('dark');

      const button = screen.getByRole('button');
      
      // Toggle to light
      fireEvent.click(button);
      
      // Check localStorage
      expect(localStorage.getItem('kflow-theme')).toBe('light');
    });

    it('should load theme from localStorage on mount', () => {
      localStorage.setItem('kflow-theme', 'light');
      
      renderWithTheme('light');

      // Should start with light theme
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should persist theme changes across re-renders', () => {
      const { rerender } = renderWithTheme('dark');

      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(localStorage.getItem('kflow-theme')).toBe('light');

      // Re-render
      rerender(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      // Should still be light theme
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(localStorage.getItem('kflow-theme')).toBe('light');
    });

    it('should update localStorage when theme changes', () => {
      // Note: ThemeProvider doesn't set localStorage on initial mount for default theme
      // It only sets it when setTheme is called (via toggleTheme)
      // So we start with dark theme (default) and verify that toggling updates localStorage
      renderWithTheme('dark');

      const button = screen.getByRole('button');
      
      // Initially, localStorage may be empty (since ThemeProvider doesn't set it for default theme)
      // But after clicking, it should be set to 'light'
      fireEvent.click(button);
      
      // After toggle, localStorage should be set to 'light'
      expect(localStorage.getItem('kflow-theme')).toBe('light');
      
      // Toggle back to dark
      fireEvent.click(button);
      
      // localStorage should now be 'dark'
      expect(localStorage.getItem('kflow-theme')).toBe('dark');
    });
  });

  describe('System Preference', () => {
    it('should default to dark theme when no localStorage value exists', () => {
      localStorage.clear();
      
      renderWithTheme('dark');

      // Should default to dark
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should use dark theme as default when localStorage is empty', () => {
      localStorage.removeItem('kflow-theme');
      
      renderWithTheme('dark');

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Theme Application', () => {
    it('should apply dark class to document root when dark theme is active', () => {
      renderWithTheme('dark');

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from document root when light theme is active', () => {
      renderWithTheme('light');

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should update document class when theme changes', () => {
      renderWithTheme('dark');

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply theme class on initial mount', () => {
      localStorage.setItem('kflow-theme', 'light');
      
      renderWithTheme('light');

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Dark Mode Styles', () => {
    it('should render with correct styles for dark theme', () => {
      renderWithTheme('dark');

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-700');
      expect(button).toHaveClass('text-yellow-400');
      expect(button).toHaveClass('hover:bg-gray-600');
    });

    it('should render with correct styles for light theme', () => {
      renderWithTheme('light');

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-200');
      expect(button).toHaveClass('text-gray-700');
      expect(button).toHaveClass('hover:bg-gray-300');
    });

    it('should update button styles when theme changes', () => {
      const { rerender } = renderWithTheme('dark');

      let button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-700');

      fireEvent.click(button);

      button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-200');
    });

    it('should apply custom className prop', () => {
      render(
        <ThemeProvider>
          <ThemeToggle className="custom-class" />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-label for dark theme', () => {
      renderWithTheme('dark');

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('should have correct aria-label for light theme', () => {
      renderWithTheme('light');

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    it('should have correct title attribute', () => {
      renderWithTheme('dark');

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Switch to light mode');
    });

    it('should be a button element', () => {
      renderWithTheme('dark');

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('Icon Rendering', () => {
    it('should render Sun icon with correct size in dark theme', () => {
      renderWithTheme('dark');

      const sunIcon = screen.getByTestId('sun-icon');
      expect(sunIcon).toBeInTheDocument();
      expect(sunIcon).toHaveAttribute('data-size', '20');
    });

    it('should render Moon icon with correct size in light theme', () => {
      renderWithTheme('light');

      const moonIcon = screen.getByTestId('moon-icon');
      expect(moonIcon).toBeInTheDocument();
      expect(moonIcon).toHaveAttribute('data-size', '20');
    });

    it('should switch icons when theme toggles', () => {
      renderWithTheme('dark');

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid localStorage values gracefully', () => {
      localStorage.setItem('kflow-theme', 'invalid-theme');
      
      // Should default to dark when invalid value
      renderWithTheme('dark');

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should handle missing localStorage gracefully', () => {
      // Remove the item if it exists
      localStorage.removeItem('kflow-theme');
      
      renderWithTheme('dark');

      // Should default to dark
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
    });

    it('should handle rapid theme toggles', () => {
      renderWithTheme('dark');

      const button = screen.getByRole('button');
      
      // Rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should end up back at dark (even number of clicks)
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});

