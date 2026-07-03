import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Award, Plus, Trash2, ExternalLink, Calendar, FileText, Upload, Loader2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const categories = ['Development', 'Cloud', 'Security', 'Data Science', 'Academic', 'Design', 'Other'];

export default function UserDashboard() {
  const { user, loading, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [dateIssued, setDateIssued] = useState('');
  const [category, setCategory] = useState('Development');
  const [description, setDescription] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Redirect if guest
  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Fetch only this user's certificates
  const { data, isLoading, error } = useQuery({
    queryKey: ['userCertificates'],
    queryFn: async () => {
      const res = await api.get('/api/users/certificates');
      return res.data;
    },
    enabled: !!user,
  });

  // Delete certificate mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/api/users/certificates/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Certificate removed from vault');
      queryClient.invalidateQueries({ queryKey: ['userCertificates'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Delete operation failed');
    },
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit');
      return;
    }

    setFile(selectedFile);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!title || !issuer || !dateIssued || !category) {
      return toast.error('Please fill in all required fields');
    }
    if (!file) {
      return toast.error('Please select a certificate file (JPG, PNG or PDF)');
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('issuer', issuer);
    formData.append('dateIssued', dateIssued);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('verifyUrl', verifyUrl);
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await api.post('/api/users/certificates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success('Certificate uploaded successfully!');
        setShowAddForm(false);
        setTitle('');
        setIssuer('');
        setDateIssued('');
        setCategory('Development');
        setDescription('');
        setVerifyUrl('');
        setFile(null);
        queryClient.invalidateQueries({ queryKey: ['userCertificates'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to permanently delete this certificate?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (loading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const certificates = data?.certificates || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen relative z-10">
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] text-indian-gold font-bold tracking-[0.2em] uppercase">User Vault Panel</span>
          <h1 className="font-accent text-3xl font-bold text-white tracking-wide mt-1">
            Welcome, {user.name}
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            Store and manage your academic & professional credentials
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-purple-500/10 hover:scale-[1.01] transition-all"
          >
            <Plus className="h-4.5 w-4.5" /> Upload Certificate
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 bg-red-950/15 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-950/20 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
          >
            <LogOut className="h-4.5 w-4.5" /> Logout
          </button>
        </div>
      </div>

      {/* Upload Form Modal */}
      {showAddForm && (
        <form onSubmit={handleUploadSubmit} className="glass-panel rounded-2xl p-6 border-purple-950/40 space-y-4 mb-8">
          <h3 className="font-accent text-lg font-bold text-white mb-2">Store New Certificate</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Certificate Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. AWS Solutions Architect"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Issuer Portal / Org *</label>
              <input
                type="text"
                required
                placeholder="e.g. Amazon Web Services"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Date Issued *</label>
              <input
                type="date"
                required
                value={dateIssued}
                onChange={(e) => setDateIssued(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-gray-500">Verification URL</label>
              <input
                type="url"
                placeholder="e.g. https://www.credly.com/verify/..."
                value={verifyUrl}
                onChange={(e) => setVerifyUrl(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-gray-500">Description</label>
              <textarea
                placeholder="Detail skills or curriculum attained..."
                rows="2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none resize-y"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-gray-500">Select Document File * (Max 5MB)</label>
              <div className="border border-dashed border-purple-950 hover:border-purple-800 rounded-xl p-4 text-center cursor-pointer relative bg-purple-950/5">
                <input
                  type="file"
                  required
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="text-xs font-semibold text-gray-300 flex items-center justify-center gap-1.5">
                  <Upload className="h-4 w-4 text-accent" />
                  {file ? file.name : 'Choose JPG, PNG or PDF File'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 bg-accent hover:bg-accent-dark text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                'Upload Certificate'
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 border border-purple-950 text-gray-400 py-2.5 rounded-xl text-xs font-bold hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Vault Grid */}
      {certificates.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl text-center text-gray-500 border-purple-950/20">
          Your vault is currently empty. Click "Upload Certificate" to store your first document!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert._id}
              className="group relative flex flex-col bg-[#12111d]/50 rounded-2xl border border-purple-950/40 hover:border-purple-800/40 hover:bg-[#151425] shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
            >
              {/* Image/PDF Thumbnail */}
              <div className="w-full h-40 bg-[#09080e] relative overflow-hidden flex items-center justify-center border-b border-purple-950/30">
                {cert.fileType === 'pdf' ? (
                  <div className="flex flex-col items-center gap-1.5 text-purple-400/60 group-hover:text-purple-300 transition-colors">
                    <FileText className="h-9 w-9" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">PDF File</span>
                  </div>
                ) : (
                  <img
                    src={
                      cert.fileUrl.startsWith('/uploads')
                        ? `${import.meta.env.VITE_API_URL || ''}${cert.fileUrl}`
                        : cert.fileUrl
                    }
                    alt={cert.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  />
                )}
                <span className="absolute top-2.5 left-2.5 bg-[#0d0a15]/80 backdrop-blur border border-purple-900/60 text-purple-300 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  {cert.category}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-gray-500">
                    {new Date(cert.dateIssued).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </span>
                  <h3 className="font-accent text-sm font-bold text-white mt-0.5 line-clamp-1 group-hover:text-accent transition-colors">
                    {cert.title}
                  </h3>
                  <p className="text-[11px] text-gray-400 line-clamp-1">{cert.issuer}</p>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-purple-950/20">
                  <a
                    href={
                      cert.fileUrl.startsWith('/uploads')
                        ? `${import.meta.env.VITE_API_URL || ''}${cert.fileUrl}`
                        : cert.fileUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center text-[10px] font-bold bg-purple-950/30 hover:bg-purple-900/40 text-purple-200 border border-purple-900/40 py-1.5 rounded-lg transition-colors"
                  >
                    View File
                  </a>
                  {cert.verifyUrl && (
                    <a
                      href={cert.verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center text-[10px] font-bold bg-gradient-to-r from-indian-gold/15 to-yellow-600/15 hover:from-indian-gold/25 hover:to-yellow-600/25 text-indian-gold border border-indian-gold/25 py-1.5 rounded-lg transition-colors"
                    >
                      Verify Link <ExternalLink className="h-2.5 w-2.5 ml-1" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(cert._id)}
                    className="p-1.5 rounded-lg bg-red-950/15 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    title="Delete Certificate"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
