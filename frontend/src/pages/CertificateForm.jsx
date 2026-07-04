import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getFileUrl } from '../utils/api';
import { ArrowLeft, Upload, FileText, Star, Loader2, Award, Calendar, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const categories = ['Development', 'Cloud', 'Security', 'Data Science', 'Academic', 'Design', 'Other'];

export default function CertificateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [dateIssued, setDateIssued] = useState('');
  const [category, setCategory] = useState('Development');
  const [description, setDescription] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('');
  const [featured, setFeatured] = useState(false);
  const [order, setOrder] = useState(0);

  // File states
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewFileType, setPreviewFileType] = useState('image');

  // Load existing data in edit mode
  const { data: cert, isLoading: isFetching, isError } = useQuery({
    queryKey: ['certificateDetail', id],
    queryFn: async () => {
      const res = await api.get(`/api/certificates/${id}`);
      return res.data.certificate;
    },
    enabled: isEditMode,
  });

  // Initialize form fields when certificate data is fetched
  useEffect(() => {
    if (cert) {
      setTitle(cert.title);
      setIssuer(cert.issuer);
      setDateIssued(new Date(cert.dateIssued).toISOString().split('T')[0]);
      setCategory(cert.category);
      setDescription(cert.description || '');
      setVerifyUrl(cert.verifyUrl || '');
      setFeatured(cert.featured || false);
      setOrder(cert.order || 0);

      // Setup initial preview url
      if (cert.fileUrl) {
        const fullUrl = getFileUrl(cert.fileUrl);
        setPreviewUrl(fullUrl);
        setPreviewFileType(cert.fileType || 'image');
      }
    }
  }, [cert]);

  // Handle fetch error redirects
  useEffect(() => {
    if (isError) {
      toast.error('Failed to load certificate data');
      navigate('/admin/dashboard');
    }
  }, [isError, navigate]);

  // Revoke object URL on cleanup
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Size limit check (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File exceeds the 5MB size limit.');
      return;
    }

    // Type check (JPG, PNG, PDF)
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Invalid file type. Only JPG, PNG, and PDF files are allowed.');
      return;
    }

    setFile(selectedFile);
    setPreviewFileType(selectedFile.type.includes('pdf') ? 'pdf' : 'image');

    // Create local preview URL
    const localUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(localUrl);
  };

  const formMutation = useMutation({
    mutationFn: async (formData) => {
      if (isEditMode) {
        const res = await api.put(`/api/certificates/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      } else {
        const res = await api.post('/api/certificates', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(isEditMode ? 'Certificate updated successfully' : 'Certificate added successfully');
      queryClient.invalidateQueries({ queryKey: ['adminCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['featuredCertificates'] });
      navigate('/admin/dashboard');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Operation failed';
      toast.error(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title || !issuer || !dateIssued || !category) {
      return toast.error('Please fill in all required fields');
    }

    if (!isEditMode && !file) {
      return toast.error('Please upload a certificate document (Image or PDF)');
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('issuer', issuer);
    formData.append('dateIssued', dateIssued);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('verifyUrl', verifyUrl);
    formData.append('featured', featured);
    formData.append('order', order);
    if (file) {
      formData.append('file', file);
    }

    formMutation.mutate(formData);
  };

  if (isEditMode && isFetching) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen relative z-10">
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      <Link
        to="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Panel
      </Link>

      <h1 className="font-accent text-3xl font-bold text-white mb-8 tracking-wide">
        {isEditMode ? 'Modify Certificate' : 'Register New Certificate'}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form panel (7 columns) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border-purple-950/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Title */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Certificate Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. AWS Certified Solutions Architect"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>

            {/* Issuer */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Issuing Organization <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Amazon Web Services"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                required
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>

            {/* Date Issued */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Date Issued <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dateIssued}
                onChange={(e) => setDateIssued(e.target.value)}
                required
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all cursor-pointer"
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Order Index */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Order Index (Sorting weight)
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                min="0"
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>

            {/* Verify URL */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Verification Portal URL
              </label>
              <input
                type="url"
                placeholder="e.g. https://www.credly.com/verify/..."
                value={verifyUrl}
                onChange={(e) => setVerifyUrl(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Description / Skills Attained
              </label>
              <textarea
                placeholder="Detail skills, syllabus, or project accomplishments..."
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all resize-y"
              />
            </div>

            {/* Document upload box */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Upload Certificate File {!isEditMode && <span className="text-red-500">*</span>}
              </label>
              <div className="relative border-2 border-dashed border-purple-950 hover:border-purple-800/60 rounded-2xl p-6 text-center hover:bg-purple-950/5 transition-all">
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-purple-950/40 p-2.5 rounded-xl border border-purple-900/50 text-accent">
                    <Upload className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-300">
                    {file ? file.name : 'Select file (JPG, PNG or PDF)'}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Max size limit: 5MB
                  </span>
                </div>
              </div>
            </div>

            {/* Featured toggle */}
            <div className="sm:col-span-2 flex items-center gap-2 bg-[#0c0a13] border border-purple-950/60 p-4 rounded-2xl">
              <input
                type="checkbox"
                id="featured-check"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4.5 w-4.5 accent-accent cursor-pointer"
              />
              <label htmlFor="featured-check" className="text-xs font-bold text-gray-300 cursor-pointer select-none flex items-center gap-1.5">
                <Star className={`h-4 w-4 ${featured ? 'fill-indian-gold text-indian-gold' : 'text-gray-500'}`} />
                Pin to Spotlight (Showcase in Featured grid on Homepage)
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 pt-4 border-t border-purple-950/20">
            <button
              type="submit"
              disabled={formMutation.isLoading}
              className="flex-1 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {formMutation.isLoading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" /> Saving...
                </>
              ) : (
                isEditMode ? 'Update Certificate' : 'Publish Certificate'
              )}
            </button>
            <Link
              to="/admin/dashboard"
              className="flex-1 inline-flex items-center justify-center gap-2 border border-purple-800/40 hover:border-purple-500/50 bg-purple-950/20 hover:bg-purple-950/30 text-gray-300 hover:text-white font-semibold py-3 rounded-xl transition-all"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Live Preview Panel (5 columns) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="flex items-center gap-1 text-xs text-indian-gold font-bold uppercase tracking-wider">
            <Award className="h-4 w-4" /> Live Preview Panel
          </div>

          {/* Simulated details preview */}
          <div className="glass-panel rounded-2xl p-6 border-purple-950/40 space-y-5 bg-[#09080f]/90">
            {/* Fake document window */}
            <div className="w-full h-44 bg-[#050409] border border-purple-950/40 rounded-xl overflow-hidden flex items-center justify-center relative">
              {previewUrl ? (
                previewFileType === 'pdf' ? (
                  <div className="flex flex-col items-center gap-2 text-purple-400">
                    <FileText className="h-10 w-10 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold">PDF File Loaded</span>
                  </div>
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="text-gray-600 text-xs font-semibold text-center px-4">
                  Document Preview (Upload a file to display)
                </div>
              )}
              <span className="absolute top-2.5 left-2.5 bg-purple-950/80 backdrop-blur border border-purple-900/60 text-purple-300 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                {category}
              </span>
              {featured && (
                <span className="absolute top-2.5 right-2.5 bg-indian-gold text-dark-bg text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                  ★ Spotlight
                </span>
              )}
            </div>

            {/* Simulated text */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {dateIssued
                  ? new Date(dateIssued).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Date Issued'}
              </span>
              <h3 className="font-accent text-lg font-bold text-white tracking-wide leading-tight">
                {title || 'Certificate Title Placeholder'}
              </h3>
              <p className="text-xs text-gray-400 font-semibold">{issuer || 'Issuing Authority Placeholder'}</p>
            </div>

            {description && (
              <p className="text-xs text-gray-400 leading-relaxed bg-[#06040a] p-3 rounded-lg border border-purple-950/20 max-h-24 overflow-y-auto whitespace-pre-wrap">
                {description}
              </p>
            )}

            <div className="flex gap-2 pt-2 border-t border-purple-950/20">
              <button
                type="button"
                disabled={!verifyUrl}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-indian-gold/10 border border-indian-gold/30 text-indian-gold text-[10px] font-bold py-2 rounded-lg disabled:opacity-30 disabled:pointer-events-none"
              >
                Verify Portal <ExternalLink className="h-2.5 w-2.5" />
              </button>
              <button
                type="button"
                disabled={!previewUrl}
                className="flex-1 bg-purple-950/20 border border-purple-900/30 text-gray-300 text-[10px] font-bold py-2 rounded-lg disabled:opacity-30 disabled:pointer-events-none"
              >
                Download Document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
