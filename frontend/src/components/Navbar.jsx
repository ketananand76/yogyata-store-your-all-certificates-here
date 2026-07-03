import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { socketUrl, getFileUrl } from '../utils/api';
import { io } from 'socket.io-client';
import { 
  Award, Shield, LogOut, Home, Search, FolderOpen, 
  MessageSquare, User, Bell, ShieldAlert, Briefcase
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

  // Query: Fetch direct message unread counts
  const { data: unreadChatData } = useQuery({
    queryKey: ['chatsUnreadNavbar'],
    queryFn: async () => {
      const res = await api.get('/api/messages/unread/counts');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 20000,
  });

  // Calculate unread chat total
  const unreadChatTotal = unreadChatData?.success && unreadChatData.counts
    ? Object.values(unreadChatData.counts).reduce((acc, count) => acc + count, 0)
    : 0;

  const unreadNotifCount = notifData?.unreadCount || 0;

  // Synthesize Sound Notification
  const triggerAudioChime = (type = 'notification') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'chat') {
        // High soft chime for DMs
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(680, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1020, audioCtx.currentTime + 0.12);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      } else {
        // Double chime alert for notifications
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.22);
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

    // Play chime on incoming direct message
    socket.on('receive-message', (msg) => {
      // Play sound only if not currently chatting in the lobby
      if (location.pathname !== '/chat' && String(msg.sender?._id || msg.sender) !== String(user._id)) {
        triggerAudioChime('chat');
        toast(`New direct message`, { icon: '💬' });
        queryClient.invalidateQueries({ queryKey: ['chatsUnreadNavbar'] });
      }
    });

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
      <nav className="sticky top-0 z-50 bg-[#0c0a14]/90 backdrop-blur-md border-b border-purple-950/40">
        <div className="h-[3px] w-full bg-gradient-to-r from-indian-saffron via-white to-indian-emerald"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Brand Logo */}
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

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive('/') ? 'text-accent text-glow-purple' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Home className="h-4 w-4" /> Home
              </Link>

              {/* Admin Panel Link */}
              {admin && (
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
              )}

              {/* Logged-in Seeker Navigation */}
              {user && (
                <>
                  {/* Search Link */}
                  <Link
                    to="/search"
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      isActive('/search') ? 'text-accent text-glow-purple' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <Search className="h-4 w-4 text-purple-400" /> Search
                  </Link>

                  {/* Jobs Link */}
                  <Link
                    to="/jobs"
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      isActive('/jobs') ? 'text-accent text-glow-purple' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <Briefcase className="h-4 w-4 text-purple-400" /> Jobs
                  </Link>

                  {/* Chat Link with Badges */}
                  <Link
                    to="/chat"
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors relative ${
                      isActive('/chat') ? 'text-accent text-glow-purple' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-purple-400" /> Chat
                    {unreadChatTotal > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-accent text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                        {unreadChatTotal}
                      </span>
                    )}
                  </Link>

                  {/* Notifications Link with Badges */}
                  <Link
                    to="/notifications"
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors relative ${
                      isActive('/notifications') ? 'text-accent text-glow-purple' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <Bell className="h-4 w-4 text-purple-400" /> Notifications
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-red-650 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                        {unreadNotifCount}
                      </span>
                    )}
                  </Link>

                  {/* Vault Link */}
                  <Link
                    to="/dashboard"
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      isActive('/dashboard') ? 'text-accent text-glow-purple' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <FolderOpen className="h-4 w-4 text-purple-400" /> Vault
                  </Link>

                  {/* Profile Link */}
                  <Link
                    to={`/profile/${user._id}`}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      isActive(`/profile/${user._id}`) ? 'text-accent text-glow-purple' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <User className="h-4 w-4 text-purple-400" /> Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors border border-red-500/20 hover:border-red-500/40 px-3.5 py-1.5 rounded-lg bg-red-950/10 hover:bg-red-950/20"
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
                    className="text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-accent hover:bg-accent-dark text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                  >
                    Join Vault
                  </Link>
                  <span className="text-gray-700">|</span>
                  <Link
                    to="/admin/login"
                    className="text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors"
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[150] bg-[#0c0a14]/95 border-t border-purple-950/50 backdrop-blur-md px-4 py-2.5 flex items-center justify-around shadow-2xl">
          {/* 1. Home */}
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/') ? 'text-accent' : 'text-gray-500'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          {/* 2. Search */}
          <Link
            to="/search"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/search') ? 'text-accent' : 'text-gray-500'
            }`}
          >
            <Search className="h-5 w-5" />
            <span>Search</span>
          </Link>

          {/* 3. Direct Chat */}
          <Link
            to="/chat"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
              isActive('/chat') ? 'text-accent' : 'text-gray-500'
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span>Chat</span>
            {unreadChatTotal > 0 && (
              <span className="absolute -top-1 right-1 bg-accent text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {unreadChatTotal}
              </span>
            )}
          </Link>

          {/* Jobs */}
          <Link
            to="/jobs"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/jobs') ? 'text-accent' : 'text-gray-500'
            }`}
          >
            <Briefcase className="h-5 w-5" />
            <span>Jobs</span>
          </Link>

          {/* 4. Notifications */}
          <Link
            to="/notifications"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
              isActive('/notifications') ? 'text-accent' : 'text-gray-500'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span>Alerts</span>
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 right-1 bg-red-650 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {unreadNotifCount}
              </span>
            )}
          </Link>

          {/* 5. Vault Dashboard */}
          <Link
            to="/dashboard"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/dashboard') ? 'text-accent' : 'text-gray-500'
            }`}
          >
            <FolderOpen className="h-5 w-5" />
            <span>Vault</span>
          </Link>
        </div>
      )}
    </>
  );
}
