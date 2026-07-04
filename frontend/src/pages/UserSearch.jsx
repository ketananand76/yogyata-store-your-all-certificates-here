import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Search, UserPlus, UserCheck, Loader2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const { user: currentUser, checkAuth } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Query: Search users
  const { data, isLoading } = useQuery({
    queryKey: ['searchUsers', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await api.get(`/api/social/search?q=${query.trim()}`);
      return res.data.users;
    },
    enabled: query.trim().length > 0,
  });

  // Mutation: Follow/Unfollow user
  const followMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/api/social/follow/${id}`);
      return { id, data: res.data };
    },
    onSuccess: ({ id, data: resData }) => {
      toast.success(resData.message);
      queryClient.invalidateQueries({ queryKey: ['searchUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', id] });
      queryClient.invalidateQueries({ queryKey: ['chatContacts'] });
      checkAuth();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Action failed');
    },
  });

  const handleFollowClick = (e, targetUserId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      toast.error('Please login to follow users');
      return navigate('/login');
    }
    followMutation.mutate(targetUserId);
  };

  const users = data || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 min-h-screen relative z-10">
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-indian-gold font-bold tracking-[0.2em] uppercase">Connect with peers</span>
          <h1 className="font-accent text-3xl font-bold text-white tracking-wide mt-1">Search Users</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            Search developer profiles by name or email, follow accounts, and start messaging
          </p>
        </div>
      </div>

      {/* Search Input bar */}
      <div className="glass-panel rounded-2xl p-4 mb-6 border-purple-950/40 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type="text"
            placeholder="Type developer name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none transition-all placeholder:text-gray-600"
          />
        </div>
      </div>

      {/* Results lists */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : query.trim() && users.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl border-purple-950/20 text-center text-gray-500">
          No users match your query. Try a different name or email.
        </div>
      ) : !query.trim() ? (
        <div className="glass-panel p-16 rounded-2xl border-purple-950/20 text-center text-gray-500">
          Enter a search query above to explore user profiles.
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((u) => {
            const isFollowing = currentUser && u.followers?.some(f => String(f._id || f) === String(currentUser._id));
            const isFollowerOfMe = currentUser && (currentUser.followers?.some((f) => String(f._id || f) === String(u._id)) || u.following?.some((f) => String(f._id || f) === String(currentUser._id)));
            return (
              <Link
                key={u._id}
                to={`/profile/${u._id}`}
                className="block glass-panel rounded-2xl p-4 border-purple-950/30 hover:border-purple-800/40 hover:bg-[#121020]/50 transition-all shadow-xl"
              >
                <div className="flex items-center gap-4">
                  {/* Photo */}
                  <div className="w-12 h-12 rounded-full bg-purple-950/30 border border-purple-800/40 flex items-center justify-center font-accent text-lg font-bold text-purple-300 overflow-hidden shrink-0">
                    {u.profilePicture ? (
                      <img
                        src={getFileUrl(u.profilePicture)}
                        alt={u.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      u.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Name/Bio info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">{u.name}</h3>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{u.email}</p>
                    {u.bio && <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 leading-relaxed">{u.bio}</p>}
                  </div>

                  {/* Follow Trigger */}
                  <button
                    onClick={(e) => handleFollowClick(e, u._id)}
                    disabled={followMutation.isLoading}
                    className={`p-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isFollowing
                        ? 'border border-purple-900/60 bg-[#120f26] text-purple-300 hover:bg-purple-950/20'
                        : 'bg-accent hover:bg-accent-dark text-white shadow shadow-purple-500/10'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-4 w-4" />
                        <span className="hidden sm:inline">Following</span>
                      </>
                    ) : isFollowerOfMe ? (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Follow Back</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Follow</span>
                      </>
                    )}
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
