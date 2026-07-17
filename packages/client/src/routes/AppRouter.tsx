import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import LandingPage from '../pages/LandingPage';
import { ConceptsPage } from '../pages/ConceptsPage';
import { ConceptDetailPage } from '../pages/ConceptDetailPage';
import { LearnPage } from '../pages/LearnPage';
import { DashboardPage } from '../pages/DashboardPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ConnectionPage } from '../pages/ConnectionPage';
import { Login, ProtectedRoute } from '../features/auth';
import { useAuthContext } from '../features/auth/AuthContext';
import { Spinner } from '@almadar/ui';
import { NavigationHandler } from '../app/NavigationHandler';
import { ConnectFlowHandler } from '../features/connections/components/ConnectFlowHandler';

/**
 * App Router: Dashboard, Learn, and Concepts pages
 */

const HomeRoute: React.FC = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <Spinner className="min-h-screen bg-background" />
    );
  }

  if (user) {
    // Redirect authenticated users to /home which uses DashboardTemplate
    return <Navigate to="/home" replace />;
  }

  return <LandingPage />;
};

const AppRouter: React.FC = () => {
  return (
    <Router>
      <NavigationHandler />
      <ConnectFlowHandler />
      <Routes>
        {/* Public Routes (no auth required) */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route path="/home" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/learn" element={
          <ProtectedRoute><LearnPage /></ProtectedRoute>
        } />
        <Route path="/concepts/:graphId" element={
          <ProtectedRoute><ConceptsPage /></ProtectedRoute>
        } />
        <Route path="/concepts/:graphId/concept/:conceptId/prerequisite/:prereqId" element={
          <ProtectedRoute><ConceptDetailPage /></ProtectedRoute>
        } />
        <Route path="/concepts/:graphId/concept/:conceptId" element={
          <ProtectedRoute><ConceptDetailPage /></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><SettingsPage /></ProtectedRoute>
        } />
        <Route path="/connection/:id" element={
          <ProtectedRoute><ConnectionPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
