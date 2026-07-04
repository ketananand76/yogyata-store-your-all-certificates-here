import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api, { getFileUrl } from '../utils/api';
import { Search, Award, FileText, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';

const categories = ['All', 'Development', 'Cloud', 'Security', 'Data Science', 'Academic', 'Design', 'Other'];

export default function Certificates() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('dateIssued_desc');
  const [page, setPage] = useState(1);
  const limit = 6; // Limit items per page for testing pagination easily

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setPage(1);
  }, [category, search, sortBy]);

  const fetchCertificates = async () => {
    const params = {
      page,
      limit,
      sortBy,
    };
    if (category && category !== 'All') {
      params.category = category;
    }
    if (search) {
      params.search = search;
    }
    const { data } = await api.get('/api/certificates', { params });
    return data;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['certificates', { page, category, search, sortBy }],
    queryFn: fetchCertificates,
    keepPreviousData: true,
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen relative">
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
        <h1 className="font-accent text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Yogyata Gallery <span className="text-indian-gold font-normal">संग्रह</span>
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Browse, filter, and review authentic certifications issued by standard entities (NPTEL, Google, Coursera, Universities, AWS).
        </p>
      </div>

      {/* Filters & Search controls */}
      <div className="glass-panel rounded-2xl p-4 mb-8 flex flex-col gap-4 shadow-lg border-purple-950/40 relative z-10">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400/80" />
            <input
              type="text"
              placeholder="Search by title or issuer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-[#07050d]/80 border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 pl-10 pr-8 py-2.5 rounded-xl text-sm focus:outline-none transition-all placeholder:text-gray-600"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            {/* Category Dropdown */}
            <div className="relative flex-1 sm:w-48">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none bg-[#07050d]/80 border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-300 pl-4 pr-10 py-2.5 rounded-xl text-sm focus:outline-none transition-all cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categories.filter(c => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-purple-400">
                <Filter className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex-1 sm:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none bg-[#07050d]/80 border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-300 pl-4 pr-10 py-2.5 rounded-xl text-sm focus:outline-none transition-all cursor-pointer"
              >
                <option value="dateIssued_desc">Newest First</option>
                <option value="dateIssued_asc">Oldest First</option>
                <option value="order_asc">Custom Order Index</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-purple-400">
                <ChevronRight className="h-3.5 w-3.5 rotate-90" />
              </div>
            </div>

            {/* Search Trigger */}
            <button
              type="submit"
              className="bg-accent hover:bg-accent-dark text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-purple-500/10 transition-all flex items-center justify-center gap-1.5"
            >
              Search
            </button>
          </div>
        </form>

        {/* Current Active Filters Indicators */}
        {(category !== 'All' || search) && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-purple-950/20 text-xs">
            <span className="text-gray-500">Active Filters:</span>
            {category !== 'All' && (
              <span className="bg-purple-950/40 border border-purple-800/30 text-purple-300 px-2 py-0.5 rounded-md">
                Category: {category}
              </span>
            )}
            {search && (
              <span className="bg-purple-950/40 border border-purple-800/30 text-purple-300 px-2 py-0.5 rounded-md">
                Search: "{search}"
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid container */}
      <div className="relative z-10">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonLoader count={limit} />
          </div>
        ) : error ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-red-400 border-red-950/50">
            Failed to fetch certificates. Please check your local connection or API backend status.
          </div>
        ) : data?.certificates?.length === 0 ? (
          <div className="glass-panel rounded-2xl p-16 text-center text-gray-500 border-purple-950/25">
            No certificates found matching your search filters.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {data?.certificates?.map((cert) => (
                <div
                  key={cert._id}
                  className="group relative flex flex-col bg-[#12111d]/50 rounded-2xl border border-purple-950/40 hover:border-purple-800/40 hover:bg-[#151425] shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1 transition-all overflow-hidden"
                >
                  {/* Badge featured */}
                  {cert.featured && (
                    <span className="absolute top-3 right-3 z-10 bg-gradient-to-r from-indian-gold via-yellow-500 to-yellow-600 text-dark-bg text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-lg shadow-yellow-500/10">
                      ★ Spotlight
                    </span>
                  )}

                  {/* Thumbnail */}
                  <div className="w-full h-44 bg-[#09080e] relative overflow-hidden flex items-center justify-center border-b border-purple-950/30">
                    {cert.fileType === 'pdf' ? (
                      <div className="flex flex-col items-center gap-2 text-purple-400/70 group-hover:text-purple-300 transition-colors">
                        <FileText className="h-10 w-10" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">PDF View</span>
                      </div>
                    ) : (
                      <img
                        src={getFileUrl(cert.fileUrl)}
                        alt={cert.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                    {/* Category */}
                    <span className="absolute top-3 left-3 bg-[#0d0a15]/80 backdrop-blur border border-purple-900/60 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      {cert.category}
                    </span>
                  </div>

                  {/* Info details */}
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-[11px] text-gray-500">
                      {new Date(cert.dateIssued).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    <h3 className="font-accent text-md font-bold text-white mt-1 group-hover:text-accent transition-colors line-clamp-1">
                      {cert.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{cert.issuer}</p>

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
                          Verify URL
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6 border-t border-purple-950/20">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 text-sm font-semibold border border-purple-950 hover:border-purple-800 bg-[#0d0a15]/50 px-4 py-2 rounded-xl text-gray-300 hover:text-white transition-all disabled:opacity-30 disabled:hover:border-purple-950 disabled:hover:text-gray-300 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                <span className="text-xs font-semibold text-gray-400">
                  Page <span className="text-white">{page}</span> of{' '}
                  <span className="text-white">{data.totalPages}</span>
                </span>

                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, data.totalPages))}
                  disabled={page === data.totalPages}
                  className="inline-flex items-center gap-1 text-sm font-semibold border border-purple-950 hover:border-purple-800 bg-[#0d0a15]/50 px-4 py-2 rounded-xl text-gray-300 hover:text-white transition-all disabled:opacity-30 disabled:hover:border-purple-950 disabled:hover:text-gray-300 disabled:pointer-events-none"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
