import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import LandingPage from '../pages/LandingPage';
import { ConceptsPage } from '../pages/ConceptsPage';
import { ConceptDetailPage } from '../pages/ConceptDetailPage';
import { LearnPage } from '../pages/LearnPage';
import { DashboardPage } from '../pages/DashboardPage';
import { StoryCatalogPage } from '../pages/StoryCatalogPage';
import { StoryPlayPage } from '../pages/StoryPlayPage';
import { SeriesViewPage } from '../pages/SeriesViewPage';
import { ExplorePage } from '../pages/ExplorePage';
import { Login, ProtectedRoute } from '../features/auth';
import { useAuthContext } from '../features/auth/AuthContext';
import { Spinner } from '@almadar/ui';
import { AppLayout } from '../app/AppLayout';
import { NavigationHandler } from '../app/NavigationHandler';

/**
 * App Router: Dashboard, Learn, and Stories pages
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
      <Routes>
        {/* Public Routes (no auth required) */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />

        {/* Public story routes (no auth required, with app layout) */}
        <Route path="/stories" element={<AppLayout><StoryCatalogPage /></AppLayout>} />
        <Route path="/stories/:storyId" element={<AppLayout><StoryPlayPage /></AppLayout>} />
        <Route path="/series/:seriesId" element={<AppLayout><SeriesViewPage /></AppLayout>} />
        <Route path="/explore" element={<AppLayout><ExplorePage /></AppLayout>} />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
