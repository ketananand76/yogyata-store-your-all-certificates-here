import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Globe, Code, Briefcase, MessageSquare, Lock, Heart, Award, Calendar,
  Loader2, ArrowLeft, Settings, Grid, User, Mail, Upload, ShieldAlert,
  Save, Eye, EyeOff, Bell, BellOff, Moon, Sun, Key, Trash2, Shield,
  Check, ChevronRight, AlertTriangle, X, Camera, Link as LinkIcon, Phone
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, admin, checkAuth, logout } = useAuth();

  const [listModal, setListModal] = useState({ show: false, title: '', users: [] });
  const [activeProfileTab, setActiveProfileTab] = useState('posts'); // 'posts' | 'settings'
  const isSelf = currentUser && String(currentUser._id) === String(id);
  const isAdmin = !!admin;

  // Settings state
  const [sName, setSName] = useState(currentUser?.name || '');
  const [sBio, setSBio] = useState(currentUser?.bio || '');
  const [sGender, setSGender] = useState(currentUser?.gender || '');
  const [sPrivate, setSPrivate] = useState(currentUser?.privateAccount || false);
  const [sWebsite, setSWebsite] = useState(currentUser?.links?.website || '');
  const [sGithub, setSGithub] = useState(currentUser?.links?.github || '');
  const [sLinkedin, setSLinkedin] = useState(currentUser?.links?.linkedin || '');
  const [sPassword, setSPassword] = useState('');
  const [sConfirmPassword, setSConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sFile, setSFile] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(
    () => localStorage.getItem('sanchay_notifications') !== 'off'
  );
  const fileInputRef = useRef(null);

  // Query: User profile + certificates
  const { data, isLoading, error } = useQuery({
    queryKey: ['userProfile', id],
    queryFn: async () => {
      const res = await api.get(`/api/social/profile/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      if (isSelf) {
        setSName(data.user.name || '');
        setSBio(data.user.bio || '');
        setSGender(data.user.gender || '');
        setSPrivate(data.user.privateAccount || false);
        setSWebsite(data.user.links?.website || '');
        setSGithub(data.user.links?.github || '');
        setSLinkedin(data.user.links?.linkedin || '');
      }
    }
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/social/follow/${id}`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message);
      queryClient.invalidateQueries({ queryKey: ['userProfile', id] });
      queryClient.invalidateQueries({ queryKey: ['chatContacts'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen text-center">
        <div className="glass-panel p-12 rounded-2xl text-red-400 border-red-950/50">
          Profile not found or failed to fetch.
        </div>
      </div>
    );
  }

  const { user, certificates } = data;
  const isFollowing = currentUser && user.followers?.some((f) => String(f._id || f) === String(currentUser._id));
  const isPrivate = user.privateAccount && !isSelf && !isFollowing && !isAdmin;

  const handleFollowClick = () => {
    if (!currentUser) { toast.error('Please login to follow users'); return navigate('/login'); }
    followMutation.mutate();
  };

  const handleMessageClick = () => navigate(`/chat?user=${id}`);

  // File handler
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return toast.error('Max 2MB (JPG, PNG, WebP)');
    setSFile(f);
  };

  // Save settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!sName.trim()) return toast.error('Name cannot be empty');
    if (sPassword && sPassword !== sConfirmPassword) return toast.error('Passwords do not match');

    const formData = new FormData();
    formData.append('name', sName);
    formData.append('bio', sBio);
    formData.append('gender', sGender);
    formData.append('privateAccount', sPrivate);
    formData.append('website', sWebsite);
    formData.append('github', sGithub);
    formData.append('linkedin', sLinkedin);
    if (sPassword) formData.append('password', sPassword);
    if (sFile) formData.append('file', sFile);

    setIsUpdating(true);
    try {
      const res = await api.put('/api/social/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('Profile updated successfully!');
        await checkAuth();
        queryClient.invalidateQueries({ queryKey: ['userProfile', id] });
        setSPassword('');
        setSConfirmPassword('');
        setSFile(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!window.confirm('WARNING: This will permanently delete your account and all certificates. Cannot be undone!')) return;
    setIsDeleting(true);
    try {
      const res = await api.delete('/api/social/profile');
      if (res.data.success) {
        toast.success('Account deleted');
        await logout();
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen relative z-10">
      <div className="absolute top-[10%] left-[-15%] w-[40vw] h-[40vw] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Back link */}
      <Link
        to={isAdmin ? '/admin/dashboard' : (currentUser ? '/dashboard' : '/')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      {/* ======================================= */}
      {/* PROFILE HEADER */}
      {/* ======================================= */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border-purple-950/40 shadow-2xl space-y-5 bg-[#0c0a13]/70 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-purple-950/30 border-2 border-purple-800/40 overflow-hidden flex items-center justify-center font-accent text-3xl font-bold text-purple-300 shadow-lg">
              {user.profilePicture ? (
                <img src={getFileUrl(user.profilePicture)} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            {isSelf && (
              <button
                onClick={() => { setActiveProfileTab('settings'); fileInputRef.current?.click(); }}
                className="absolute bottom-0 right-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center border-2 border-[#0c0a13] hover:bg-accent-dark transition-colors shadow-lg"
                title="Change photo"
              >
                <Camera className="h-3.5 w-3.5 text-white" />
              </button>
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
              <h2 className="font-accent text-2xl font-bold text-white tracking-wide">{user.name}</h2>
              {user.privateAccount && (
                <span className="inline-flex items-center gap-1 bg-[#120f26]/80 text-[9px] font-bold text-purple-300 uppercase tracking-widest px-2 py-0.5 rounded border border-purple-900/60 w-fit mx-auto sm:mx-0">
                  <Lock className="h-2.5 w-2.5" /> Private
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center sm:justify-start gap-6 border-y border-purple-950/20 py-2.5 text-xs">
              <div>
                <span className="text-white font-bold text-sm block">{certificates.length}</span>
                <span className="text-gray-500 uppercase tracking-wider text-[9px]">Certificates</span>
              </div>
              <button
                onClick={() => setListModal({ show: true, title: 'Followers', users: user.followers || [] })}
                className="text-left cursor-pointer hover:opacity-85 transition-opacity"
              >
                <span className="text-white font-bold text-sm block">{user.followers?.length || 0}</span>
                <span className="text-gray-500 uppercase tracking-wider text-[9px] hover:text-purple-400">Followers</span>
              </button>
              <button
                onClick={() => setListModal({ show: true, title: 'Following', users: user.following || [] })}
                className="text-left cursor-pointer hover:opacity-85 transition-opacity"
              >
                <span className="text-white font-bold text-sm block">{user.following?.length || 0}</span>
                <span className="text-gray-500 uppercase tracking-wider text-[9px] hover:text-purple-400">Following</span>
              </button>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-xs text-gray-300 leading-relaxed font-medium bg-purple-950/10 p-3 rounded-xl border border-purple-950/30">
                {user.bio}
              </p>
            )}

            {/* Social links */}
            {user.links && (user.links.website || user.links.github || user.links.linkedin) && (
              <div className="flex items-center justify-center sm:justify-start gap-3">
                {user.links.website && (
                  <a href={user.links.website} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-purple-950/30 border border-purple-900/40 text-purple-400 hover:text-white hover:bg-purple-900/40 transition-all">
                    <Globe className="h-4 w-4" />
                  </a>
                )}
                {user.links.github && (
                  <a href={user.links.github} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-purple-950/30 border border-purple-900/40 text-purple-400 hover:text-white hover:bg-purple-900/40 transition-all">
                    <Code className="h-4 w-4" />
                  </a>
                )}
                {user.links.linkedin && (
                  <a href={user.links.linkedin} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-purple-950/30 border border-purple-900/40 text-purple-400 hover:text-white hover:bg-purple-900/40 transition-all">
                    <Briefcase className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-1 justify-center sm:justify-start">
              {isSelf ? (
                <button
                  onClick={() => setActiveProfileTab('settings')}
                  className={`flex items-center gap-2 font-bold px-5 py-2 rounded-xl text-xs transition-all ${
                    activeProfileTab === 'settings'
                      ? 'bg-accent text-white shadow-lg shadow-purple-500/20'
                      : 'bg-purple-950/30 border border-purple-800/40 hover:bg-purple-900/30 text-purple-300'
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" /> Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleFollowClick}
                    disabled={followMutation.isLoading}
                    className={`font-bold px-6 py-2 rounded-xl text-xs hover:scale-[1.01] transition-all ${
                      isFollowing
                        ? 'border border-purple-900/60 bg-[#120f26] text-purple-300 hover:bg-purple-950/30'
                        : 'bg-gradient-to-r from-accent to-accent-dark text-white shadow-md shadow-purple-500/10'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button
                    onClick={handleMessageClick}
                    className="bg-purple-950/30 border border-purple-800/40 hover:bg-purple-900/30 text-purple-300 font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Message
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================= */}
      {/* TAB NAV (own profile only shows Settings tab) */}
      {/* ======================================= */}
      {isSelf && (
        <div className="flex border-b border-purple-950/40 mb-6">
          <button
            onClick={() => setActiveProfileTab('posts')}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeProfileTab === 'posts' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Grid className="h-3.5 w-3.5" /> Certificates
          </button>
          <button
            onClick={() => setActiveProfileTab('settings')}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeProfileTab === 'settings' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Settings className="h-3.5 w-3.5" /> Settings
          </button>
        </div>
      )}

      {/* ======================================= */}
      {/* CERTIFICATES GRID */}
      {/* ======================================= */}
      {(!isSelf || activeProfileTab === 'posts') && (
        <div className="space-y-4">
          {!isSelf && (
            <h3 className="font-accent text-sm font-bold text-white uppercase tracking-widest border-b border-purple-950/30 pb-2">
              Certificates Grid
            </h3>
          )}

          {isPrivate ? (
            <div className="glass-panel p-16 rounded-2xl border-purple-950/20 text-center flex flex-col items-center gap-3">
              <Lock className="h-10 w-10 text-purple-400" />
              <h4 className="font-accent text-white font-bold">This Account is Private</h4>
              <p className="text-xs text-gray-500 max-w-xs">Follow this user to view their credential portfolio.</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="glass-panel p-16 rounded-2xl border-purple-950/20 text-center text-gray-500">
              No certificates uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <Link
                  key={cert._id}
                  to={`/certificates/${cert._id}`}
                  className="group relative h-48 bg-[#12111d]/50 rounded-2xl border border-purple-950/40 hover:border-purple-800/40 hover:bg-[#151425] shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="flex-1 w-full relative overflow-hidden flex items-center justify-center bg-[#09080e] border-b border-purple-950/20">
                    {cert.fileType === 'pdf' ? (
                      <div className="flex flex-col items-center gap-1.5 text-purple-400/50 group-hover:text-purple-300 transition-colors">
                        <Award className="h-8 w-8" />
                        <span className="text-[8px] uppercase tracking-wider font-semibold">PDF View</span>
                      </div>
                    ) : (
                      <img src={getFileUrl(cert.fileUrl)} alt={cert.title} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                    )}
                    <span className="absolute top-2.5 left-2.5 bg-[#0d0a15]/80 border border-purple-900/60 text-purple-300 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      {cert.category}
                    </span>
                    {isSelf && (
                      <span className={`absolute top-2.5 right-2.5 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        cert.status === 'approved' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : cert.status === 'rejected' ? 'bg-red-500/15 border-red-500/30 text-red-400'
                        : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                      }`}>
                        {cert.status || 'pending'}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-accent text-xs font-bold text-white line-clamp-1 group-hover:text-accent transition-colors">{cert.title}</h4>
                    <div className="flex items-center justify-between text-[9px] text-gray-500 mt-1">
                      <span className="truncate max-w-[80px]">{cert.issuer}</span>
                      <span className="flex items-center gap-0.5 text-red-400">
                        <Heart className="h-2.5 w-2.5 fill-current" /> {cert.likes?.length || 0}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================= */}
      {/* SETTINGS TAB (own profile only)          */}
      {/* ======================================= */}
      {isSelf && activeProfileTab === 'settings' && (
        <div className="space-y-5">
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />

          <form onSubmit={handleSaveSettings} className="space-y-5">

            {/* ---- Avatar section ---- */}
            <div className="glass-panel rounded-2xl p-5 border-purple-950/40 flex items-center gap-5 bg-[#0c0a13]/60">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-purple-800/40 bg-purple-950/30 flex items-center justify-center font-bold text-xl text-purple-300 shrink-0">
                {sFile ? (
                  <img src={URL.createObjectURL(sFile)} alt="Preview" className="w-full h-full object-cover" />
                ) : user.profilePicture ? (
                  <img src={getFileUrl(user.profilePicture)} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xs font-bold text-white">Profile Photo</p>
                <div className="flex gap-2 flex-wrap">
                  <label className="bg-purple-950/40 border border-purple-900/50 hover:bg-purple-900/30 text-purple-300 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all">
                    <Upload className="h-3 w-3" /> Upload Photo
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  {sFile && (
                    <button type="button" onClick={() => setSFile(null)}
                      className="text-red-400 border border-red-950 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-red-950/20 transition-all">
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-gray-600">Max 2MB (JPG, PNG, WebP)</p>
              </div>
            </div>

            {/* ---- Profile Info ---- */}
            <div className="glass-panel rounded-2xl p-5 border-purple-950/40 space-y-4 bg-[#0c0a13]/60">
              <div className="flex items-center gap-2 border-b border-purple-950/30 pb-3">
                <User className="h-4 w-4 text-accent" />
                <h3 className="font-accent text-xs font-bold text-purple-300 uppercase tracking-widest">Profile Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                    <input
                      type="text"
                      required
                      value={sName}
                      onChange={(e) => setSName(e.target.value)}
                      className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 pl-9 pr-3 py-2.5 rounded-lg focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Email read-only */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Email (Read Only)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-700" />
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-[#040307] border border-purple-950/40 text-xs text-gray-600 pl-9 pr-3 py-2.5 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Gender</label>
                  <select
                    value={sGender}
                    onChange={(e) => setSGender(e.target.value)}
                    className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2.5 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* Privacy */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Account Privacy
                  </label>
                  <select
                    value={sPrivate ? 'true' : 'false'}
                    onChange={(e) => setSPrivate(e.target.value === 'true')}
                    className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2.5 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="false">🌍 Public — Everyone can view</option>
                    <option value="true">🔒 Private — Follow required</option>
                  </select>
                </div>

                {/* Bio */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Bio</label>
                  <textarea
                    rows="3"
                    placeholder="Tell the world about yourself, certifications, profession..."
                    value={sBio}
                    onChange={(e) => setSBio(e.target.value)}
                    className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2.5 rounded-lg focus:outline-none resize-y"
                  />
                </div>
              </div>
            </div>

            {/* ---- Social Links ---- */}
            <div className="glass-panel rounded-2xl p-5 border-purple-950/40 space-y-4 bg-[#0c0a13]/60">
              <div className="flex items-center gap-2 border-b border-purple-950/30 pb-3">
                <LinkIcon className="h-4 w-4 text-accent" />
                <h3 className="font-accent text-xs font-bold text-purple-300 uppercase tracking-widest">Social Links</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Portfolio Website', icon: Globe, val: sWebsite, set: setSWebsite, ph: 'https://mywebsite.com' },
                  { label: 'GitHub Profile', icon: Code, val: sGithub, set: setSGithub, ph: 'https://github.com/username' },
                  { label: 'LinkedIn Profile', icon: Briefcase, val: sLinkedin, set: setSLinkedin, ph: 'https://linkedin.com/in/username' },
                ].map(({ label, icon: Icon, val, set, ph }) => (
                  <div key={label} className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500">{label}</label>
                    <div className="relative">
                      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                      <input
                        type="url"
                        placeholder={ph}
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 pl-9 pr-3 py-2.5 rounded-lg focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- Security / Password ---- */}
            <div className="glass-panel rounded-2xl p-5 border-purple-950/40 space-y-4 bg-[#0c0a13]/60">
              <div className="flex items-center gap-2 border-b border-purple-950/30 pb-3">
                <Key className="h-4 w-4 text-accent" />
                <h3 className="font-accent text-xs font-bold text-purple-300 uppercase tracking-widest">Change Password</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Leave empty to keep current"
                      value={sPassword}
                      onChange={(e) => setSPassword(e.target.value)}
                      className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 pl-9 pr-9 py-2.5 rounded-lg focus:outline-none"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat new password"
                      value={sConfirmPassword}
                      onChange={(e) => setSConfirmPassword(e.target.value)}
                      className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 pl-9 pr-3 py-2.5 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Notification Preferences ---- */}
            <div className="glass-panel rounded-2xl p-5 border-purple-950/40 bg-[#0c0a13]/60">
              <div className="flex items-center gap-2 border-b border-purple-950/30 pb-3 mb-4">
                <Bell className="h-4 w-4 text-accent" />
                <h3 className="font-accent text-xs font-bold text-purple-300 uppercase tracking-widest">Preferences</h3>
              </div>

              <div className="space-y-4">
                {/* Notifications toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-900/30">
                      {notificationsOn ? <Bell className="h-4 w-4 text-accent" /> : <BellOff className="h-4 w-4 text-gray-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Push Notifications</p>
                      <p className="text-[9px] text-gray-500">Alerts for follows, likes, comments</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !notificationsOn;
                      setNotificationsOn(next);
                      localStorage.setItem('sanchay_notifications', next ? 'on' : 'off');
                      toast.success(next ? 'Notifications enabled' : 'Notifications muted');
                    }}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${notificationsOn ? 'bg-accent' : 'bg-gray-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${notificationsOn ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Profile visibility info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-900/30">
                      {sPrivate ? <Lock className="h-4 w-4 text-yellow-400" /> : <Globe className="h-4 w-4 text-green-400" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Profile Visibility</p>
                      <p className="text-[9px] text-gray-500">
                        {sPrivate ? 'Only followers can view your vault' : 'Your profile is publicly visible'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border ${sPrivate ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                    {sPrivate ? 'Private' : 'Public'}
                  </span>
                </div>

                {/* Quick links */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-900/30">
                      <MessageSquare className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Messages & Chat</p>
                      <p className="text-[9px] text-gray-500">Open your chat inbox</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => navigate('/chat')}
                    className="text-[9px] text-purple-400 hover:text-white font-bold flex items-center gap-1 transition-colors">
                    Open <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-900/30">
                      <Bell className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Notification Center</p>
                      <p className="text-[9px] text-gray-500">View all activity alerts</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => navigate('/notifications')}
                    className="text-[9px] text-purple-400 hover:text-white font-bold flex items-center gap-1 transition-colors">
                    Open <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* ---- Save Button ---- */}
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {isUpdating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...</>
              ) : (
                <><Save className="h-4 w-4" /> Save All Settings</>
              )}
            </button>
          </form>

          {/* ---- Danger Zone ---- */}
          <div className="glass-panel border-red-500/20 bg-red-950/5 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <h3 className="font-accent text-xs font-bold uppercase tracking-wider">Danger Zone</h3>
            </div>
            <div className="p-3 rounded-xl bg-red-950/10 border border-red-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-300">Delete Account Permanently</p>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    Once you delete your account, there is no going back. All your certificates, follow connections, likes, and data will be permanently erased.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="w-full bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 hover:text-red-300 font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* FOLLOWERS / FOLLOWING MODAL              */}
      {/* ======================================= */}
      {listModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07050b]/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#12111d] glass-panel border border-purple-950/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-950/30 pb-3">
              <h3 className="font-accent text-sm font-bold text-white uppercase tracking-wider">{listModal.title}</h3>
              <button
                onClick={() => setListModal({ show: false, title: '', users: [] })}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {listModal.users.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-6">No {listModal.title.toLowerCase()} found.</div>
              ) : (
                listModal.users.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => { setListModal({ show: false, title: '', users: [] }); navigate(`/profile/${u._id}`); }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-950/20 border border-transparent hover:border-purple-900/35 cursor-pointer transition-all"
                  >
                    <div className="w-9 h-9 rounded-full bg-purple-900/40 border border-purple-800/40 overflow-hidden flex items-center justify-center font-bold text-xs text-purple-300">
                      {u.profilePicture ? (
                        <img src={getFileUrl(u.profilePicture)} alt={u.name} className="w-full h-full object-cover" />
                      ) : u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{u.name}</div>
                      <div className="text-[10px] text-gray-500 truncate">{u.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
