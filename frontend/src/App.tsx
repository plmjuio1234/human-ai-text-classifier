/**
 * Main Application Component
 * Sets up routing, navigation, and page layout
 */

import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { routes, getNavItems } from './routes';
import './index.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const navItems = getNavItems();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar Navigation */}
          <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <h1 className="text-2xl font-bold text-ai-600">AI Detector</h1>
              <p className="text-sm text-gray-600 mt-1">Text Analysis System</p>
            </div>

            <nav className="p-4">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-ai-50 hover:text-ai-600 transition-colors font-medium"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Footer Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
              <div className="text-xs text-gray-600 space-y-1">
                <p>Backend: http://localhost:8000</p>
                <p className="mt-2">v1.0.0</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-8">
              <Routes>
                {routes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={route.element}
                  />
                ))}
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
