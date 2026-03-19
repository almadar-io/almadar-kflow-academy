import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import LandingPage from '../pages/LandingPage';
import { ConceptListPageContainer, ConceptDetailPageContainer } from '../features/concepts/containers';
import { LearnPageContainer } from '../features/learning/containers';
import { DashboardPageContainer } from '../features/dashboard/containers';
import {
  StoryCatalogPageContainer,
  StoryPlayPageContainer,
  SeriesViewPageContainer,
  ExplorePageContainer,
} from '../features/stories/containers';
import { Login, ProtectedRoute } from '../features/auth';
import { useAuthContext } from '../features/auth/AuthContext';
import { Loader } from '../components';
import { AppLayout } from '../components/AppLayout';

/**
 * App Router: Dashboard, Learn, and Stories pages
 */

const HomeRoute: React.FC = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <Loader
        size="lg"
        text="Loading..."
        overlay={false}
        className="min-h-screen bg-gray-50 dark:bg-gray-900"
      />
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
      <Routes>
        {/* Public Routes (no auth required) */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />

        {/* Public story routes (no auth required, with app layout) */}
        <Route path="/stories" element={<AppLayout><StoryCatalogPageContainer /></AppLayout>} />
        <Route path="/stories/:storyId" element={<AppLayout><StoryPlayPageContainer /></AppLayout>} />
        <Route path="/series/:seriesId" element={<AppLayout><SeriesViewPageContainer /></AppLayout>} />
        <Route path="/explore" element={<AppLayout><ExplorePageContainer /></AppLayout>} />

        {/* Protected routes */}
        <Route path="/home" element={
          <ProtectedRoute><DashboardPageContainer /></ProtectedRoute>
        } />
        <Route path="/learn" element={
          <ProtectedRoute><LearnPageContainer /></ProtectedRoute>
        } />
        <Route path="/concepts/:graphId" element={
          <ProtectedRoute><ConceptListPageContainer /></ProtectedRoute>
        } />
        <Route path="/concepts/:graphId/concept/:conceptId/prerequisite/:prereqId" element={
          <ProtectedRoute><ConceptDetailPageContainer /></ProtectedRoute>
        } />
        <Route path="/concepts/:graphId/concept/:conceptId" element={
          <ProtectedRoute><ConceptDetailPageContainer /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
