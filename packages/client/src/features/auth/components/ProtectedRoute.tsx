import React from 'react';
import { Navigate } from 'react-router';
import { useAuthContext } from '../AuthContext';
import { Spinner } from '@almadar/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuthContext();

  // ALWAYS wait for Firebase auth to resolve — even in dev bypass mode.
  // Rendering children before auth.currentUser is populated causes graph
  // queries to fire with no auth header → server dev-bypasses to dev-user-001.
  if (loading) {
    return <Spinner className="min-h-screen bg-background flex items-center justify-center" />;
  }

  // Dev-only auth bypass: render children even if no user (server resolves as DEV_USER).
  // Pairs with @almadar/server's ALLOW_DEV_AUTH_BYPASS (server resolves requests as DEV_USER).
  if (import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEV_AUTH_BYPASS === 'true' && !user) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
