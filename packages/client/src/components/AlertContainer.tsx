import React from 'react';
import { useAlert } from '../contexts/AlertContext';
import Alert from './Alert';

const AlertContainer: React.FC = () => {
  const { alerts, dismissAlert } = useAlert();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-md px-4">
      <div className="space-y-2">
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            id={alert.id}
            type={alert.type}
            message={alert.message}
            duration={alert.duration}
            onDismiss={dismissAlert}
          />
        ))}
      </div>
    </div>
  );
};

export default AlertContainer;

