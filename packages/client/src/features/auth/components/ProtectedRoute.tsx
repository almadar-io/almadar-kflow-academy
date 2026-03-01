import React from 'react';
import { Navigate } from 'react-router';
import { useAuthContext } from '../AuthContext';
import { Loader } from '../../../components';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <Loader 
        size="lg" 
        text="Loading..." 
        overlay={false}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
