import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ThemeToggle from './components/ThemeToggle';

// Layout & Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Certificates from './pages/Certificates';
import CertificateDetail from './pages/CertificateDetail';
import Login from './pages/Login'; // Admin Login
import Dashboard from './pages/Dashboard'; // Admin Dashboard
import CertificateForm from './pages/CertificateForm'; // Admin Form

// User Portal Pages
import Register from './pages/Register';
import UserLogin from './pages/UserLogin';
import UserDashboard from './pages/UserDashboard';

// Social network pages
import Settings from './pages/Settings';
import UserProfile from './pages/UserProfile';
import UserSearch from './pages/UserSearch';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Jobs from './pages/Jobs';
import Premium from './pages/Premium';

// Initialize React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Decorative vector background */}
      <div className="absolute inset-0 bg-mandala-pattern bg-center pointer-events-none opacity-5"></div>
      
      <Navbar />
      <main className="flex-1 w-full relative z-10 pb-20 md:pb-0">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('yogyata-theme') || 'dark';
    const customColor = localStorage.getItem('yogyata-custom-color') || '#7c3aed';

    if (savedTheme === 'device') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isSystemDark ? 'dark' : 'light');
    } else if (savedTheme === 'custom') {
      document.documentElement.setAttribute('data-theme', 'custom');
      document.documentElement.style.setProperty('--custom-accent', customColor);
      
      const adjustColor = (col, amt) => {
        let usePound = false;
        if (col[0] === "#") {
          col = col.slice(1);
          usePound = true;
        }
        let num = parseInt(col, 16);
        let r = (num >> 16) + amt;
        if (r > 255) r = 255; else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amt;
        if (b > 255) b = 255; else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amt;
        if (g > 255) g = 255; else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
      };
      
      document.documentElement.style.setProperty('--custom-accent-light', adjustColor(customColor, 30));
      document.documentElement.style.setProperty('--custom-accent-dark', adjustColor(customColor, -30));
      document.documentElement.style.setProperty('--custom-accent-glow', `${customColor}15`);
    } else {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#ffffff',
                color: '#1e293b',
                border: '1px solid rgba(124, 58, 237, 0.15)',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
              },
              success: {
                iconTheme: {
                  primary: '#7c3aed',
                  secondary: '#ffffff',
                },
              },
            }}
          />
          <Routes>
            {/* Public Routes with standard Layout */}
            <Route
              path="/"
              element={
                <AppLayout>
                  <Home />
                </AppLayout>
              }
            />
            <Route path="/certificates" element={<Navigate to="/" replace />} />
            <Route
              path="/certificates/:id"
              element={
                <AppLayout>
                  <CertificateDetail />
                </AppLayout>
              }
            />
            
            {/* User Portal Auth Routes */}
            <Route
              path="/register"
              element={
                <AppLayout>
                  <Register />
                </AppLayout>
              }
            />
            <Route
              path="/login"
              element={
                <AppLayout>
                  <UserLogin />
                </AppLayout>
              }
            />

            {/* User Dashboard Portal */}
            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <UserDashboard />
                </AppLayout>
              }
            />

            {/* Premium Upgrade Portal */}
            <Route
              path="/premium"
              element={
                <AppLayout>
                  <Premium />
                </AppLayout>
              }
            />

            {/* Social Network Routes */}
            <Route
              path="/profile/:id"
              element={
                <AppLayout>
                  <UserProfile />
                </AppLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <AppLayout>
                  <Settings />
                </AppLayout>
              }
            />
            <Route
              path="/notifications"
              element={
                <AppLayout>
                  <Notifications />
                </AppLayout>
              }
            />
            <Route
              path="/search"
              element={
                <AppLayout>
                  <UserSearch />
                </AppLayout>
              }
            />
            <Route
              path="/chat"
              element={
                <AppLayout>
                  <Chat />
                </AppLayout>
              }
            />
            <Route
              path="/jobs"
              element={
                <AppLayout>
                  <Jobs />
                </AppLayout>
              }
            />

            {/* Admin Authentication Portal */}
            <Route
              path="/admin/login"
              element={
                <AppLayout>
                  <Login />
                </AppLayout>
              }
            />

            {/* Protected Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/add"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CertificateForm />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/edit/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CertificateForm />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ThemeToggle />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
