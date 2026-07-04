import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Mail, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (admin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [admin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Please fill in all fields');
    }

    setIsSubmitting(true);
    const res = await login(email, password);
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Access Granted. Welcome, Admin.');
      navigate('/admin/dashboard');
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative">
      <div className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#12111d]/75 glass-panel rounded-2xl p-8 shadow-2xl border-purple-950/40 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-950/40 border border-purple-900/50 mb-4 text-accent">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="font-accent text-2xl font-bold text-white tracking-wide">
            Admin Portal Access
          </h2>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
            Restricted Area • authorized only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Secure Credentials
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="text-[10px] text-gray-500 leading-relaxed pt-2">
            * Standard security headers (Helmet.js), input sanitization, and IP rate limits are enforced. Repeated unauthorized attempts will lock access temporarily.
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/15 hover:shadow-purple-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" /> Verifying...
              </>
            ) : (
              'Authenticate Session'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
