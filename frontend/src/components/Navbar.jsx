import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { socketUrl, getFileUrl } from '../utils/api';
import { io } from 'socket.io-client';
import { 
  Award, Shield, LogOut, Home, Search, FolderOpen, 
  MessageSquare, User, Bell, ShieldAlert, Briefcase, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { admin, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isActive = (path) => location.pathname === path;

  // Query: Fetch unread notification list and counts
  const { data: notifData } = useQuery({
    queryKey: ['notificationsCountNavbar'],
    queryFn: async () => {
      const res = await api.get('/api/notifications');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 20000, // Poll every 20s as fallback
  });

  // Query: Fetch direct message unread counts (DISABLED for Career platform)
  const unreadChatTotal = 0;
  const unreadNotifCount = notifData?.unreadCount || 0;

  // Synthesize Sound Notification
  const triggerAudioChime = (type = 'notification') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playTone = (freq, duration, typeOsc = 'triangle', delay = 0, gainVal = 0.5) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = typeOsc;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        
        // Envelope: quick attack, slow decay
        gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(gainVal, audioCtx.currentTime + delay + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
        
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + duration);
      };

      if (type === 'chat') {
        // Loud, distinct messaging sound: high triple-beep
        playTone(980, 0.12, 'sine', 0, 0.65);
        playTone(1170, 0.12, 'sine', 0.08, 0.65);
        playTone(1390, 0.16, 'sine', 0.16, 0.65);
      } else {
        // Loud, distinct alert notification sound: Sci-Fi double chime
        playTone(880, 0.15, 'sawtooth', 0, 0.55);
        playTone(1760, 0.25, 'sawtooth', 0.12, 0.55);
      }
    } catch (err) {
      console.warn('Audio autoplay blocked by browser settings:', err);
    }
  };

  // WebSocket Live alerts listener
  useEffect(() => {
    if (!user) return;

    const socket = io(socketUrl);
    socket.emit('register-user', user._id);

    // Play chime on incoming notification
    socket.on('new-notification', (notif) => {
      triggerAudioChime('notification');
      toast(`Notification: ${notif.message}`, { icon: '🔔' });
      queryClient.invalidateQueries({ queryKey: ['notificationsCountNavbar'] });
    });

    // Direct message socket listeners disabled for Career platform MVP

    return () => {
      socket.disconnect();
    };
  }, [user, location.pathname, queryClient]);

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      toast.success('Logged out successfully');
      navigate('/');
    } else {
      toast.error('Logout failed');
    }
  };

  return (
    <>
      {/* ========================================== */}
      {/* 💻 TOP NAVBAR: DESKTOP LAYOUT              */}
      {/* ========================================== */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-purple-950/20 shadow-lg transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Brand Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="bg-gradient-to-tr from-accent via-indigo-500 to-cyan-400 p-1.5 rounded-xl shadow-lg shadow-purple-500/15 group-hover:rotate-12 group-hover:scale-105 transition-all duration-300">
                  <Award className="h-5.5 w-5.5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-accent text-md font-extrabold tracking-wider text-white flex items-center gap-1 group-hover:text-accent transition-colors">
                    YOGYATA <span className="text-[10px] text-slate-400 font-normal tracking-normal font-sans">योग्यता</span>
                  </span>
                  <span className="text-[8px] text-purple-600/80 uppercase font-bold tracking-[0.25em] -mt-0.5">
                    Showcase Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-5">
              <Link
                to="/"
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                  isActive('/') 
                    ? 'bg-purple-600/10 text-accent text-glow-purple' 
                    : 'text-gray-300 hover:text-white hover:bg-purple-950/20'
                }`}
              >
                <Home className="h-4 w-4" /> Home
              </Link>

              {/* Admin Panel Link */}
              {admin && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                      isActive('/admin/dashboard') 
                        ? 'bg-purple-600/10 text-accent' 
                        : 'text-gray-300 hover:text-white hover:bg-purple-950/20'
                    }`}
                  >
                    <Shield className="h-4 w-4 text-indian-gold" /> Admin Panel
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-all border border-red-500/20 hover:border-red-400 px-3.5 py-1.5 rounded-xl bg-red-950/15"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              )}

              {/* Logged-in Seeker Navigation */}
              {user && (
                <>
                  <Link
                    to="/search"
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                      isActive('/search') 
                        ? 'bg-purple-600/10 text-accent' 
                        : 'text-gray-300 hover:text-white hover:bg-purple-950/20'
                    }`}
                  >
                    <Search className="h-4 w-4 text-purple-400" /> Search
                  </Link>

                  <Link
                    to="/jobs"
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                      isActive('/jobs') 
                        ? 'bg-purple-600/10 text-accent' 
                        : 'text-gray-300 hover:text-white hover:bg-purple-950/20'
                    }`}
                  >
                    <Briefcase className="h-4 w-4 text-purple-400" /> Jobs
                  </Link>

                  <Link
                    to="/notifications"
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all relative ${
                      isActive('/notifications') 
                        ? 'bg-purple-600/10 text-accent' 
                        : 'text-gray-300 hover:text-white hover:bg-purple-950/20'
                    }`}
                  >
                    <Bell className="h-4 w-4 text-purple-400" /> Alerts
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-md">
                        {unreadNotifCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/dashboard"
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                      isActive('/dashboard') 
                        ? 'bg-purple-600/10 text-accent' 
                        : 'text-gray-300 hover:text-white hover:bg-purple-950/20'
                    }`}
                  >
                    <FolderOpen className="h-4 w-4 text-purple-400" /> Vault
                  </Link>

                  <Link
                    to="/premium"
                    className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all ${
                      isActive('/premium') 
                        ? 'bg-amber-500/20 text-amber-500' 
                        : 'text-amber-500 hover:text-amber-400 hover:bg-amber-950/15'
                    }`}
                  >
                    <Sparkles className={`h-4 w-4 ${user?.isPremium ? 'text-amber-500 fill-current animate-pulse' : 'text-amber-400'}`} /> Premium
                  </Link>

                  <Link
                    to={`/profile/${user._id}`}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                      isActive(`/profile/${user._id}`) 
                        ? 'bg-purple-600/10 text-accent' 
                        : 'text-gray-300 hover:text-white hover:bg-purple-950/20'
                    }`}
                  >
                    <User className="h-4 w-4 text-purple-400" /> Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-all border border-red-500/20 hover:border-red-400 px-3.5 py-1.5 rounded-xl bg-red-950/15"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              )}

              {/* Guest Access Navigation */}
              {!admin && !user && (
                <div className="flex items-center gap-4">
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-gray-350 hover:text-white transition-colors"
                  >
                    Member Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-accent via-indigo-600 to-indigo-700 hover:opacity-95 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-500/15 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Join Vault
                  </Link>
                  <span className="text-purple-950/50">|</span>
                  <Link
                    to="/admin/login"
                    className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                    title="Admin Access"
                  >
                    Admin
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ========================================== */}
      {/* 📱 MOBILE BOTTOM DOCK BAR: PORTABLE NAV     */}
      {/* ========================================== */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[150] glass-panel border-t border-purple-950/20 px-4 py-2.5 flex items-center justify-around shadow-2xl rounded-t-2xl">
          {/* 1. Home */}
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/') ? 'text-accent text-glow-purple' : 'text-gray-400'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          {/* 2. Search */}
          <Link
            to="/search"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/search') ? 'text-accent text-glow-purple' : 'text-gray-400'
            }`}
          >
            <Search className="h-5 w-5" />
            <span>Search</span>
          </Link>

          {/* Jobs */}
          <Link
            to="/jobs"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/jobs') ? 'text-accent text-glow-purple' : 'text-gray-400'
            }`}
          >
            <Briefcase className="h-5 w-5" />
            <span>Jobs</span>
          </Link>

          {/* 4. Notifications */}
          <Link
            to="/notifications"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
              isActive('/notifications') ? 'text-accent text-glow-purple' : 'text-gray-400'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span>Alerts</span>
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {unreadNotifCount}
              </span>
            )}
          </Link>

          {/* 5. Vault Dashboard */}
          <Link
            to="/dashboard"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/dashboard') ? 'text-accent text-glow-purple' : 'text-gray-400'
            }`}
          >
            <FolderOpen className="h-5 w-5" />
            <span>Vault</span>
          </Link>

          {/* 6. Premium Upgrade */}
          <Link
            to="/premium"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/premium') ? 'text-amber-500' : 'text-gray-400'
            }`}
          >
            <Sparkles className={`h-5 w-5 ${user?.isPremium ? 'text-amber-500 fill-current animate-pulse' : ''}`} />
            <span>Premium</span>
          </Link>
        </div>
      )}
    </>
  );
}
