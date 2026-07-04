import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api, { getFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, MapPin, DollarSign, Search, Plus, X, Loader2, 
  CheckCircle2, Users, FileText, ArrowRight, UserPlus, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Jobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter States
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Active Job details selection
  const [selectedJobId, setSelectedJobId] = useState(null);

  // Job Posting Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postCompany, setPostCompany] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [postType, setPostType] = useState('Full-time');
  const [postSalary, setPostSalary] = useState('');
  const [postSkills, setPostSkills] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Queries
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', search, locationFilter, typeFilter],
    queryFn: async () => {
      const res = await api.get('/api/jobs', {
        params: {
          search: search || undefined,
          location: locationFilter || undefined,
          type: typeFilter !== 'All' ? typeFilter : undefined,
        }
      });
      return res.data.jobs;
    },
  });

  // Automatically select the first job once loaded if none is selected
  React.useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0]._id);
    }
  }, [jobs, selectedJobId]);

  const selectedJob = jobs.find(j => j._id === selectedJobId) || jobs[0];

  // Mutations
  const applyMutation = useMutation({
    mutationFn: async (jobId) => {
      const res = await api.post(`/api/jobs/${jobId}/apply`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Applied successfully!', { icon: '💼' });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Application failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (jobId) => {
      const res = await api.delete(`/api/jobs/${jobId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Job posting deleted successfully');
      setSelectedJobId(null);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Delete failed');
    },
  });

  // Handle Post Job Form Submission
  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!postTitle || !postCompany || !postLocation || !postDescription) {
      return toast.error('Please fill in all required fields');
    }

    setIsPosting(true);
    try {
      const res = await api.post('/api/jobs', {
        title: postTitle,
        company: postCompany,
        location: postLocation,
        type: postType,
        salary: postSalary,
        skillsRequired: postSkills,
        description: postDescription,
      });

      if (res.data.success) {
        toast.success('Job posted successfully!', { icon: '🚀' });
        setShowPostModal(false);
        // Reset Form
        setPostTitle('');
        setPostCompany('');
        setPostLocation('');
        setPostType('Full-time');
        setPostSalary('');
        setPostSkills('');
        setPostDescription('');
        
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        if (res.data.job) setSelectedJobId(res.data.job._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post job');
    } finally {
      setIsPosting(false);
    }
  };

  const handleApply = (jobId) => {
    applyMutation.mutate(jobId);
  };

  const handleDelete = (jobId) => {
    if (window.confirm('Are you sure you want to delete this job posting?')) {
      deleteMutation.mutate(jobId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-72px)] flex flex-col relative z-10">
      
      {/* Glow Effects */}
      <div className="absolute top-[10%] right-[-10%] w-[35vw] h-[35vw] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-5%] w-[30vw] h-[30vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-indian-gold font-bold uppercase tracking-wider mb-2">
            <Briefcase className="h-4 w-4" /> Careers Hub
          </div>
          <h1 className="font-accent text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Discover Your Next{' '}
            <span className="bg-gradient-to-r from-accent via-purple-400 to-indian-gold bg-clip-text text-transparent text-glow-purple">
              Opportunity
            </span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Connect with top developers, apply for verified technology listings, or hire specialized talent.
          </p>
        </div>

        <button
          onClick={() => setShowPostModal(true)}
          className="bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-purple-500/15 hover:shadow-purple-500/25 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 text-sm"
        >
          <Plus className="h-4.5 w-4.5" /> Post a Job
        </button>
      </div>

      {/* Filter and Search Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 bg-[#0c0a13]/70 border border-purple-950/45 p-4 rounded-2xl glass-panel shadow-md">
        
        {/* Search */}
        <div className="md:col-span-5 relative flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type="text"
            placeholder="Search job title, company, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#050409]/80 border border-purple-950 focus:border-accent text-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none transition-all placeholder:text-gray-600"
          />
        </div>

        {/* Location filter */}
        <div className="md:col-span-4 relative flex items-center">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type="text"
            placeholder="Filter by city, country or Remote..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full bg-[#050409]/80 border border-purple-950 focus:border-accent text-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none transition-all placeholder:text-gray-600"
          />
        </div>

        {/* Job Type filter */}
        <div className="md:col-span-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-[#050409]/80 border border-purple-950 focus:border-accent text-gray-400 focus:text-white px-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all"
          >
            <option value="All">All Job Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
            <option value="Remote">Remote</option>
          </select>
        </div>
      </div>

      {/* Main Board Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 items-start">
        
        {/* Left Column: Job List (5 cols) */}
        <div className="lg:col-span-5 space-y-4 max-h-[68vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border-purple-950/20 text-center space-y-4 bg-[#0c0a13]/40">
              <Briefcase className="h-10 w-10 text-gray-700 mx-auto" />
              <p className="text-gray-500 text-xs">No active job listings found.</p>
              <p className="text-[10px] text-gray-600 max-w-xs mx-auto">
                Try widening your search terms or post a new job opening to start hiring.
              </p>
            </div>
          ) : (
            jobs.map((job) => {
              const active = job._id === selectedJobId;
              const applied = job.applicants?.some(a => String(a._id || a) === String(user?._id));
              
              return (
                <button
                  key={job._id}
                  onClick={() => setSelectedJobId(job._id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative group/card flex flex-col justify-between h-40 ${
                    active 
                      ? 'bg-[#1a162b]/80 border-accent/60 shadow-lg shadow-purple-500/5' 
                      : 'bg-[#0f0d19]/80 border-purple-950/45 hover:border-purple-800/60 hover:bg-[#131022]/60'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-accent font-bold text-xs sm:text-sm text-white group-hover/card:text-accent transition-colors truncate">
                        {job.title}
                      </h3>
                      <span className="text-[8px] bg-purple-950/60 text-purple-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 border border-purple-900/40">
                        {job.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 font-semibold mt-1">{job.company}</p>
                    
                    <div className="flex items-center gap-3.5 text-[10px] text-gray-500 mt-3">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /> {job.location}</span>
                      {job.salary && <span className="flex items-center gap-0.5"><DollarSign className="h-3.5 w-3.5 shrink-0" /> {job.salary}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-purple-950/20 pt-3 mt-3 text-[10px] text-gray-500">
                    <span>{new Date(job.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                    <span className="flex items-center gap-1 font-bold">
                      {applied ? (
                        <span className="text-green-400 flex items-center gap-1">✓ Applied</span>
                      ) : (
                        <span className="group-hover/card:text-white transition-colors flex items-center gap-0.5">Details <ArrowRight className="h-3 w-3 group-hover/card:translate-x-0.5 transition-transform" /></span>
                      )}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Active Job Details (7 cols) */}
        <div className="lg:col-span-7 bg-[#0c0a13]/70 border border-purple-950/45 rounded-2xl glass-panel overflow-hidden shadow-xl min-h-[500px]">
          {selectedJob ? (
            <div className="flex flex-col h-full animate-float-up">
              {/* Header details */}
              <div className="p-6 border-b border-purple-950/20 bg-[#08070d]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] bg-purple-950/50 text-purple-300 font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-purple-900/40">
                    {selectedJob.type}
                  </span>
                  <h2 className="font-accent text-lg sm:text-xl font-bold text-glow-purple text-white pt-1">{selectedJob.title}</h2>
                  <p className="text-xs text-purple-300 font-bold">{selectedJob.company}</p>
                  
                  <div className="flex flex-wrap gap-4 text-[11px] text-gray-400 pt-2">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0" /> {selectedJob.location}</span>
                    {selectedJob.salary && <span className="flex items-center gap-0.5"><DollarSign className="h-3.5 w-3.5 text-purple-400 shrink-0" /> {selectedJob.salary}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {String(selectedJob.postedBy?._id || selectedJob.postedBy) === String(user?._id) ? (
                    <>
                      <button
                        onClick={() => handleDelete(selectedJob._id)}
                        className="p-2.5 rounded-xl border border-red-500/20 bg-red-950/10 text-red-400 hover:bg-red-950/20 hover:border-red-500/40 transition-colors"
                        title="Delete Job Posting"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 border border-purple-900/40 px-3.5 py-2.5 rounded-xl bg-purple-950/10">
                        Your Posting
                      </span>
                    </>
                  ) : selectedJob.applicants?.some(a => String(a._id || a) === String(user?._id)) ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-400 bg-green-950/20 border border-green-500/35 px-4 py-2.5 rounded-xl font-bold">
                      <CheckCircle2 className="h-4.5 w-4.5" /> Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApply(selectedJob._id)}
                      disabled={applyMutation.isLoading}
                      className="bg-accent hover:bg-accent-dark text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center gap-1.5 text-xs"
                    >
                      {applyMutation.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Apply Now <ArrowRight className="h-4 w-4" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Main Info */}
              <div className="p-6 space-y-6 flex-1 max-h-[50vh] overflow-y-auto">
                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Job Description</h3>
                  <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
                </div>

                {/* Skills */}
                {selectedJob.skillsRequired?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Skills Required</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJob.skillsRequired.map((skill, i) => (
                        <span 
                          key={i} 
                          className="text-[10px] bg-[#1a162b] text-purple-300 font-semibold px-3 py-1 rounded-full border border-purple-950/60"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Poster Bio */}
                {selectedJob.postedBy && (
                  <div className="border-t border-purple-950/20 pt-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-purple-900/40 border border-purple-800/40 overflow-hidden flex items-center justify-center font-bold text-xs text-purple-300 shrink-0">
                      {selectedJob.postedBy.profilePicture ? (
                        <img src={getFileUrl(selectedJob.postedBy.profilePicture)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedJob.postedBy.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-none font-bold">Posted By</p>
                      <Link 
                        to={`/profile/${selectedJob.postedBy._id}`}
                        className="text-xs font-bold text-white hover:text-accent hover:underline transition-colors block mt-1"
                      >
                        {selectedJob.postedBy.name}
                      </Link>
                    </div>
                  </div>
                )}

                {/* Applicants List (visible only to the poster) */}
                {String(selectedJob.postedBy?._id || selectedJob.postedBy) === String(user?._id) && (
                  <div className="border-t border-purple-950/20 pt-5 space-y-3.5">
                    <div className="flex items-center gap-2 text-white">
                      <Users className="h-4 w-4 text-purple-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">Applicants ({selectedJob.applicants?.length || 0})</h3>
                    </div>

                    {selectedJob.applicants?.length === 0 ? (
                      <p className="text-[11px] text-gray-600 italic">No candidates have applied for this position yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {selectedJob.applicants.map((candidate) => (
                          <div 
                            key={candidate._id}
                            className="bg-[#050409]/40 border border-purple-950/60 p-3 rounded-xl flex items-center gap-3 hover:border-purple-800/40 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-purple-950/60 border border-purple-900/35 overflow-hidden flex items-center justify-center font-bold text-xs text-purple-300 shrink-0">
                              {candidate.profilePicture ? (
                                <img src={getFileUrl(candidate.profilePicture)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                candidate.name?.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link 
                                to={`/profile/${candidate._id}`}
                                className="text-[11px] font-bold text-white hover:text-accent hover:underline truncate block"
                              >
                                {candidate.name}
                              </Link>
                              <span className="block text-[9px] text-gray-500 truncate mt-0.5">{candidate.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[500px]">
              <Briefcase className="h-12 w-12 text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">Select a job listing to view description, salary metrics, and requirements.</p>
            </div>
          )}
        </div>
      </div>

      {/* Post a Job Modal Popup */}
      {showPostModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md transition-all">
          <div className="w-full max-w-xl bg-[#110e20]/80 glass-panel rounded-2xl border border-purple-950/60 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-float-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-purple-950/30">
              <h2 className="font-accent text-lg font-bold text-glow-purple text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-accent" /> Post New Job Listing
              </h2>
              <button
                onClick={() => setShowPostModal(false)}
                className="p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePostJob} className="space-y-4 pt-4">
              
              {/* Job Title & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Job Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Stack Developer"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="w-full bg-[#050409]/80 border border-purple-950 focus:border-accent text-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Corporation"
                    value={postCompany}
                    onChange={(e) => setPostCompany(e.target.value)}
                    className="w-full bg-[#050409]/80 border border-purple-950 focus:border-accent text-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Location & Job Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="Remote / Mumbai, India"
                    value={postLocation}
                    onChange={(e) => setPostLocation(e.target.value)}
                    className="w-full bg-[#050409]/80 border border-purple-950 focus:border-accent text-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Job Type *</label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="w-full bg-[#050409]/80 border border-purple-950 focus:border-accent text-gray-400 focus:text-white px-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              {/* Salary & Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Salary Estimate</label>
                  <input
                    type="text"
                    placeholder="₹8L - ₹12L / $80k - $110k"
                    value={postSalary}
                    onChange={(e) => setPostSalary(e.target.value)}
                    className="w-full bg-[#050409]/80 border border-purple-950 focus:border-accent text-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Required Skills (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="React, Node.js, Express, MongoDB"
                    value={postSkills}
                    onChange={(e) => setPostSkills(e.target.value)}
                    className="w-full bg-[#050409]/80 border border-purple-950 focus:border-accent text-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Job Description *</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Outline the responsibilities, project scope, and qualifications..."
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  className="w-full bg-[#050409]/80 border border-purple-950 focus:border-accent text-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none transition-all font-sans resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-purple-950/20">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 bg-purple-950/20 hover:bg-purple-950/40 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-purple-900/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPosting}
                  className="bg-accent hover:bg-accent-dark text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-purple-500/10 flex items-center gap-1.5"
                >
                  {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
