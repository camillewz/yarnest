import { Navigate, type RouteObject } from 'react-router';
import { JournalPage } from '../features/projects/JournalPage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { ProjectFormPage } from '../features/projects/ProjectFormPage';
import { ProjectListPage } from '../features/projects/ProjectListPage';
import { ReviewPage } from '../features/reviews/ReviewPage';
import { SessionPage } from '../features/sessions/SessionPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { AppShell } from './AppShell';

/** Les 7 routes de docs/SPEC.md, section 6, et le journal tous projets (UI v1.1). */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <ProjectListPage /> },
      { path: '/projects/new', element: <ProjectFormPage /> },
      { path: '/projects/:id', element: <ProjectDetailPage /> },
      { path: '/projects/:id/edit', element: <ProjectFormPage /> },
      { path: '/session', element: <SessionPage /> },
      { path: '/sessions/:id/review', element: <ReviewPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/journal', element: <JournalPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
