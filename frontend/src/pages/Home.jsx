import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Award, ArrowRight, ShieldCheck, FileText, ChevronRight } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';

const fetchFeaturedCertificates = async () => {
  const { data } = await api.get('/api/certificates?featured=true');
  return data;
};

export default function Home() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['featuredCertificates'],
    queryFn: fetchFeaturedCertificates,
  });

  return (
    <div className="relative overflow-hidden min-h-screen flex flex-col">
      {/* Background vector glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indian-saffron/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 z-10">
        {/* Rotating Mandala Background on Right side behind hero graphics */}
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
              Browse Full Gallery
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#featured"
              className="inline-flex items-center justify-center gap-2 border border-purple-800/40 hover:border-purple-500/50 bg-purple-950/10 hover:bg-purple-950/20 text-gray-300 hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-all"
            >
              Featured Credentials
            </a>
          </div>

          {/* Quick numbers section */}
          <div className="grid grid-cols-3 gap-6 max-w-md pt-8 border-t border-purple-950/50 mx-auto lg:mx-0">
            <div className="text-center lg:text-left">
              <p className="text-2xl font-bold text-white font-accent">100%</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Verified</p>
            </div>
            <div className="text-center lg:text-left">
              <p className="text-2xl font-bold text-white font-accent">Secure</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Storage</p>
            </div>
            <div className="text-center lg:text-left">
              <p className="text-2xl font-bold text-white font-accent">Instant</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Lookup</p>
            </div>
          </div>
        </div>

        {/* Hero Visual Card Stack */}
        <div className="flex-1 relative w-full max-w-md lg:max-w-none flex justify-center">
          <div className="relative w-[320px] sm:w-[400px] h-[280px] sm:h-[320px]">
            {/* Background layered card */}
            <div className="absolute inset-0 bg-purple-900/10 rounded-2xl border border-purple-500/10 rotate-[-6deg] translate-y-2 translate-x-[-10px] blur-[1px]"></div>
            {/* Premium Gold framed foreground card */}
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
      <section id="featured" className="py-16 bg-[#08070d]/50 border-t border-purple-950/20 relative z-10">
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
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-purple-300 transition-colors group"
            >
              View all certificates
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <SkeletonLoader count={3} />
            </div>
          ) : error ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-red-400 border-red-950/50">
              Failed to load certificates. Please check your connection.
            </div>
          ) : data?.certificates?.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-gray-500 border-purple-950/20">
              No featured certificates found. Admin can mark certificates as "featured" in the dashboard.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.certificates?.map((cert) => (
                <div
                  key={cert._id}
                  className="group relative flex flex-col bg-[#12111d]/60 rounded-2xl border border-purple-950/50 hover:border-purple-800/40 hover:bg-[#151425] shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1 transition-all overflow-hidden"
                >
                  {/* File preview / placeholder area */}
                  <div className="w-full h-48 bg-[#09080e] relative overflow-hidden flex items-center justify-center border-b border-purple-950/30">
                    {cert.fileType === 'pdf' ? (
                      <div className="flex flex-col items-center gap-2 text-purple-400/70 group-hover:text-purple-300 transition-colors">
                        <FileText className="h-12 w-12" />
                        <span className="text-xs uppercase tracking-wider font-semibold">PDF Document</span>
                      </div>
                    ) : (
                      <img
                        src={
                          cert.fileUrl.startsWith('/uploads')
                            ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${cert.fileUrl}`
                            : cert.fileUrl
                        }
                        alt={cert.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                    {/* Category Label */}
                    <span className="absolute top-3 left-3 bg-[#0d0a15]/80 backdrop-blur border border-purple-900/60 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                      {cert.category}
                    </span>
                  </div>

                  {/* Body details */}
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-xs text-gray-500">
                      {new Date(cert.dateIssued).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    <h3 className="font-accent text-lg font-bold text-white mt-1 group-hover:text-accent transition-colors">
                      {cert.title}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{cert.issuer}</p>

                    {/* Footer Buttons */}
                    <div className="flex gap-2.5 mt-6 pt-4 border-t border-purple-950/30">
                      <Link
                        to={`/certificates/${cert._id}`}
                        className="flex-1 inline-flex items-center justify-center text-xs font-semibold bg-purple-950/30 hover:bg-purple-900/40 text-purple-200 border border-purple-900/40 py-2 rounded-lg transition-colors"
                      >
                        Inspect details
                      </Link>
                      {cert.verifyUrl && (
                        <a
                          href={cert.verifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center text-xs font-semibold bg-gradient-to-r from-indian-gold/20 to-yellow-600/20 hover:from-indian-gold/30 hover:to-yellow-600/30 text-indian-gold border border-indian-gold/30 py-2 rounded-lg transition-colors"
                        >
                          Verify credentials
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
