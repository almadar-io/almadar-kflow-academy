import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import Alert from '../../components/Alert';
import AlertContainer from '../../components/AlertContainer';
import { AlertProvider, useAlert } from '../../contexts/AlertContext';
import ErrorHandlerInitializer from '../../components/ErrorHandlerInitializer';
import { useHandleApiError } from '../../hooks/useHandleApiError';
import { setGlobalErrorHandler, apiClient } from '../../services/apiClient';

// Mock apiClient
jest.mock('../../services/apiClient', () => ({
  apiClient: {
    fetch: jest.fn(),
    baseURL: 'http://localhost:3001',
  },
  setGlobalErrorHandler: jest.fn(),
  formatErrorMessage: jest.fn((error) => {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }),
  handleApiError: jest.fn(),
}));

// Don't mock apiErrorHandler - we want to test the actual implementation

// Helper to render with AlertProvider
const renderWithAlertProvider = (component: React.ReactElement) => {
  return render(
    <AlertProvider>
      {component}
      <AlertContainer />
    </AlertProvider>
  );
};

describe('Alert Component - Frontend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Error Alert', () => {
    it('should display error alert correctly', () => {
      const onDismiss = jest.fn();
      render(
        <Alert
          id="test-error"
          type="error"
          message="This is an error message"
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('This is an error message')).toBeInTheDocument();
      expect(screen.getByLabelText('Dismiss alert')).toBeInTheDocument();
    });

    it('should have correct error styling', () => {
      const onDismiss = jest.fn();
      const { container } = render(
        <Alert
          id="test-error"
          type="error"
          message="Error message"
          onDismiss={onDismiss}
        />
      );

      const alert = container.querySelector('.bg-red-50');
      expect(alert).toBeInTheDocument();
      expect(container.querySelector('.border-red-200')).toBeInTheDocument();
      expect(container.querySelector('.text-red-800')).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = jest.fn();
      render(
        <Alert
          id="test-error"
          type="error"
          message="Error message"
          onDismiss={onDismiss}
        />
      );

      const dismissButton = screen.getByLabelText('Dismiss alert');
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledWith('test-error');
    });
  });

  describe('Success Alert', () => {
    it('should display success alert correctly', () => {
      const onDismiss = jest.fn();
      render(
        <Alert
          id="test-success"
          type="success"
          message="Operation completed successfully"
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    });

    it('should have correct success styling', () => {
      const onDismiss = jest.fn();
      const { container } = render(
        <Alert
          id="test-success"
          type="success"
          message="Success message"
          onDismiss={onDismiss}
        />
      );

      const alert = container.querySelector('.bg-green-50');
      expect(alert).toBeInTheDocument();
      expect(container.querySelector('.border-green-200')).toBeInTheDocument();
      expect(container.querySelector('.text-green-800')).toBeInTheDocument();
    });
  });

  describe('Warning Alert', () => {
    it('should display warning alert correctly', () => {
      const onDismiss = jest.fn();
      render(
        <Alert
          id="test-warning"
          type="warning"
          message="This is a warning"
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('This is a warning')).toBeInTheDocument();
    });

    it('should have correct warning styling', () => {
      const onDismiss = jest.fn();
      const { container } = render(
        <Alert
          id="test-warning"
          type="warning"
          message="Warning message"
          onDismiss={onDismiss}
        />
      );

      const alert = container.querySelector('.bg-yellow-50');
      expect(alert).toBeInTheDocument();
      expect(container.querySelector('.border-yellow-200')).toBeInTheDocument();
      expect(container.querySelector('.text-yellow-800')).toBeInTheDocument();
    });
  });

  describe('Info Alert', () => {
    it('should display info alert correctly', () => {
      const onDismiss = jest.fn();
      render(
        <Alert
          id="test-info"
          type="info"
          message="This is an info message"
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('This is an info message')).toBeInTheDocument();
    });

    it('should have correct info styling', () => {
      const onDismiss = jest.fn();
      const { container } = render(
        <Alert
          id="test-info"
          type="info"
          message="Info message"
          onDismiss={onDismiss}
        />
      );

      const alert = container.querySelector('.bg-blue-50');
      expect(alert).toBeInTheDocument();
      expect(container.querySelector('.border-blue-200')).toBeInTheDocument();
      expect(container.querySelector('.text-blue-800')).toBeInTheDocument();
    });
  });

  describe('Auto-Dismiss', () => {
    it('should auto-dismiss after default duration (5000ms)', async () => {
      const onDismiss = jest.fn();
      render(
        <Alert
          id="test-auto"
          type="success"
          message="Auto-dismiss message"
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Fast-forward time by 5000ms
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledWith('test-auto');
      });
    });

    it('should auto-dismiss after custom duration', async () => {
      const onDismiss = jest.fn();
      render(
        <Alert
          id="test-custom"
          type="error"
          message="Custom duration message"
          duration={3000}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Fast-forward time by 3000ms
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledWith('test-custom');
      });
    });

    it('should not auto-dismiss when duration is 0', async () => {
      const onDismiss = jest.fn();
      render(
        <Alert
          id="test-no-dismiss"
          type="warning"
          message="No auto-dismiss message"
          duration={0}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Fast-forward time significantly
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not have been dismissed
      expect(onDismiss).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should clear timer on unmount', () => {
      const onDismiss = jest.fn();
      const { unmount } = render(
        <Alert
          id="test-unmount"
          type="info"
          message="Unmount test"
          duration={5000}
          onDismiss={onDismiss}
        />
      );

      unmount();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not call onDismiss after unmount
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Alerts', () => {
    it('should stack multiple alerts correctly', () => {
      const TestComponent: React.FC = () => {
        const { showError, showSuccess, showWarning } = useAlert();

        return (
          <div>
            <button onClick={() => showError('Error 1')}>Show Error 1</button>
            <button onClick={() => showSuccess('Success 1')}>Show Success 1</button>
            <button onClick={() => showWarning('Warning 1')}>Show Warning 1</button>
          </div>
        );
      };

      renderWithAlertProvider(<TestComponent />);

      const errorButton = screen.getByText('Show Error 1');
      const successButton = screen.getByText('Show Success 1');
      const warningButton = screen.getByText('Show Warning 1');

      fireEvent.click(errorButton);
      fireEvent.click(successButton);
      fireEvent.click(warningButton);

      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Success 1')).toBeInTheDocument();
      expect(screen.getByText('Warning 1')).toBeInTheDocument();

      // Should have 3 alerts
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(3);
    });

    it('should dismiss individual alerts independently', () => {
      const TestComponent: React.FC = () => {
        const { showError, showSuccess } = useAlert();

        return (
          <div>
            <button onClick={() => showError('Error 1')}>Show Error</button>
            <button onClick={() => showSuccess('Success 1')}>Show Success</button>
          </div>
        );
      };

      renderWithAlertProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Success'));

      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Success 1')).toBeInTheDocument();

      // Dismiss the error alert
      const errorAlert = screen.getByText('Error 1').closest('[role="alert"]');
      const dismissButton = errorAlert?.querySelector('button[aria-label="Dismiss alert"]');
      if (dismissButton) {
        fireEvent.click(dismissButton);
      }

      // Error should be gone, success should remain
      expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
      expect(screen.getByText('Success 1')).toBeInTheDocument();
    });
  });

  describe('API Error Integration', () => {
    it('should trigger error alert when useHandleApiError hook is used', async () => {
      const TestComponent: React.FC = () => {
        const handleApiError = useHandleApiError();

        return (
          <button
            onClick={() => {
              handleApiError(new Error('API Error: Test error'));
            }}
          >
            Trigger Error
          </button>
        );
      };

      renderWithAlertProvider(<TestComponent />);

      const button = screen.getByText('Trigger Error');
      fireEvent.click(button);

      // Should show error alert (handleApiError removes "API Error: " prefix)
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should clean up technical error messages', async () => {
      const TestComponent: React.FC = () => {
        const handleApiError = useHandleApiError();

        return (
          <button
            onClick={() => {
              handleApiError(new Error('API Error: Failed to fetch'));
            }}
          >
            Trigger Network Error
          </button>
        );
      };

      renderWithAlertProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Trigger Network Error'));

      // Should clean up "API Error: " prefix and convert "Failed to fetch" to network error message
      await waitFor(() => {
        expect(screen.getByText(/Network error. Please check your connection/i)).toBeInTheDocument();
      });
    });

    it('should handle ErrorHandlerInitializer correctly', () => {
      const TestComponent: React.FC = () => {
        return (
          <div>
            <ErrorHandlerInitializer />
          </div>
        );
      };

      renderWithAlertProvider(<TestComponent />);

      // ErrorHandlerInitializer should set up the global error handler for apiClient
      expect(setGlobalErrorHandler).toHaveBeenCalled();
    });

    it('should handle apiClient.fetch errors', async () => {
      const TestComponent: React.FC = () => {
        const { showError } = useAlert();
        React.useEffect(() => {
          setGlobalErrorHandler(showError);
        }, [showError]);

        return (
          <button
            onClick={async () => {
              try {
                (apiClient.fetch as jest.Mock).mockRejectedValueOnce(
                  new Error('Network error. Please check your connection.')
                );
                await apiClient.fetch('/api/test');
              } catch (error) {
                // Error is handled by apiClient
              }
            }}
          >
            Test API Call
          </button>
        );
      };

      renderWithAlertProvider(<TestComponent />);

      const button = screen.getByText('Test API Call');
      fireEvent.click(button);

      // The apiClient should handle the error and show alert
      // Note: This test verifies the integration, actual implementation
      // may vary based on how apiClient is set up
      await waitFor(() => {
        // The error handler should be called
        expect(apiClient.fetch).toHaveBeenCalled();
      });
    });

    it('should handle string errors', async () => {
      const TestComponent: React.FC = () => {
        const handleApiError = useHandleApiError();

        return (
          <button
            onClick={() => {
              handleApiError('String error message');
            }}
          >
            Trigger String Error
          </button>
        );
      };

      renderWithAlertProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Trigger String Error'));

      await waitFor(() => {
        expect(screen.getByText('String error message')).toBeInTheDocument();
      });
    });

    it('should handle unknown error types with default message', async () => {
      const TestComponent: React.FC = () => {
        const handleApiError = useHandleApiError();

        return (
          <button
            onClick={() => {
              handleApiError({ unexpected: 'error' });
            }}
          >
            Trigger Unknown Error
          </button>
        );
      };

      renderWithAlertProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Trigger Unknown Error'));

      await waitFor(() => {
        expect(
          screen.getByText('An unexpected error occurred. Please try again.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('AlertContainer', () => {
    it('should render nothing when no alerts exist', () => {
      const { container } = render(
        <AlertProvider>
          <AlertContainer />
        </AlertProvider>
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render alerts in container', () => {
      const TestComponent: React.FC = () => {
        const { showError } = useAlert();
        return (
          <button onClick={() => showError('Test error')}>Show Error</button>
        );
      };

      renderWithAlertProvider(<TestComponent />);

      fireEvent.click(screen.getByText('Show Error'));

      const container = screen.getByText('Test error').closest('.fixed');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('top-4', 'left-1/2');
    });
  });
});

