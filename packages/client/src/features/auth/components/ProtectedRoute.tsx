import React from 'react';
import { Navigate } from 'react-router';
import { useAuthContext } from '../AuthContext';
import { Spinner } from '@almadar/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuthContext();

  // Dev-only auth bypass for local testing — strictly gated, dead in production builds.
  // Pairs with @almadar/server's ALLOW_DEV_AUTH_BYPASS (server resolves requests as DEV_USER).
  if (import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEV_AUTH_BYPASS === 'true') {
    return <>{children}</>;
  }

  if (loading) {
    return <Spinner className="min-h-screen bg-background flex items-center justify-center" />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
