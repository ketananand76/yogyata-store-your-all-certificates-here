import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Award, Shield, LogOut, Menu, X, Home, Grid } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      toast.success('Logged out successfully');
      navigate('/');
    } else {
      toast.error('Logout failed');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-[#0c0a14]/90 backdrop-blur-md border-b border-purple-950/40">
      {/* Decorative top strip with Indian Saffron and Emerald accents */}
      <div className="h-[3px] w-full bg-gradient-to-r from-indian-saffron via-white to-indian-emerald"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-gradient-to-tr from-accent to-indian-saffron p-1.5 rounded-lg shadow-lg shadow-purple-500/10 group-hover:scale-105 transition-transform">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-accent text-lg font-bold tracking-wider bg-gradient-to-r from-white via-purple-300 to-indian-gold bg-clip-text text-transparent">
                  YOGYATA
                </span>
                <span className="text-[9px] text-purple-400/80 uppercase font-medium tracking-[0.2em] -mt-1">
                  योग्यता • Showcase
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive('/') ? 'text-accent text-glow-purple' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Home className="h-4 w-4" /> Home
            </Link>
            <Link
              to="/certificates"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive('/certificates') ? 'text-accent text-glow-purple' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Grid className="h-4 w-4" /> Gallery
            </Link>

            {admin ? (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    isActive('/admin/dashboard') ? 'text-accent text-glow-purple' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Shield className="h-4 w-4 text-indian-gold" /> Admin Panel
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors border border-red-500/20 hover:border-red-500/40 px-3.5 py-1.5 rounded-lg bg-red-950/10 hover:bg-red-950/20"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <Link
                to="/admin/login"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive('/admin/login') ? 'text-accent' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Shield className="h-4 w-4" /> Admin Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-purple-950/20 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#0c0a14] border-b border-purple-950/50 px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium ${
              isActive('/') ? 'bg-purple-950/30 text-accent' : 'text-gray-300 hover:bg-purple-950/10'
            }`}
          >
            <Home className="h-5 w-5" /> Home
          </Link>
          <Link
            to="/certificates"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium ${
              isActive('/certificates') ? 'bg-purple-950/30 text-accent' : 'text-gray-300 hover:bg-purple-950/10'
            }`}
          >
            <Grid className="h-5 w-5" /> Gallery
          </Link>

          {admin ? (
            <>
              <Link
                to="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/admin/dashboard') ? 'bg-purple-950/30 text-accent' : 'text-gray-300 hover:bg-purple-950/10'
                }`}
              >
                <Shield className="h-5 w-5 text-indian-gold" /> Admin Panel
              </Link>
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-red-950/20"
              >
                <LogOut className="h-5 w-5" /> Logout
              </button>
            </>
          ) : (
            <Link
              to="/admin/login"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium ${
                isActive('/admin/login') ? 'bg-purple-950/30 text-accent' : 'text-gray-300 hover:bg-purple-950/10'
              }`}
            >
              <Shield className="h-5 w-5" /> Admin Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
