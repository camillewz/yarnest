import { Navigate, type RouteObject } from 'react-router';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { ProjectFormPage } from '../features/projects/ProjectFormPage';
import { ProjectListPage } from '../features/projects/ProjectListPage';
import { ReviewPage } from '../features/reviews/ReviewPage';
import { SessionPage } from '../features/sessions/SessionPage';
import { SettingsPage } from '../features/settings/SettingsPage';

/** Les 7 routes de docs/SPEC.md, section 6. */
export const routes: RouteObject[] = [
  { path: '/', element: <ProjectListPage /> },
  { path: '/projects/new', element: <ProjectFormPage /> },
  { path: '/projects/:id', element: <ProjectDetailPage /> },
  { path: '/projects/:id/edit', element: <ProjectFormPage /> },
  { path: '/session', element: <SessionPage /> },
  { path: '/sessions/:id/review', element: <ReviewPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
];
