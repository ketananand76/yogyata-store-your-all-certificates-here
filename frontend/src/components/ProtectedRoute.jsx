import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center flex-col gap-4">
        {/* Sanskrit styled spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-t-accent border-r-indian-saffron border-b-indian-emerald border-l-purple-900 animate-spin"></div>
          <div className="absolute inset-2 rounded-full bg-dark-bg border border-purple-950 flex items-center justify-center">
            <span className="text-[10px] font-accent text-indian-gold font-bold">ॐ</span>
          </div>
        </div>
        <p className="text-sm text-purple-400 font-medium tracking-wider animate-pulse">
          Verifying credentials...
        </p>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
