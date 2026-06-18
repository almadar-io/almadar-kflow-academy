import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useEventBus } from '@almadar/ui';
import { useAuthContext } from '../features/auth/AuthContext';

/* eslint-disable almadar/no-use-navigate */

export function UIEventBridge() {
  const navigate = useNavigate();
  const { on } = useEventBus();
  const { signOut } = useAuthContext();

  useEffect(() => {
    const unsubNavigate = on('UI:NAVIGATE', (event) => {
      const payload = event.payload as { url?: string; replace?: boolean } | undefined;
      const url = payload?.url;
      if (!url) return;
      if (payload?.replace) {
        navigate(url, { replace: true });
      } else {
        navigate(url);
      }
    });

    const unsubLogout = on('UI:LOGOUT', () => {
      signOut();
    });

    const unsubLogoClick = on('UI:LOGO_CLICK', (event) => {
      const payload = event.payload as { url?: string } | undefined;
      navigate(payload?.url ?? '/home');
    });

    return () => {
      unsubNavigate();
      unsubLogout();
      unsubLogoClick();
    };
  }, [on, navigate, signOut]);

  return null;
}

export { UIEventBridge as NavigationHandler };
