import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getFileUrl } from '../utils/api';
import { 
  ThumbsUp, MessageSquare, Share2, Send, ShieldCheck, Loader2, 
  FileText, ArrowRight, Award, Plus, CheckCircle2, ExternalLink, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const { user, checkAuth } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCommentIds, setExpandedCommentIds] = useState({});

  const toggleCommentExpand = (commentId) => {
    setExpandedCommentIds(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  // ----------------------------------------------------
  // QUERIES & MUTATIONS
  // ----------------------------------------------------

  // Guest Spotlight query
  const { data: featuredData, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featuredCertificates'],
    queryFn: async () => {
      const res = await api.get('/api/certificates?featured=true');
      return res.data;
    },
    enabled: !user,
  });

  // Logged-in Social Feed query (Admin or User)
  const { data: feedData, isLoading: loadingFeed } = useQuery({
    queryKey: ['socialFeed'],
    queryFn: async () => {
      const res = await api.get('/api/certificates');
      return res.data;
    },
    enabled: !!user,
  });

  // Fetch lobby users for sidebar follow recommendations
  const { data: lobbyUsers, isLoading: loadingLobby } = useQuery({
    queryKey: ['lobbyUsersHome'],
    queryFn: async () => {
      const res = await api.get('/api/social/users');
      return res.data.users;
    },
    enabled: !!user,
  });

  // Like Mutation
  const likeMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/api/social/like/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialFeed'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Like failed');
    },
  });

  // Comment Mutation
  const commentMutation = useMutation({
    mutationFn: async ({ id, text }) => {
      const res = await api.post(`/api/social/comment/${id}`, { text });
      return res.data;
    },
    onSuccess: (_, variables) => {
      setCommentInputs((prev) => ({ ...prev, [variables.id]: '' }));
      queryClient.invalidateQueries({ queryKey: ['socialFeed'] });
      toast.success('Comment posted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Comment failed');
    },
  });

  // Follow Mutation
  const followMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await api.post(`/api/social/follow/${userId}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['socialFeed'] });
      queryClient.invalidateQueries({ queryKey: ['lobbyUsersHome'] });
      checkAuth(); // Refresh logged-in user profile context for follow arrays
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Action failed');
    },
  });

  const handleLike = (id) => {
    if (!user) {
      toast.error('Please login to like posts');
      return navigate('/login');
    }
    likeMutation.mutate(id);
  };

  const handleCommentSubmit = (e, id) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to comment');
      return navigate('/login');
    }
    const text = commentInputs[id];
    if (!text || !text.trim()) return;

    commentMutation.mutate({ id, text: text.trim() });
  };

  const toggleComments = (id) => {
    setExpandedComments((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = (postId) => {
    const postUrl = `${window.location.origin}/certificates/${postId}`;
    navigator.clipboard.writeText(postUrl);
    toast.success('Link copied to clipboard!', { icon: '🔗' });
  };

  const handleSendToChat = (partnerId) => {
    navigate(`/chat?user=${partnerId}`);
  };

  // ----------------------------------------------------
  // VIEW: LOGGED-IN LINKEDIN-STYLE SOCIAL FEED
  // ----------------------------------------------------
  if (user) {
    const rawFeed = feedData?.certificates || [];
    const feed = rawFeed.filter(post => 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.issuer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.uploadedBy && post.uploadedBy.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    // Filters recommendations (Lobby users whom you aren't following yet)
    const recommendations = lobbyUsers?.filter(
      (u) => String(u._id) !== String(user._id) && !user.following?.includes(u._id)
    ).slice(0, 4) || [];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen relative z-10">
        <div className="absolute top-[5%] left-[-10%] w-[45vw] h-[45vw] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================== */}
          {/* LEFT SIDEBAR: PROFILE SUMMARY (3 columns)   */}
          {/* ========================================== */}
          <div className="lg:col-span-3 space-y-4">
            <div className="glass-panel overflow-hidden rounded-2xl border-purple-950/45 bg-[#0c0a13]/85 shadow-xl">
              {/* Decorative profile banner */}
              <div className="h-16 bg-gradient-to-r from-accent/50 via-purple-900/30 to-accent-dark/50 relative"></div>
              
              {/* Profile Summary info */}
              <div className="px-5 pb-5 text-center -mt-8 relative z-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#0c0a13] border-2 border-purple-900/50 mx-auto flex items-center justify-center font-bold text-lg text-purple-300 overflow-hidden shadow-lg">
                  {user.profilePicture ? (
                    <img src={getFileUrl(user.profilePicture)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                
                <div>
                  <h3 className="font-accent font-bold text-sm text-white hover:underline leading-tight">
                    <Link to={`/profile/${user._id}`}>{user.name}</Link>
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase font-semibold tracking-wider">
                    {user.role === 'seeker' ? 'Developer Profile' : 'Employer Profile'}
                  </p>
                </div>

                <div className="border-t border-purple-950/50 pt-4 flex justify-around text-xs text-gray-400">
                  <div className="text-center flex-1">
                    <span className="block font-bold text-white text-sm">{user.followers?.length || 0}</span>
                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5 block">Followers</span>
                  </div>
                  <div className="w-px bg-purple-950/55 self-stretch"></div>
                  <div className="text-center flex-1">
                    <span className="block font-bold text-white text-sm">{user.following?.length || 0}</span>
                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5 block">Following</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick links shortcut panel */}
            <div className="glass-panel p-4 rounded-2xl border-purple-950/45 bg-[#0c0a13]/85 text-xs space-y-2.5 hidden lg:block">
              <Link to="/certificates" className="block text-gray-400 hover:text-white transition-colors">
                My Vault
              </Link>
              <Link to="/chat" className="block text-gray-400 hover:text-white transition-colors">
                Direct Messages
              </Link>
              <Link to="/search" className="block text-gray-400 hover:text-white transition-colors">
                Explore Directory
              </Link>
            </div>
          </div>

          {/* ========================================== */}
          {/* MIDDLE COLUMN: CREATOR BOX & STREAM (9 col) */}
          {/* ========================================== */}
          <div className="lg:col-span-9 space-y-5">
            {/* Real-time search box */}
            <div className="glass-panel p-4 rounded-2xl border-purple-950/45 bg-[#0c0a13]/85 shadow-lg relative flex items-center">
              <Search className="absolute left-7.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
              <input
                type="text"
                placeholder="Search feed by title, issuer, or developer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#050409] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 pl-10 pr-4 py-2.5 rounded-full text-xs focus:outline-none transition-all placeholder:text-gray-600"
              />
            </div>

            {/* Create Post trigger block */}
            <div className="glass-panel p-4 rounded-2xl border-purple-950/45 bg-[#0c0a13]/85 shadow-lg flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-purple-950 border border-purple-900 flex items-center justify-center font-bold text-xs text-purple-300 overflow-hidden shrink-0">
                {user.profilePicture ? (
                  <img src={getFileUrl(user.profilePicture)} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <Link
                to="/dashboard"
                className="flex-1 bg-[#050409] border border-purple-950/70 hover:border-purple-800/40 text-left px-4 py-2.5 rounded-full text-xs text-gray-500 hover:text-gray-400 transition-colors font-semibold"
              >
                Share a new technology certification...
              </Link>
            </div>

            {/* Social Feed List */}
            {loadingFeed ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : feed.length === 0 ? (
              <div className="glass-panel p-16 rounded-2xl border-purple-950/20 text-center space-y-4 bg-[#0c0a13]/40">
                <p className="text-gray-500 text-sm">Your social stream is empty.</p>
                <p className="text-xs text-gray-600 max-w-xs mx-auto">
                  Feed database is empty. Upload your first certificate to share it on the feed!
                </p>
                <Link
                  to="/dashboard"
                  className="inline-flex bg-accent text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-accent-dark transition-all"
                >
                  Upload Certificate
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {feed.map((post) => {
                  const isLiked = post.likes?.includes(user._id);
                  const belongsToAdmin = !post.uploadedBy;
                  const creatorId = post.uploadedBy?._id;
                  const isSelfPost = creatorId === user._id;
                  const followsCreator = user.following?.includes(creatorId);

                  return (
                    <div
                      key={post._id}
                      className="bg-[#100f1c]/70 border border-purple-950/45 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-accent/40 hover:bg-[#131123]/80 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      {/* Post Header details */}
                      <div className="p-4 flex items-center justify-between bg-[#08070d]/30 border-b border-purple-950/20">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-900/40 border border-purple-800/40 overflow-hidden flex items-center justify-center font-bold text-xs text-purple-300 shrink-0">
                            {belongsToAdmin ? (
                              <ShieldCheck className="h-5 w-5 text-indian-gold" />
                            ) : post.uploadedBy.profilePicture ? (
                              <img
                                src={getFileUrl(post.uploadedBy.profilePicture)}
                                alt={post.uploadedBy.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              post.uploadedBy.name?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            {belongsToAdmin ? (
                              <span className="text-xs font-bold text-white flex items-center gap-1">
                                Administrator <ShieldCheck className="h-3.5 w-3.5 text-indian-gold fill-current" />
                              </span>
                            ) : (
                              <Link to={`/profile/${creatorId}`} className="text-xs font-bold text-white hover:text-accent hover:underline transition-colors block leading-tight">
                                {post.uploadedBy.name}
                              </Link>
                            )}
                            <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 mt-1 rounded border ${
                              post.category === 'Development' || post.category === 'Web' ? 'bg-blue-950/40 border-blue-900/40 text-blue-400' :
                              post.category === 'Security' ? 'bg-red-950/40 border-red-900/40 text-red-400' :
                              post.category === 'Cloud' ? 'bg-cyan-950/40 border-cyan-900/40 text-cyan-400' :
                              post.category === 'Design' ? 'bg-amber-950/40 border-amber-900/40 text-amber-400' :
                              'bg-purple-950/40 border-purple-900/40 text-purple-400'
                            }`}>
                              {post.category}
                            </span>
                          </div>
                        </div>

                        {/* Follow trigger */}
                        {!belongsToAdmin && !isSelfPost && (
                          <button
                            onClick={() => followMutation.mutate(creatorId)}
                            disabled={followMutation.isLoading}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                              followsCreator
                                ? 'bg-purple-950/20 border-purple-900/40 text-purple-400'
                                : 'bg-accent/10 border-accent/30 text-accent hover:bg-accent/20'
                            }`}
                          >
                            {followsCreator ? '✓ Following' : '+ Follow'}
                          </button>
                        )}
                      </div>

                      {/* Post Description and Content */}
                      <div className="px-4 pt-3 text-xs space-y-3">
                        <p className="text-gray-200 leading-relaxed font-semibold">
                          {post.title} — Issued by <span className="text-purple-300 font-bold">{post.issuer}</span>
                        </p>
                        {post.description && (
                          <p className="text-gray-400 leading-relaxed text-[11px] whitespace-pre-wrap">{post.description}</p>
                        )}
                      </div>

                      {/* Visual Attachment frame (PDF / image preview) */}
                      <div className="w-full bg-[#08070d] aspect-video relative flex items-center justify-center overflow-hidden border-y border-purple-950/20 mt-3">
                        {post.fileType === 'pdf' ? (
                          <div className="flex flex-col items-center gap-2 text-purple-400/40">
                            <FileText className="h-12 w-12" />
                            <span className="text-[9px] uppercase tracking-wider font-semibold">PDF Document Attachment</span>
                          </div>
                        ) : (
                          <img
                            src={getFileUrl(post.fileUrl)}
                            alt={post.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                        <Link
                          to={`/certificates/${post._id}`}
                          className="absolute bottom-3 right-3 p-2 bg-[#0d0a15]/80 hover:bg-[#161326] text-[10px] font-bold text-white border border-purple-900/60 rounded-xl transition-colors flex items-center gap-1"
                        >
                          Inspect Details <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>

                      {/* Social counts details */}
                      <div className="px-4 py-2.5 flex items-center justify-between text-[10px] text-gray-500 border-b border-purple-950/10">
                        <span>{post.likes?.length || 0} Likes</span>
                        <button onClick={() => toggleComments(post._id)} className="hover:underline">
                          {post.comments?.length || 0} Comments
                        </button>
                      </div>

                      {/* Actions toolbar */}
                      <div className="px-2 py-1.5 flex items-center justify-around text-gray-400 text-xs border-t border-purple-950/20 bg-[#08070d]/10">
                        <button
                          onClick={() => handleLike(post._id)}
                          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 hover:bg-white/5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                            isLiked ? 'text-accent font-bold' : 'hover:text-white'
                          }`}
                        >
                          <ThumbsUp className={`h-4 w-4 ${isLiked ? 'fill-current animate-pulse' : ''}`} />
                          <span>Like</span>
                        </button>
                        
                        <button
                          onClick={() => toggleComments(post._id)}
                          className="flex-1 py-2.5 flex items-center justify-center gap-1.5 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>Comment</span>
                        </button>

                        <button
                          onClick={() => handleShare(post._id)}
                          className="flex-1 py-2.5 flex items-center justify-center gap-1.5 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95"
                        >
                          <Share2 className="h-4 w-4" />
                          <span>Share</span>
                        </button>

                        {!belongsToAdmin && !isSelfPost && (
                          <button
                            onClick={() => handleSendToChat(creatorId)}
                            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95"
                          >
                            <Send className="h-4 w-4" />
                            <span>Send</span>
                          </button>
                        )}
                      </div>

                      {/* Comments block */}
                      {expandedComments[post._id] && (
                        <div className="px-4 pb-4 border-t border-purple-950/20 pt-3 space-y-3">
                          {/* List of comments */}
                          {post.comments?.length > 0 && (
                            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                                  {post.comments.map((comment) => {
                                    const isLongComment = comment.text?.length > 120;
                                    const isExpanded = expandedCommentIds[comment._id];
                                    const displayedText = isLongComment && !isExpanded 
                                      ? comment.text.slice(0, 120) + '...' 
                                      : comment.text;

                                    return (
                                      <div key={comment._id} className="text-[11px] flex gap-2.5 items-start">
                                        <Link to={`/profile/${comment.user}`} className="shrink-0 hover:scale-105 transition-transform block">
                                          {comment.userProfilePicture ? (
                                            <img
                                              src={getFileUrl(comment.userProfilePicture)}
                                              alt={comment.userName}
                                              className="w-7 h-7 rounded-full object-cover border border-purple-900/35"
                                            />
                                          ) : (
                                            <div className="w-7 h-7 rounded-full bg-purple-950 flex items-center justify-center text-[9px] font-bold text-purple-300 border border-purple-900/35">
                                              {comment.userName?.charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                        </Link>
                                        <div className="flex-1 bg-[#09080e]/50 p-3 rounded-xl border border-purple-950/40 hover:border-purple-800/10 transition-colors">
                                          <Link 
                                            to={`/profile/${comment.user}`}
                                            className="font-bold text-purple-300 text-[10.5px] hover:text-accent hover:underline transition-colors block leading-tight mb-1"
                                          >
                                            {comment.userName}
                                          </Link>
                                          <div className="text-gray-300 leading-relaxed text-[10.5px]">
                                            {displayedText}
                                            {isLongComment && (
                                              <button 
                                                type="button"
                                                onClick={() => toggleCommentExpand(comment._id)} 
                                                className="text-accent ml-1 font-bold hover:underline focus:outline-none"
                                              >
                                                {isExpanded ? 'Show less' : 'Read more'}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                            </div>
                          )}

                          {/* Write Comment Form */}
                          <form onSubmit={(e) => handleCommentSubmit(e, post._id)} className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Write a professional comment..."
                              value={commentInputs[post._id] || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({ ...prev, [post._id]: e.target.value }))
                              }
                              className="flex-1 bg-[#050409] border border-purple-950 text-gray-300 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-accent transition-all"
                            />
                            <button
                              type="submit"
                              className="bg-accent hover:bg-accent-dark text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all"
                            >
                              Post
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: GUEST LANDING PAGE (UNCHANGED LANDING LAYOUT)
  // ----------------------------------------------------
  return (
    <div className="relative overflow-hidden min-h-screen flex flex-col">
      {/* Background vector glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indian-saffron/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 z-10">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-mandala-pattern bg-cover opacity-20 pointer-events-none animate-spin-slow rounded-full hidden lg:block"></div>

        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/30 border border-purple-900/60 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-indian-saffron"></span>
            Swagat • Welcome to my Showcase
          </div>

          <h1 className="font-accent text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Verify and Explore my{' '}
            <span className="bg-gradient-to-r from-accent via-purple-400 to-indian-gold bg-clip-text text-transparent text-glow-purple">
              Professional Credentials
            </span>
          </h1>

          <p className="text-gray-400 text-base sm:text-lg max-w-2xl leading-relaxed">
            Namaste. I am a software engineer. This is Yogyata, a verified digital repository housing academic degrees, industry certificates, and specialized credentials. Feel free to inspect, view, or verify each document.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
            <Link
              to="/certificates"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02] transition-all"
            >
              Browse Full Vault
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#featured"
              className="inline-flex items-center justify-center gap-2 border border-purple-800/40 hover:border-purple-500/50 bg-purple-950/10 hover:bg-purple-950/20 text-gray-300 hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-all"
            >
              Featured Credentials
            </a>
          </div>
        </div>

        {/* Hero Visual Card Stack */}
        <div className="flex-1 relative w-full max-w-md lg:max-w-none flex justify-center">
          <div className="relative w-[320px] sm:w-[400px] h-[280px] sm:h-[320px]">
            <div className="absolute inset-0 bg-purple-900/10 rounded-2xl border border-purple-500/10 rotate-[-6deg] translate-y-2 translate-x-[-10px] blur-[1px]"></div>
            <div className="absolute inset-0 glass-panel-gold rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl rotate-[3deg] border-indian-gold/30">
              <div className="flex justify-between items-start">
                <div className="bg-gradient-to-br from-indian-gold to-yellow-600 p-2.5 rounded-xl">
                  <ShieldCheck className="h-6 w-6 text-dark-bg" />
                </div>
                <span className="text-[10px] tracking-[0.2em] text-indian-gold uppercase font-bold border border-indian-gold/20 px-2 py-0.5 rounded">
                  Official Record
                </span>
              </div>
              <div className="space-y-2 mt-6">
                <p className="text-xs text-purple-400 font-semibold tracking-wider uppercase">Credentials Repository</p>
                <p className="font-accent text-xl sm:text-2xl text-white font-bold tracking-wide">
                  Yogyata Certificate Showcase
                </p>
                <p className="text-xs text-gray-400">
                  Backed by secure validation endpoints and cryptographic verification urls.
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-purple-950/50 pt-4 mt-4 text-[11px] text-gray-500">
                <span>REPUBLIC OF INDIA</span>
                <span>AUTHENTICATED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Certificates Section */}
      <section id="featured" className="py-16 bg-[#08070d]/50 border-t border-purple-950/20 relative z-10 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs text-indian-gold font-bold uppercase tracking-wider mb-2">
                <Award className="h-4 w-4" /> Spotlight
              </div>
              <h2 className="font-accent text-3xl font-bold text-white">
                Featured Achievements
              </h2>
            </div>
            <Link
              to="/certificates"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-white transition-colors"
            >
              View Full Catalog <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : featuredData?.certificates?.length === 0 ? (
            <p className="text-gray-500 text-xs italic text-center py-12">No spotlight certificates active currently.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredData.certificates.map((cert) => (
                <Link
                  key={cert._id}
                  to={`/certificates/${cert._id}`}
                  className="group bg-[#12111d]/40 rounded-2xl border border-purple-950/40 overflow-hidden hover:border-purple-800/50 hover:bg-[#16152a]/70 hover:-translate-y-1 transition-all flex flex-col h-full shadow-lg"
                >
                  <div className="aspect-video relative bg-[#09080e] overflow-hidden flex items-center justify-center border-b border-purple-950/20">
                    {cert.fileType === 'pdf' ? (
                      <div className="flex flex-col items-center gap-2 text-purple-400/30">
                        <FileText className="h-10 w-10" />
                        <span className="text-[9px] uppercase tracking-widest font-semibold">PDF View</span>
                      </div>
                    ) : (
                      <img
                        src={getFileUrl(cert.fileUrl)}
                        alt={cert.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[8px] bg-purple-950/45 text-purple-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-purple-900/40">
                        {cert.category}
                      </span>
                      <h3 className="font-accent text-sm font-bold text-white mt-3 leading-tight group-hover:text-accent transition-colors">
                        {cert.title}
                      </h3>
                      <p className="text-[10px] text-gray-500 mt-1">Issued by {cert.issuer}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-purple-950/20 pt-4 mt-4 text-[10px] text-gray-400">
                      <span>{new Date(cert.dateIssued).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}</span>
                      <span className="text-indian-gold font-semibold group-hover:underline flex items-center gap-1">
                        Verify Record <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
