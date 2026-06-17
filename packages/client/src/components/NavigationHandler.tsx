import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useEventBus } from '@almadar/ui';

/* eslint-disable almadar/no-use-navigate */

export function NavigationHandler() {
  const navigate = useNavigate();
  const { on } = useEventBus();

  useEffect(() => {
    const unsub = on('UI:NAVIGATE', (event) => {
      const payload = event.payload as { url?: string; replace?: boolean } | undefined;
      const url = payload?.url;
      if (!url) return;

      if (payload?.replace) {
        navigate(url, { replace: true });
      } else {
        navigate(url);
      }
    });

    return unsub;
  }, [on, navigate]);

  return null;
}
