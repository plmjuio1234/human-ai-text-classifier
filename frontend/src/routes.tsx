/**
 * Application routing configuration
 * Defines all application routes and page layouts
 */

import type { ReactNode } from 'react';
import PredictPage from './pages/PredictPage';
import BatchPage from './pages/BatchPage';
import MonitoringPage from './pages/MonitoringPage';
import StatusPage from './pages/StatusPage';

export interface Route {
  path: string;
  element: ReactNode;
  name: string;
  icon?: string;
}

/**
 * Main application routes
 * Order matters for navigation menus
 */
export const routes: Route[] = [
  {
    path: '/',
    element: <PredictPage />,
    name: 'Predict',
    icon: '🎯',
  },
  {
    path: '/batch',
    element: <BatchPage />,
    name: 'Batch Analysis',
    icon: '📦',
  },
  {
    path: '/monitoring',
    element: <MonitoringPage />,
    name: 'Real-time Monitor',
    icon: '📊',
  },
  {
    path: '/status',
    element: <StatusPage />,
    name: 'System Status',
    icon: '⚙️',
  },
];

/**
 * Get navigation items (excludes full paths)
 */
export const getNavItems = (): Omit<Route, 'element'>[] => {
  return routes.map(route => ({
    path: route.path,
    name: route.name,
    icon: route.icon,
  }));
};
