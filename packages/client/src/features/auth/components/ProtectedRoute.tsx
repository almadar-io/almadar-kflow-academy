import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useAuthContext } from '../AuthContext';
import { Spinner } from '@almadar/ui';
import { auth } from '../../../config/firebase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuthContext();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    auth.authStateReady().then(() => setAuthReady(true));
  }, []);

  // Wait for both React state AND Firebase's internal authStateReady promise.
  // onAuthStateChanged can fire null before restoring a persisted session;
  // authStateReady() resolves only after that check completes, preventing
  // a premature dev-bypass that fires queries as dev-user-001.
  if (loading || !authReady) {
    return <Spinner className="min-h-screen bg-background flex items-center justify-center" />;
  }

  // Dev-only auth bypass: render children even if no user (server resolves as DEV_USER).
  if (import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEV_AUTH_BYPASS === 'true' && !user) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
