import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type AlertType = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps {
  id: string;
  type: AlertType;
  message: string;
  duration?: number; // Duration in milliseconds, 0 means no auto-dismiss
  onDismiss: (id: string) => void;
}

const Alert: React.FC<AlertProps> = ({ id, type, message, duration = 5000, onDismiss }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  const typeConfig = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: CheckCircle2,
      iconColor: 'text-green-600',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: AlertCircle,
      iconColor: 'text-red-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: Info,
      iconColor: 'text-blue-600',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-lg shadow-lg p-4 mb-3 flex items-start gap-3 alert-slide-down`}
      role="alert"
    >
      <Icon size={20} className={`${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className={`flex-1 ${config.text} text-sm font-medium`}>
        {message}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className={`${config.text} hover:opacity-70 transition-opacity flex-shrink-0`}
        aria-label="Dismiss alert"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Alert;

