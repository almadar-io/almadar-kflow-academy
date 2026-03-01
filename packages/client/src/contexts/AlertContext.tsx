import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertType } from '../components/Alert';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  duration?: number;
}

interface AlertContextType {
  showAlert: (type: AlertType, message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  dismissAlert: (id: string) => void;
  alerts: Alert[];
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const showAlert = useCallback((type: AlertType, message: string, duration?: number) => {
    const id = `alert-${Date.now()}-${Math.random()}`;
    const newAlert: Alert = {
      id,
      type,
      message,
      duration,
    };

    setAlerts((prev) => [...prev, newAlert]);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showAlert('success', message, duration);
  }, [showAlert]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showAlert('warning', message, duration);
  }, [showAlert]);

  const showError = useCallback((message: string, duration?: number) => {
    showAlert('error', message, duration);
  }, [showAlert]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showAlert('info', message, duration);
  }, [showAlert]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const value: AlertContextType = {
    showAlert,
    showSuccess,
    showWarning,
    showError,
    showInfo,
    dismissAlert,
    alerts,
  };

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
};

