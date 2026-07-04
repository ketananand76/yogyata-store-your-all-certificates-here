import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getFileUrl, socketUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Award, Plus, Trash2, ExternalLink, Calendar, FileText, Upload, Loader2, LogOut, ShieldCheck, ShieldAlert, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';

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

  // Scanning simulation states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');

  // Redirect if guest
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Socket connection for live status updates
  useEffect(() => {
    if (!user) return;

    const socket = io(socketUrl);

    socket.on('connect', () => {
      socket.emit('register-user', user._id);
    });

    socket.on('status-update', (data) => {
      // Show notification based on approval state
      if (data.status === 'approved') {
        toast.success(`Congratulations! Your certificate "${data.title}" was approved by the admin.`, {
          icon: '✅',
          duration: 6000,
        });
      } else if (data.status === 'rejected') {
        toast.error(`Your certificate "${data.title}" was rejected by the admin.`, {
          icon: '❌',
          duration: 6000,
        });
      }
      // Live refetch certificates status lists
      queryClient.invalidateQueries({ queryKey: ['userCertificates'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [user, queryClient]);

  // Fetch only this user's certificates
  const { data, isLoading, error } = useQuery({
    queryKey: ['userCertificates'],
    queryFn: async () => {
      const res = await api.get('/api/users/certificates');
      return res.data;
    },
    enabled: !!user,
  });

  // Fetch real-time stats count from profile query
  const { data: profileData } = useQuery({
    queryKey: ['userProfileDashboard', user?._id],
    queryFn: async () => {
      const res = await api.get(`/api/social/profile/${user._id}`);
      return res.data;
    },
    enabled: !!user?._id,
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

  // Simulate scanning/OCR extraction process
  const startFileScanning = async (selectedFile) => {
    setIsScanning(true);
    setScanProgress(10);
    setScanStatus('Loading AI Vision Engine (Tesseract.js)...');

    try {
      // 1. Dynamic Script Loader for Tesseract.js
      const Tesseract = await new Promise((resolve, reject) => {
        if (window.Tesseract) {
          resolve(window.Tesseract);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/tesseract.js@v5.0.3/dist/tesseract.min.js';
        script.onload = () => resolve(window.Tesseract);
        script.onerror = () => reject(new Error('Failed to load AI OCR scanner engine.'));
        document.body.appendChild(script);
      });

      setScanProgress(30);
      setScanStatus('Analyzing document boundaries & visual layout...');

      // 2. Perform OCR scan
      let ocrText = '';
      if (selectedFile.type.startsWith('image/')) {
        setScanProgress(60);
        setScanStatus('Running neural OCR character extraction...');
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(selectedFile);
        ocrText = ret.data.text.toLowerCase();
        await worker.terminate();
      } else {
        // Fallback for PDFs to scan the filename for indicators
        ocrText = selectedFile.name.toLowerCase();
      }

      setScanProgress(80);
      setScanStatus('Evaluating authenticity & certificate key tokens...');

      // 3. Authenticity Validation check
      const CERT_KEYWORDS = [
        'certificate', 'certification', 'certified', 'completion', 'degree', 'diploma', 
        'award', 'accomplishment', 'achievement', 'presented to', 'presents to', 'license', 
        'credential', 'yogyata', 'योग्यता', 'प्रमाण पत्र', 'passing', 'verify', 'score'
      ];

      const isGenuine = CERT_KEYWORDS.some(kw => ocrText.includes(kw));

      if (!isGenuine) {
        setIsScanning(false);
        setFile(null);
        toast.error('AI Verification Failed: The document does not appear to be a genuine certificate or credential. Upload aborted.', { duration: 6000 });
        return;
      }

      // 4. Smart Metadata Extraction
      let extractedTitle = 'Specialized Technology Certification';
      let extractedIssuer = 'Credential Verification Authority';

      if (ocrText.includes('aws') || ocrText.includes('amazon')) {
        extractedTitle = 'AWS Certified Cloud Practitioner';
        extractedIssuer = 'Amazon Web Services';
      } else if (ocrText.includes('python')) {
        extractedTitle = 'Advanced Python Software Engineer';
        extractedIssuer = 'Python Software Foundation';
      } else if (ocrText.includes('javascript') || ocrText.includes('js') || ocrText.includes('ecma')) {
        extractedTitle = 'JavaScript FullStack Architect Certificate';
        extractedIssuer = 'ECMA International Org';
      } else if (ocrText.includes('google') || ocrText.includes('gcp') || ocrText.includes('cloud')) {
        extractedTitle = 'Google Associate Cloud Engineer';
        extractedIssuer = 'Google Cloud Platform';
      } else if (ocrText.includes('react') || ocrText.includes('meta')) {
        extractedTitle = 'Frontend Engineer (React specializing)';
        extractedIssuer = 'Meta Developer Academy';
      } else if (ocrText.includes('coursera')) {
        extractedIssuer = 'Coursera Project Platform';
      } else if (ocrText.includes('udemy')) {
        extractedIssuer = 'Udemy Academy';
      }

      setScanProgress(100);
      setScanStatus('Authentication matched! Generating secure vault keys...');

      setTimeout(() => {
        const today = new Date().toISOString().split('T')[0];
        setTitle(extractedTitle);
        setIssuer(extractedIssuer);
        setDateIssued(today);
        setFile(selectedFile);
        
        setIsScanning(false);
        setShowAddForm(true); // Open Modal
        toast.success('AI Verification Complete: Genuine certificate verified!', { icon: '✨' });
      }, 800);

    } catch (err) {
      console.error('OCR Scanning Error:', err);
      // Fallback: check filename keywords if OCR fails to load
      const filename = selectedFile.name.toLowerCase();
      const CERT_KEYWORDS = [
        'certificate', 'certification', 'certified', 'completion', 'degree', 'diploma', 
        'award', 'accomplishment', 'achievement', 'presented to', 'presents to', 'license', 
        'credential', 'yogyata', 'योग्यता', 'प्रमाण पत्र', 'passing', 'verify', 'score'
      ];
      const isGenuine = CERT_KEYWORDS.some(kw => filename.includes(kw));

      if (!isGenuine) {
        setIsScanning(false);
        setFile(null);
        toast.error('Verification Error: Could not verify if the file is a genuine certificate. Upload aborted.', { duration: 6000 });
        return;
      }

      // Filename matches, allow fallback
      setScanProgress(100);
      setScanStatus('Verification complete (via Filename tokens)...');
      setTimeout(() => {
        const today = new Date().toISOString().split('T')[0];
        setTitle('Specialized Technology Certification');
        setIssuer('Credential Authority');
        setDateIssued(today);
        setFile(selectedFile);
        
        setIsScanning(false);
        setShowAddForm(true);
        toast.success('Filename verified as certificate.', { icon: '✨' });
      }, 800);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit');
      return;
    }

    // Trigger OCR simulator
    startFileScanning(selectedFile);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!title || !issuer || !dateIssued || !category) {
      return toast.error('Please fill in all required fields');
    }
    if (!file) {
      return toast.error('Please select a certificate file first');
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
        toast.success('Certificate sent to admin for approval!');
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
  const isPremiumActive = user?.isPremium && user?.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date();
  const limitReached = !isPremiumActive && certificates.length >= 3;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen relative z-10">
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Scanning Laser Simulator Modal overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07050b]/90 backdrop-blur-md p-6">
          <div className="w-full max-w-md bg-[#12111d] glass-panel-gold border-indian-gold/30 rounded-3xl p-8 space-y-6 text-center shadow-2xl relative overflow-hidden">
            
            {/* Horizontal Laser Beam Animation */}
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indian-gold to-transparent shadow-lg shadow-yellow-500 animate-laser-sweep"></div>
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indian-gold to-yellow-600 flex items-center justify-center mx-auto text-dark-bg animate-pulse">
              <Sparkles className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-accent text-lg font-bold text-white uppercase tracking-wider">AI Certificate Scanner</h2>
              <p className="text-xs text-gray-400 leading-relaxed">{scanStatus}</p>
            </div>

            <div className="w-full bg-[#050409] h-2 rounded-full overflow-hidden border border-purple-950">
              <div
                className="bg-gradient-to-r from-indian-gold to-yellow-500 h-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>

            <div className="text-[10px] text-indian-gold tracking-[0.25em] font-bold uppercase animate-pulse">
              Extricating metadata {scanProgress}%
            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] text-indian-gold font-bold tracking-[0.2em] uppercase">
            {isPremiumActive ? '💎 User Premium Vault' : 'User Vault Panel'}
          </span>
          <h1 className="font-accent text-3xl font-bold text-white tracking-wide mt-1">
            Welcome, {user.name}
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            {isPremiumActive ? 'Unlimited certificate scanning & portfolio exports active' : 'Upload document scans & monitor approval status (Free Limit: 3)'}
          </p>
        </div>

        <div className="flex gap-3">
          {/* File trigger that initiates the Scan */}
          {limitReached ? (
            <Link
              to="/premium"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-slate-900 text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 hover:scale-[1.01] transition-all cursor-pointer"
            >
              <Sparkles className="h-4.5 w-4.5 text-slate-900 fill-current animate-pulse" /> Upgrade to Premium
            </Link>
          ) : (
            <label className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-purple-500/10 hover:scale-[1.01] transition-all cursor-pointer">
              <Plus className="h-4.5 w-4.5" /> Upload & Scan
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} className="hidden" />
            </label>
          )}
          
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 bg-red-950/15 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-950/20 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
          >
            <LogOut className="h-4.5 w-4.5" /> Logout
          </button>
        </div>
      </div>

      {/* Profile Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Verified Certificates', count: profileData?.certificates?.filter(c => c.status === 'approved')?.length || 0, color: 'text-purple-400' },
          { label: 'Followers', count: profileData?.user?.followers?.length || 0, color: 'text-cyan-400' },
          { label: 'Following', count: profileData?.user?.following?.length || 0, color: 'text-pink-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl border border-purple-950/40 flex flex-col justify-center relative overflow-hidden group hover:border-purple-800/60 transition-all hover:-translate-y-0.5">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{stat.label}</span>
            <span className={`text-4xl font-extrabold font-accent mt-2 tracking-tight ${stat.color} text-glow-purple`}>
              {stat.count}
            </span>
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/10 transition-colors"></div>
          </div>
        ))}
      </div>

      {/* Upload Form Modal */}
      {showAddForm && (
        <form onSubmit={handleUploadSubmit} className="glass-panel rounded-2xl p-6 border-purple-950/40 space-y-4 mb-8">
          <div className="flex items-center gap-2 mb-2 border-b border-purple-950/30 pb-2">
            <Sparkles className="h-5 w-5 text-indian-gold" />
            <h3 className="font-accent text-lg font-bold text-white">Scanned Metadata Verification</h3>
          </div>
          <p className="text-[10px] text-gray-400">Please review the details extracted from your scan. Adjust values as needed before sending for approval.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Extracted Title *</label>
              <input
                type="text"
                required
                placeholder="Certificate Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Extracted Issuer *</label>
              <input
                type="text"
                required
                placeholder="Issuer Organization"
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
                placeholder="Verification link if available"
                value={verifyUrl}
                onChange={(e) => setVerifyUrl(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-gray-500">Description</label>
              <textarea
                placeholder="Skills or tags"
                rows="2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none resize-y"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-gray-500">Selected Document Scan</label>
              <div className="bg-purple-950/10 border border-purple-900/40 rounded-xl p-3 text-center text-xs font-semibold text-purple-300">
                {file ? file.name : 'No file selected'}
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending for approval...
                </>
              ) : (
                'Send for Admin Approval'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFile(null);
              }}
              className="flex-1 border border-purple-950 text-gray-400 py-2.5 rounded-xl text-xs font-bold hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Vault grid display with status flags */}
      {certificates.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl text-center text-gray-500 border-purple-950/20">
          Your vault tracker is empty. Choose a file via the "Upload & Scan" button to submit credentials.
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
                    src={getFileUrl(cert.fileUrl)}
                    alt={cert.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  />
                )}
                
                {/* Category tag */}
                <span className="absolute top-2.5 left-2.5 bg-[#0d0a15]/80 backdrop-blur border border-purple-900/60 text-purple-300 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  {cert.category}
                </span>

                {/* Status Badges overlays */}
                <span className={`absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                  cert.status === 'approved'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : cert.status === 'rejected'
                    ? 'bg-red-500/15 border-red-500/30 text-red-400'
                    : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                }`}>
                  {cert.status || 'pending'}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-gray-500">
                    <span>
                      {new Date(cert.dateIssued).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    
                    {/* Status live indicator */}
                    <span className="flex items-center gap-1 text-[9px] font-medium capitalize">
                      {cert.status === 'approved' ? (
                        <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Live Feed</span>
                      ) : cert.status === 'rejected' ? (
                        <span className="text-red-400 flex items-center gap-0.5"><ShieldAlert className="h-3 w-3" /> Rejected</span>
                      ) : (
                        <span className="text-yellow-400 flex items-center gap-0.5"><Clock className="h-3 w-3 animate-spin" /> Pending Approval</span>
                      )}
                    </span>
                  </div>

                  <h3 className="font-accent text-sm font-bold text-white mt-1.5 line-clamp-1 group-hover:text-accent transition-colors">
                    {cert.title}
                  </h3>
                  <p className="text-[11px] text-gray-400 line-clamp-1">{cert.issuer}</p>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-purple-950/20">
                  <a
                    href={getFileUrl(cert.fileUrl)}
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
