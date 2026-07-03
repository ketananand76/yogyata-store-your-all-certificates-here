import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

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
    <div className="flex flex-col min-h-screen relative bg-dark-bg">
      {/* Decorative vector background */}
      <div className="absolute inset-0 bg-mandala-pattern bg-center pointer-events-none opacity-25"></div>
      
      <Navbar />
      <main className="flex-1 w-full relative z-10">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#12111d',
                color: '#f3f4f6',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '12px',
              },
              success: {
                iconTheme: {
                  primary: '#a855f7',
                  secondary: '#f3f4f6',
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
            <Route
              path="/certificates"
              element={
                <AppLayout>
                  <Certificates />
                </AppLayout>
              }
            />
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
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
