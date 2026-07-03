import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getFileUrl } from '../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Globe, Code, Briefcase, Upload, ShieldAlert, Loader2, Save } from 'lucide-react';

export default function Settings() {
  const { user, loading, checkAuth, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('yogyata-theme') || 'purple');

  const handleThemeChange = (newTheme) => {
    setActiveTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('yogyata-theme', newTheme);
    toast.success(`Theme switched to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}!`, { icon: '🎨' });
  };

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      toast.success('Logged out successfully');
      navigate('/');
    } else {
      toast.error('Logout failed');
    }
  };

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [privateAccount, setPrivateAccount] = useState(user?.privateAccount || false);
  
  const [website, setWebsite] = useState(user?.links?.website || '');
  const [github, setGithub] = useState(user?.links?.github || '');
  const [linkedin, setLinkedin] = useState(user?.links?.linkedin || '');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [file, setFile] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect guest
  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 2 * 1024 * 1024) {
        return toast.error('Profile photo must be less than 2MB');
      }
      setFile(selectedFile);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name cannot be empty');
    
    if (password && password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('bio', bio);
    formData.append('gender', gender);
    formData.append('privateAccount', privateAccount);
    formData.append('website', website);
    formData.append('github', github);
    formData.append('linkedin', linkedin);
    
    if (password) {
      formData.append('password', password);
    }
    if (file) {
      formData.append('file', file);
    }

    setIsUpdating(true);
    try {
      const res = await api.put('/api/social/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success('Profile settings updated successfully!');
        await checkAuth();
        setPassword('');
        setConfirmPassword('');
        setFile(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Profile update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm(
      'WARNING: Are you absolutely sure you want to permanently delete your account? All of your uploaded certificates will be deleted forever. This action cannot be undone!'
    );
    if (!confirm) return;

    setIsDeleting(true);
    try {
      const res = await api.delete('/api/social/profile');
      if (res.data.success) {
        toast.success('Account permanently deleted');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 min-h-screen relative z-10">
      <div className="absolute top-[10%] left-[-10%] w-[30vw] h-[30vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="mb-8">
        <span className="text-[10px] text-indian-gold font-bold tracking-[0.2em] uppercase">User Profile Controls</span>
        <h1 className="font-accent text-3xl font-bold text-white tracking-wide mt-1">Advanced Settings</h1>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
          Customize your bio, upload profile picture, links, privacy, and account security
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Settings Forms (8 cols) */}
        <form onSubmit={handleProfileSubmit} className="md:col-span-8 space-y-6">
          
          {/* Avatar & Photo uploading */}
          <div className="glass-panel rounded-2xl p-6 border-purple-950/40 flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-20 h-20 bg-purple-950/30 rounded-full border border-purple-800/40 flex items-center justify-center font-accent text-2xl font-bold text-purple-300 overflow-hidden shrink-0">
              {file ? (
                <img src={URL.createObjectURL(file)} alt="Preview avatar" className="w-full h-full object-cover" />
              ) : user.profilePicture ? (
                <img
                  src={getFileUrl(user.profilePicture)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Change Profile Photo</h3>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <label className="bg-purple-950/40 border border-purple-900/50 hover:bg-purple-900/30 text-purple-300 text-[10px] font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-red-400 border border-red-950 hover:bg-red-950/20 text-[10px] font-bold px-4 py-2 rounded-xl transition-all"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-500">Max size 2MB (JPG, PNG, WebP)</p>
            </div>
          </div>

          {/* Core Info settings */}
          <div className="glass-panel rounded-2xl p-6 border-purple-950/40 space-y-4">
            <h3 className="font-accent text-sm font-bold text-purple-300 uppercase tracking-widest border-b border-purple-950/30 pb-2">Profile Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 pl-9 pr-3 py-2 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Email Address (Read Only)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-700" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full bg-[#040307] border border-purple-950/40 text-xs text-gray-600 pl-9 pr-3 py-2 rounded-lg focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Account Privacy</label>
                <select
                  value={privateAccount ? 'true' : 'false'}
                  onChange={(e) => setPrivateAccount(e.target.value === 'true')}
                  className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="false">Public Account (Everyone can follow/view)</option>
                  <option value="true">Private Account (Follow required to view vault)</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-gray-500">Bio Description</label>
                <textarea
                  rows="3"
                  placeholder="Tell us about your portfolio, certifications or profession..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 px-3 py-2 rounded-lg focus:outline-none resize-y"
                />
              </div>
            </div>
          </div>

          {/* Social Links settings */}
          <div className="glass-panel rounded-2xl p-6 border-purple-950/40 space-y-4">
            <h3 className="font-accent text-sm font-bold text-purple-300 uppercase tracking-widest border-b border-purple-950/30 pb-2">Social Links</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Portfolio Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                  <input
                    type="url"
                    placeholder="https://mywebsite.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 pl-9 pr-3 py-2 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">GitHub Profile</label>
                <div className="relative">
                  <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                  <input
                    type="url"
                    placeholder="https://github.com/username"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 pl-9 pr-3 py-2 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">LinkedIn Profile</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 pl-9 pr-3 py-2 rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Security & Password settings */}
          <div className="glass-panel rounded-2xl p-6 border-purple-950/40 space-y-4">
            <h3 className="font-accent text-sm font-bold text-purple-300 uppercase tracking-widest border-b border-purple-950/30 pb-2">Change Password</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                  <input
                    type="password"
                    placeholder="Leave empty if unchanged"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 pl-9 pr-3 py-2 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                  <input
                    type="password"
                    placeholder="Leave empty if unchanged"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#07050d] border border-purple-950/80 focus:border-accent text-xs text-gray-200 pl-9 pr-3 py-2 rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit block */}
          <button
            type="submit"
            disabled={isUpdating}
            className="w-full bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/10 flex items-center justify-center gap-1.5 hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4.5 w-4.5" /> Save Profile Configurations
              </>
            )}
          </button>
        </form>

        {/* Sidebar Controls (4 cols) */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Theme Selector */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl border-purple-950/40">
            <h3 className="font-accent text-xs font-bold uppercase tracking-wider text-purple-300">Appearance Theme</h3>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Select your preferred visual style. The theme resets custom gradients, borders, and colors dynamically.
            </p>
            
            <div className="grid grid-cols-5 gap-2 pt-2">
              {/* 1. Purple */}
              <button
                type="button"
                onClick={() => handleThemeChange('purple')}
                className={`h-8 w-full rounded-lg bg-[#a855f7] border-2 transition-all hover:scale-110 active:scale-95 ${
                  activeTheme === 'purple' ? 'border-white scale-105 shadow-md shadow-purple-500/30' : 'border-transparent opacity-80'
                }`}
                title="Amethyst Purple"
              />
              {/* 2. Emerald */}
              <button
                type="button"
                onClick={() => handleThemeChange('emerald')}
                className={`h-8 w-full rounded-lg bg-[#10b981] border-2 transition-all hover:scale-110 active:scale-95 ${
                  activeTheme === 'emerald' ? 'border-white scale-105 shadow-md shadow-emerald-500/30' : 'border-transparent opacity-80'
                }`}
                title="Emerald Mint"
              />
              {/* 3. Cyberpunk */}
              <button
                type="button"
                onClick={() => handleThemeChange('cyberpunk')}
                className={`h-8 w-full rounded-lg bg-[#ec4899] border-2 transition-all hover:scale-110 active:scale-95 ${
                  activeTheme === 'cyberpunk' ? 'border-white scale-105 shadow-md shadow-pink-500/30' : 'border-transparent opacity-80'
                }`}
                title="Cyberpunk Neon"
              />
              {/* 4. Saffron */}
              <button
                type="button"
                onClick={() => handleThemeChange('saffron')}
                className={`h-8 w-full rounded-lg bg-[#f59e0b] border-2 transition-all hover:scale-110 active:scale-95 ${
                  activeTheme === 'saffron' ? 'border-white scale-105 shadow-md shadow-amber-500/30' : 'border-transparent opacity-80'
                }`}
                title="Saffron Gold"
              />
              {/* 5. Slate */}
              <button
                type="button"
                onClick={() => handleThemeChange('slate')}
                className={`h-8 w-full rounded-lg bg-[#3b82f6] border-2 transition-all hover:scale-110 active:scale-95 ${
                  activeTheme === 'slate' ? 'border-white scale-105 shadow-md shadow-blue-500/30' : 'border-transparent opacity-80'
                }`}
                title="Midnight Slate"
              />
            </div>
          </div>

          {/* Session Controls */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl border-purple-950/40">
            <h3 className="font-accent text-xs font-bold uppercase tracking-wider text-purple-300">Session Controls</h3>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Log out of your active Yogyata portal session on this browser.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full bg-[#161426] hover:bg-purple-950/20 border border-purple-900/50 hover:border-accent text-white font-bold py-2 rounded-xl text-xs hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              Logout Session
            </button>
          </div>

          {/* Danger Zone */}
          <div className="glass-panel border-red-500/20 bg-red-950/5 p-6 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <h3 className="font-accent text-xs font-bold uppercase tracking-wider">Danger Zone</h3>
            </div>
            
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Once you delete your account, there is no going back. All of your personal credentials, follow connections, likes, comments, and logs will be permanently erased.
            </p>

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="w-full bg-red-650 hover:bg-red-750 text-white font-bold py-2 rounded-xl text-xs hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
