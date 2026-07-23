import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router';
import LandingPage from '../pages/LandingPage';
import { ConceptsPage } from '../pages/ConceptsPage';
import { ConceptDetailPage } from '../pages/ConceptDetailPage';
import { DashboardPage } from '../pages/DashboardPage';
import { OnboardingPage, ONBOARDING_SEEN_KEY } from '../pages/OnboardingPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ConnectionPage } from '../pages/ConnectionPage';
import { CompanionPage } from '../pages/CompanionPage';
import { Login, ProtectedRoute } from '../features/auth';
import { useAuthContext } from '../features/auth/AuthContext';
import { Spinner, PageTransition } from '@almadar/ui';
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
    // First-time users land on onboarding; returning users go straight to /home.
    if (!localStorage.getItem(ONBOARDING_SEEN_KEY)) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return <LandingPage />;
};

/** Route-loading fallback shown while a page chunk resolves. */
const RouteFallback: React.FC = () => (
  <Spinner className="min-h-screen bg-background" />
);

/**
 * Location-keyed routes. `PageTransition` remounts on pathname change so each
 * page plays the `--motion-page-*` enter animation; `Suspense` covers chunk
 * fetch with the themed fallback.
 */
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <PageTransition locationKey={location.pathname}>
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location}>
          {/* Public Routes (no auth required) */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route path="/onboarding" element={
            <ProtectedRoute><OnboardingPage /></ProtectedRoute>
          } />
          <Route path="/home" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/learn" element={<Navigate to="/home" replace />} />
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
          <Route path="/companion" element={
            <ProtectedRoute><CompanionPage /></ProtectedRoute>
          } />
          <Route path="/connection/:id" element={
            <ProtectedRoute><ConnectionPage /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </PageTransition>
  );
};

const AppRouter: React.FC = () => {
  return (
    <Router>
      <NavigationHandler />
      <ConnectFlowHandler />
      <AnimatedRoutes />
    </Router>
  );
};

export default AppRouter;
