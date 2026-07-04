import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getFileUrl } from '../utils/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Bell, Heart, MessageSquare, UserPlus, CheckCircle2, XCircle, 
  Loader2, Trash2, CheckCheck, Play, ShieldAlert 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const playNotificationSound = (type = 'notification') => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'call') {
      // Periodic ring: double chirp chime
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(580, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } else {
      // Sweet high notification chime
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.22);
    }
  } catch (err) {
    console.warn('Audio context blocked by browser autoplay settings:', err);
  }
};

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query: Get notifications list
  const { data, isLoading, error } = useQuery({
    queryKey: ['notificationsList'],
    queryFn: async () => {
      const res = await api.get('/api/notifications');
      return res.data;
    },
    enabled: !!user,
  });

  // Mutation: Mark all as read
  const markReadMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/api/notifications/read');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsList'] });
      toast.success('All notifications marked as read');
    },
  });

  // Automatically mark all as read when opening notifications page
  useEffect(() => {
    if (user && data?.unreadCount > 0) {
      markReadMutation.mutate();
    }
  }, [user, data?.unreadCount]);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const getIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500 fill-current" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-accent" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-blue-400" />;
      case 'approval':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'reject':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Bell className="h-4 w-4 text-purple-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 min-h-screen relative z-10">
      <div className="absolute top-[10%] right-[-10%] w-[35vw] h-[35vw] bg-purple-900/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="flex items-center justify-between border-b border-purple-950/30 pb-5 mb-6">
        <div>
          <span className="text-[10px] text-indian-gold font-bold tracking-[0.25em] uppercase">Inbox updates</span>
          <h1 className="font-accent text-3xl font-bold text-white tracking-wide mt-1">Notifications</h1>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markReadMutation.mutate()}
            disabled={markReadMutation.isLoading}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-white border border-purple-900/30 hover:border-purple-800 bg-[#0d0a16]/40 px-3.5 py-2 rounded-xl transition-all font-semibold"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : error ? (
        <div className="glass-panel p-12 text-center text-red-400 border-red-950/50">
          Failed to load notifications. Please check your server connection.
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-panel p-20 text-center text-gray-500 border-purple-950/20 bg-[#0c0a13]/30">
          <Bell className="h-10 w-10 text-gray-700 mx-auto mb-4 animate-bounce" />
          No notifications yet. Social activities like follow, like, and comment alerts will show up here.
        </div>
      ) : (
        <div className="space-y-3.5">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`glass-panel p-4.5 rounded-2xl border transition-all flex items-center gap-4 ${
                !notif.isRead 
                  ? 'border-purple-800/40 bg-[#160e22]/30 ring-1 ring-purple-500/10' 
                  : 'border-purple-950/20 bg-[#0d0a15]/30'
              }`}
            >
              {/* Type Icon Badge */}
              <div className="p-2.5 bg-purple-950/40 rounded-xl border border-purple-900/30 shrink-0">
                {getIcon(notif.type)}
              </div>

              {/* Notification Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {notif.sender && (
                    <Link to={`/profile/${notif.sender._id}`} className="font-bold text-xs text-white hover:text-accent hover:underline truncate">
                      {notif.sender.name}
                    </Link>
                  )}
                  <span className="text-[9px] text-gray-500 font-mono">
                    {new Date(notif.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{notif.message}</p>
              </div>

              {/* Action Buttons based on notification type */}
              {notif.relatedId && (notif.type === 'like' || notif.type === 'comment' || notif.type === 'approval') && (
                <Link
                  to={`/certificates/${notif.relatedId}`}
                  className="shrink-0 text-[10px] font-bold text-accent hover:text-white border border-accent/20 hover:bg-accent bg-accent/5 px-3 py-1.5 rounded-xl transition-all"
                >
                  View
                </Link>
              )}

              {notif.type === 'follow' && notif.sender && (
                <Link
                  to={`/profile/${notif.sender._id}`}
                  className="shrink-0 text-[10px] font-bold text-accent hover:text-white border border-accent/20 hover:bg-accent bg-accent/5 px-3 py-1.5 rounded-xl transition-all"
                >
                  Profile
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
