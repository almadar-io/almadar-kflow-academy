import { useCallback } from 'react';
import { useEventBus } from '@almadar/ui';

export interface NavigatePayload {
  url: string;
  replace?: boolean;
}

export function useNavigateEvent() {
  const { emit } = useEventBus();

  return useCallback(
    (url: string, options?: { replace?: boolean }) => {
      emit('UI:NAVIGATE', { url, replace: options?.replace ?? false });
    },
    [emit]
  );
}
