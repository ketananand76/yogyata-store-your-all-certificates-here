import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api, { getFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ExternalLink, Download, Calendar, ShieldCheck, Tag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const fetchCertificate = async (id) => {
  const { data } = await api.get(`/api/certificates/${id}`);
  return data.certificate;
};

export default function CertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, admin } = useAuth();

  const { data: cert, isLoading, error } = useQuery({
    queryKey: ['certificateDetail', id],
    queryFn: () => fetchCertificate(id),
  });

  const isAdmin = !!admin;
  const isOwner = user && cert && cert.uploadedBy && (
    String(cert.uploadedBy) === String(user._id) ||
    String(cert.uploadedBy._id || cert.uploadedBy) === String(user._id)
  );

  console.log('Vault Authorization debug:', {
    user: user?._id,
    admin: admin?._id || !!admin,
    certOwner: cert?.uploadedBy,
    isOwner,
    isAdmin
  });

  // Delete certificate mutation
  const { mutate: deleteCert, isLoading: isDeleting } = useMutation({
    mutationFn: async () => {
      if (isAdmin) {
        return api.delete(`/api/certificates/${id}`);
      } else {
        return api.delete(`/api/users/certificates/${id}`);
      }
    },
    onSuccess: () => {
      toast.success('Certificate deleted successfully');
      navigate(isAdmin ? '/admin/dashboard' : '/dashboard');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Delete operation failed');
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to permanently delete this certificate?')) {
      deleteCert();
    }
  };

  const getFullFileUrl = (url) => {
    return getFileUrl(url);
  };

  const handleDownload = () => {
    const fileUrl = getFullFileUrl(cert.fileUrl);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `${cert.title.replace(/\s+/g, '_')}_Certificate`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-t-accent border-r-transparent border-b-purple-950 border-l-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 text-sm tracking-wide">Loading certificate details...</p>
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen">
        <div className="glass-panel rounded-2xl p-8 text-center text-red-400 border-red-950/50">
          <p className="mb-4">Certificate not found or failed to fetch.</p>
          <Link to="/" className="text-accent hover:underline flex items-center gap-1.5 justify-center">
            <ArrowLeft className="h-4 w-4" /> Return to Feed
          </Link>
        </div>
      </div>
    );
  }

  const fileUrl = getFullFileUrl(cert.fileUrl);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen relative z-10">
      <Link
        to={isAdmin ? '/admin/dashboard' : (user ? '/dashboard' : '/')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-400 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Document Preview (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel-gold rounded-2xl p-3 bg-[#0c0a13] shadow-2xl relative border-indian-gold/15">
            {cert.fileType === 'pdf' ? (
              <div className="w-full h-[550px] rounded-xl overflow-hidden bg-[#050409] flex flex-col">
                <iframe
                  src={`${fileUrl}#toolbar=1`}
                  className="w-full h-full border-none"
                  title={cert.title}
                />
              </div>
            ) : (
              <div className="w-full max-h-[550px] rounded-xl overflow-hidden bg-[#050409] flex items-center justify-center p-2">
                <img
                  src={fileUrl}
                  alt={cert.title}
                  className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Metadata & Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel rounded-2xl p-6 shadow-xl border-purple-950/40 space-y-6">
            <div>
              <span className="bg-purple-950/50 border border-purple-800/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                <Tag className="h-3 w-3" /> {cert.category}
              </span>
              <h1 className="font-accent text-2xl sm:text-3xl font-bold text-white mt-3 leading-snug">
                {cert.title}
              </h1>
              <p className="text-gray-400 font-semibold text-sm mt-1">{cert.issuer}</p>
            </div>

            {/* Date Details */}
            <div className="flex items-center gap-3 text-sm text-gray-400 bg-purple-950/15 border border-purple-950/40 p-3 rounded-xl">
              <Calendar className="h-4.5 w-4.5 text-purple-400" />
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Date Issued</p>
                <p className="text-gray-200 font-medium mt-0.5">
                  {new Date(cert.dateIssued).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Description */}
            {cert.description && (
              <div className="space-y-2">
                <h3 className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Description</h3>
                <p className="text-sm text-gray-300 leading-relaxed bg-purple-950/10 p-4 rounded-xl border border-purple-950/30 whitespace-pre-wrap">
                  {cert.description}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-purple-950/20">
              {cert.verifyUrl && (
                <a
                  href={cert.verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indian-gold to-yellow-600 hover:from-yellow-600 hover:to-indian-gold text-dark-bg font-bold px-6 py-3 rounded-xl shadow-lg shadow-yellow-500/10 hover:scale-[1.01] transition-all"
                >
                  Verify on Issuer Portal
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}

              {(isOwner || isAdmin) && (
                <button
                  onClick={handleDownload}
                  className="w-full inline-flex items-center justify-center gap-2 border border-purple-800/40 hover:border-purple-500/50 bg-purple-950/20 hover:bg-purple-950/30 text-gray-200 hover:text-white font-semibold px-6 py-3 rounded-xl transition-all"
                >
                  Download File
                  <Download className="h-4 w-4" />
                </button>
              )}

              {/* Secure Contextual Delete trigger */}
              {(isOwner || isAdmin) && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full inline-flex items-center justify-center gap-2 border border-red-500/30 hover:border-red-500/50 bg-red-950/10 hover:bg-red-950/20 text-red-400 hover:text-red-300 font-semibold px-6 py-3 rounded-xl transition-all"
                >
                  {isDeleting ? 'Deleting Certificate...' : 'Delete Certificate'}
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Indian Authenticity Seal */}
          <div className="glass-panel border-indian-emerald/20 bg-indian-emerald/5 p-4 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-indian-emerald shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-200">Verified Certificate</h4>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                This document is verified and linked to the issuer's validation databases. Copying or tampering with the certificate is protected under IT Act standards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
