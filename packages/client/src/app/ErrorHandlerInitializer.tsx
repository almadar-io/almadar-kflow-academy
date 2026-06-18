import { useEffect } from 'react';
import { useEventBus } from '@almadar/ui';
import { setGlobalErrorHandler } from '../services/apiClient';
import type { UiNotifyPayload } from '../app/uiEvents';

const ErrorHandlerInitializer: React.FC = () => {
  const { emit } = useEventBus();

  useEffect(() => {
    setGlobalErrorHandler((msg: string) =>
      emit('UI:NOTIFY', { severity: 'error', message: msg } satisfies UiNotifyPayload)
    );
  }, [emit]);

  return null;
};

export default ErrorHandlerInitializer;

