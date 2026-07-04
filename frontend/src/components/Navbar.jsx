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
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-purple-950/10 shadow-sm hover:shadow-purple-500/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Brand Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="bg-gradient-to-tr from-accent via-indigo-500 to-cyan-400 p-1.5 rounded-xl shadow-lg shadow-purple-500/15 group-hover:rotate-12 group-hover:scale-105 transition-all duration-300">
                  <Award className="h-5.5 w-5.5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-accent text-md font-extrabold tracking-wider text-slate-900 flex items-center gap-1 group-hover:text-accent transition-colors">
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
                    ? 'bg-purple-600/5 text-accent text-glow-purple' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
                        ? 'bg-purple-600/5 text-accent' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="h-4 w-4 text-indian-gold" /> Admin Panel
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-650 hover:text-red-700 transition-all border border-red-200/50 hover:border-red-300 px-3.5 py-1.5 rounded-xl bg-red-500/5"
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
                        ? 'bg-purple-600/5 text-accent' 
                        : 'text-slate-605 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Search className="h-4 w-4 text-purple-500" /> Search
                  </Link>

                  <Link
                    to="/jobs"
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                      isActive('/jobs') 
                        ? 'bg-purple-600/5 text-accent' 
                        : 'text-slate-605 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Briefcase className="h-4 w-4 text-purple-500" /> Jobs
                  </Link>

                  <Link
                    to="/chat"
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all relative ${
                      isActive('/chat') 
                        ? 'bg-purple-600/5 text-accent' 
                        : 'text-slate-605 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-purple-500" /> Chat
                    {unreadChatTotal > 0 && (
                      <span className="absolute -top-1 -right-1 bg-accent text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-md">
                        {unreadChatTotal}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/notifications"
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all relative ${
                      isActive('/notifications') 
                        ? 'bg-purple-600/5 text-accent' 
                        : 'text-slate-605 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Bell className="h-4 w-4 text-purple-500" /> Alerts
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
                        ? 'bg-purple-600/5 text-accent' 
                        : 'text-slate-605 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <FolderOpen className="h-4 w-4 text-purple-500" /> Vault
                  </Link>

                  <Link
                    to="/premium"
                    className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all ${
                      isActive('/premium') 
                        ? 'bg-amber-500/10 text-amber-600' 
                        : 'text-amber-500 hover:text-amber-650 hover:bg-amber-500/5'
                    }`}
                  >
                    <Sparkles className={`h-4 w-4 ${user?.isPremium ? 'text-amber-500 fill-current animate-pulse' : 'text-amber-400'}`} /> Premium
                  </Link>

                  <Link
                    to={`/profile/${user._id}`}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                      isActive(`/profile/${user._id}`) 
                        ? 'bg-purple-600/5 text-accent' 
                        : 'text-slate-605 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <User className="h-4 w-4 text-purple-500" /> Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-650 hover:text-red-700 transition-all border border-red-200/50 hover:border-red-300 px-3.5 py-1.5 rounded-xl bg-red-500/5"
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
                    className="text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors"
                  >
                    Member Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-accent via-indigo-600 to-indigo-700 hover:opacity-95 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-500/15 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Join Vault
                  </Link>
                  <span className="text-slate-200">|</span>
                  <Link
                    to="/admin/login"
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[150] bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-around shadow-2xl">
          {/* 1. Home */}
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/') ? 'text-accent' : 'text-slate-400'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          {/* 2. Search */}
          <Link
            to="/search"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/search') ? 'text-accent' : 'text-slate-400'
            }`}
          >
            <Search className="h-5 w-5" />
            <span>Search</span>
          </Link>

          {/* 3. Direct Chat */}
          <Link
            to="/chat"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
              isActive('/chat') ? 'text-accent' : 'text-slate-400'
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
              isActive('/jobs') ? 'text-accent' : 'text-slate-400'
            }`}
          >
            <Briefcase className="h-5 w-5" />
            <span>Jobs</span>
          </Link>

          {/* 4. Notifications */}
          <Link
            to="/notifications"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
              isActive('/notifications') ? 'text-accent' : 'text-slate-400'
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
              isActive('/dashboard') ? 'text-accent' : 'text-slate-400'
            }`}
          >
            <FolderOpen className="h-5 w-5" />
            <span>Vault</span>
          </Link>

          {/* 6. Premium Upgrade */}
          <Link
            to="/premium"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/premium') ? 'text-amber-600' : 'text-slate-400'
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
