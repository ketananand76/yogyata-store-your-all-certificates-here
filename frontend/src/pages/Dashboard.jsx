import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api, { getFileUrl } from '../utils/api';
import { 
  Plus, Edit2, Trash2, Star, ChevronLeft, ChevronRight, Loader2, Award, 
  Search, ExternalLink, Folder, FolderOpen, ShieldCheck, Check, X, 
  ShieldAlert, Users, Clock, CheckCircle2, ArrowLeft, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Tab states
  const [activeTab, setActiveTab] = useState('folders'); // 'folders', 'approvals', 'inventory'
  const [folderSearch, setFolderSearch] = useState('');
  const [selectedFolderUser, setSelectedFolderUser] = useState(null);

  // Certificate Pagination & Filters (for Master Inventory tab)
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 8;

  // Query: admin certificates (Master Inventory)
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminCertificates', page, search],
    queryFn: async () => {
      const params = { page, limit, sortBy: 'order_asc' };
      if (search) params.search = search;
      const res = await api.get('/api/certificates', { params });
      return res.data;
    },
    keepPreviousData: true,
  });

  // Query: registered users monitor (Folders View)
  const { data: monitorData, isLoading: loadingMonitor, error: monitorError } = useQuery({
    queryKey: ['adminUsersMonitor'],
    queryFn: async () => {
      const res = await api.get('/api/admin/users-monitor');
      return res.data;
    },
  });

  // Query: pending certificates
  const { data: pendingData, isLoading: loadingPending, error: pendingError } = useQuery({
    queryKey: ['pendingCertificates'],
    queryFn: async () => {
      const res = await api.get('/api/certificates', { params: { status: 'pending', limit: 100 } });
      return res.data;
    },
  });

  // Toggle Pinned Spotlight Status Mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }) => {
      const res = await api.put(`/api/certificates/${id}`, { featured });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Spotlight status updated');
      queryClient.invalidateQueries({ queryKey: ['adminCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['featuredCertificates'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Update failed');
    },
  });

  // Order sorting Mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, order }) => {
      const res = await api.put(`/api/certificates/${id}`, { order });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Certificate order updated');
      queryClient.invalidateQueries({ queryKey: ['adminCertificates'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Reorder failed');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/api/certificates/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Certificate deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['featuredCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['pendingCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsersMonitor'] });
      
      // Update selected folder if open
      if (selectedFolderUser) {
        queryClient.refetchQueries({ queryKey: ['adminUsersMonitor'] });
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Delete failed');
    },
  });

  // Mutation: Approve certificate
  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.put(`/api/admin/certificates/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Certificate approved successfully!');
      queryClient.invalidateQueries({ queryKey: ['pendingCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['adminCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsersMonitor'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Approval failed');
    },
  });

  // Mutation: Reject certificate
  const rejectMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.put(`/api/admin/certificates/${id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Certificate rejected successfully');
      queryClient.invalidateQueries({ queryKey: ['pendingCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['adminCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsersMonitor'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Rejection failed');
    },
  });

  const handleDelete = (id, title) => {
    if (window.confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleOrderChange = (id, currentOrder, change) => {
    const newOrder = currentOrder + change;
    updateOrderMutation.mutate({ id, order: newOrder });
  };

  // Filter folder directory users by search
  const filteredUsers = monitorData?.users?.filter(u => 
    u.name.toLowerCase().includes(folderSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(folderSearch.toLowerCase())
  ) || [];

  // Get active folder user statistics/certificates if selected
  const activeFolderUser = selectedFolderUser
    ? monitorData?.users?.find(u => String(u._id) === String(selectedFolderUser._id))
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen relative z-10">
      <div className="absolute top-[5%] left-[-5%] w-[40vw] h-[40vw] bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header title section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-accent text-3xl font-bold text-white tracking-wide">
            Management Panel
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
            Control Dashboard • Organize User Directories & Action Approvals
          </p>
        </div>

        <Link
          to="/admin/add"
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-500/10 hover:scale-[1.01] transition-all self-start sm:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          Add Certificate
        </Link>
      </div>

      {/* Statistics dashboard summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="glass-panel p-5 rounded-2xl border-purple-950/40 flex items-center gap-4 bg-[#0c0a13]/40">
          <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-900/30 text-accent">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Users</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">{monitorData?.count || 0}</h3>
          </div>
        </div>

        <div className={`glass-panel p-5 rounded-2xl border-purple-950/40 flex items-center gap-4 bg-[#0c0a13]/40 ${
          pendingData?.certificates?.length > 0 ? 'ring-1 ring-yellow-500/20 border-yellow-500/35' : ''
        }`}>
          <div className={`p-3 rounded-xl border ${
            pendingData?.certificates?.length > 0
              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 animate-pulse'
              : 'bg-purple-950/40 border-purple-900/30 text-gray-400'
          }`}>
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Pending Reviews</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">{pendingData?.certificates?.length || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-purple-950/40 flex items-center gap-4 bg-[#0c0a13]/40">
          <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-900/30 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Live Feed Posts</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">
              {(data?.totalCount || 0) - (pendingData?.certificates?.length || 0)}
            </h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-purple-950/40 flex items-center gap-4 bg-[#0c0a13]/40">
          <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-900/30 text-indian-emerald">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Console Security</span>
            <h3 className="text-[11px] text-indian-emerald font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
              ● Active SSL Tunnel
            </h3>
          </div>
        </div>
      </div>

      {/* Tab Navigation header */}
      <div className="flex border-b border-purple-950/40 mb-6 max-w-md">
        <button
          onClick={() => { setSelectedFolderUser(null); setActiveTab('folders'); }}
          className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'folders'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          📁 User Directories ({monitorData?.count || 0})
        </button>
        <button
          onClick={() => { setSelectedFolderUser(null); setActiveTab('approvals'); }}
          className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'approvals'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          📥 Action Queue ({pendingData?.certificates?.length || 0})
        </button>

      </div>

      {/* ========================================== */}
      {/* 📁 TAB: USER DIRECTORIES / FOLDERS VIEW     */}
      {/* ========================================== */}
      {activeTab === 'folders' && (
        <div className="space-y-6">
          {!selectedFolderUser ? (
            <>
              {/* Directory search card */}
              <div className="glass-panel rounded-2xl p-4 flex gap-4 border-purple-950/40">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                  <input
                    type="text"
                    placeholder="Search folder directory by user name or email..."
                    value={folderSearch}
                    onChange={(e) => setFolderSearch(e.target.value)}
                    className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Grid of Folders */}
              {loadingMonitor ? (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : monitorError ? (
                <div className="glass-panel p-12 text-center text-red-400 border-red-950/50">
                  Failed to fetch user directory database.
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="glass-panel p-16 text-center text-gray-500 border-purple-950/20">
                  No directory folders match your filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredUsers.map((u) => {
                    const pendingCount = u.certificates?.filter(c => c.status === 'pending').length || 0;
                    return (
                      <button
                        key={u._id}
                        onClick={() => setSelectedFolderUser(u)}
                        className="group relative flex flex-col bg-[#12111d]/50 rounded-2xl border border-purple-950/40 hover:border-purple-800/50 hover:bg-[#16152a]/70 p-5 shadow-xl hover:-translate-y-1 transition-all text-left w-full focus:outline-none"
                      >
                        {/* Golden/Indian-Gold Folder Icon */}
                        <div className="flex items-start justify-between">
                          <div className="text-indian-gold group-hover:scale-105 transition-transform duration-300">
                            <Folder className="h-12 w-12 fill-current opacity-70 group-hover:opacity-90" />
                          </div>
                          {pendingCount > 0 && (
                            <span className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                              {pendingCount} review
                            </span>
                          )}
                        </div>

                        <div className="mt-4 min-w-0 w-full">
                          <h3 className="font-accent text-sm font-bold text-white truncate leading-tight group-hover:text-accent transition-colors">
                            {u.name}
                          </h3>
                          <p className="text-[10px] text-gray-500 truncate mt-1">{u.email}</p>
                          
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-purple-950/30 text-[10px] text-gray-400">
                            <span className="font-bold text-white">{u.certificateCount || 0}</span> Certificates stored
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            // ==========================================
            // INSIDE SPECIFIC USER'S FOLDER VIEW
            // ==========================================
            <div className="space-y-6">
              {/* Back to directory path header */}
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <button
                  onClick={() => setSelectedFolderUser(null)}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  Directory
                </button>
                <span>/</span>
                <span className="text-indian-gold font-bold flex items-center gap-1">
                  <FolderOpen className="h-3.5 w-3.5" /> {selectedFolderUser.name}'s Folder
                </span>
              </div>

              {/* Folder metadata card */}
              <div className="glass-panel p-5 rounded-2xl border-purple-950/40 bg-[#0c0a13]/70 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-950 border border-purple-900/40 flex items-center justify-center font-bold text-sm text-purple-300">
                    {selectedFolderUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-accent text-sm font-bold text-white">{selectedFolderUser.name}</h3>
                    <p className="text-[10px] text-gray-500">{selectedFolderUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center">
                    <span className="block font-bold text-white">{activeFolderUser?.certificates?.length || 0}</span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">Total Uploads</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-yellow-400">
                      {activeFolderUser?.certificates?.filter(c => c.status === 'pending').length || 0}
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">Pending</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-emerald-400">
                      {activeFolderUser?.certificates?.filter(c => c.status === 'approved').length || 0}
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">Approved</span>
                  </div>
                </div>
              </div>

              {/* Certificates contained inside the folder (Approve/Reject actions remain after approval!) */}
              {!activeFolderUser || activeFolderUser.certificates.length === 0 ? (
                <div className="glass-panel p-16 text-center text-gray-500 border-purple-950/20">
                  Folder is empty. No certificates uploaded yet.
                </div>
              ) : (
                <div className="glass-panel rounded-2xl overflow-hidden border-purple-950/40 shadow-xl bg-[#0c0a13]/70">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-purple-950/20 border-b border-purple-950/50 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                          <th className="px-6 py-4">Title & Issuer</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-center">Verify Link</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-950/30 text-sm text-gray-300">
                        {activeFolderUser.certificates.map((cert) => (
                          <tr key={cert._id} className="hover:bg-[#12111d]/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-white">{cert.title}</div>
                              <div className="text-xs text-gray-500">{cert.issuer}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-purple-950/35 border border-purple-900/60 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                                {cert.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                                cert.status === 'approved'
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                  : cert.status === 'rejected'
                                  ? 'bg-red-500/15 border-red-500/30 text-red-400'
                                  : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                              }`}>
                                {cert.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {cert.verifyUrl ? (
                                <a
                                  href={cert.verifyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-indian-gold hover:underline"
                                >
                                  Link <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-gray-600">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <a
                                href={getFileUrl(cert.fileUrl)}
                                target="_blank"
                                  rel="noopener noreferrer"
                                className="inline-flex items-center justify-center text-xs font-semibold bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 border border-purple-900/40 px-3 py-1.5 rounded-lg transition-colors mr-2"
                              >
                                View
                              </a>

                              {cert.status !== 'approved' && (
                                <button
                                  onClick={() => approveMutation.mutate(cert._id)}
                                  disabled={approveMutation.isLoading}
                                  className="inline-flex items-center justify-center text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  Approve
                                </button>
                              )}

                              {cert.status !== 'rejected' && (
                                <button
                                  onClick={() => rejectMutation.mutate(cert._id)}
                                  disabled={rejectMutation.isLoading}
                                  className="inline-flex items-center justify-center text-xs font-bold bg-red-650 hover:bg-red-750 text-white px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              )}

                              <button
                                onClick={() => handleDelete(cert._id, cert.title)}
                                className="inline-flex items-center justify-center p-2 border border-red-500/10 bg-red-500/5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 📥 TAB: ACTION QUEUE (PENDING APPROVALS)   */}
      {/* ========================================== */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          {loadingPending ? (
            <div className="glass-panel rounded-2xl p-16 flex items-center justify-center border-purple-950/40">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : pendingError ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-red-400 border-red-950/50">
              Failed to load pending reviews queue.
            </div>
          ) : pendingData?.certificates?.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center text-gray-500 border-purple-950/20">
              No pending certificates requiring approval. All reviews clear!
            </div>
          ) : (
            <div className="glass-panel rounded-2xl overflow-hidden border-purple-950/40 shadow-xl bg-[#0c0a13]/70">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-purple-950/20 border-b border-purple-950/50 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                      <th className="px-6 py-4">Title & Issuer</th>
                      <th className="px-6 py-4">Uploaded By</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-center">Verify Link</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/30 text-sm text-gray-300">
                    {pendingData.certificates.map((cert) => (
                      <tr key={cert._id} className="hover:bg-[#12111d]/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{cert.title}</div>
                          <div className="text-xs text-gray-500">{cert.issuer}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-purple-400">
                          {cert.uploadedBy ? (
                            <Link to={`/profile/${cert.uploadedBy._id}`} className="hover:underline">
                              {cert.uploadedBy.name || 'Developer'}
                            </Link>
                          ) : (
                            'Admin'
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-purple-950/35 border border-purple-900/60 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                            {cert.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {cert.verifyUrl ? (
                            <a
                              href={cert.verifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indian-gold hover:underline"
                            >
                              Link <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <a
                            href={getFileUrl(cert.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center text-xs font-semibold bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 border border-purple-900/40 px-3 py-1.5 rounded-lg transition-colors mr-2"
                          >
                            View
                          </a>
                          <button
                            onClick={() => approveMutation.mutate(cert._id)}
                            disabled={approveMutation.isLoading}
                            className="inline-flex items-center justify-center text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(cert._id)}
                            disabled={rejectMutation.isLoading}
                            className="inline-flex items-center justify-center text-xs font-bold bg-red-650 hover:bg-red-750 text-white px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
}
