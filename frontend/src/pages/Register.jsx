import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const { user, loading, checkAuth } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      return toast.error('Please fill in all fields');
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/api/users/register', {
        name,
        email,
        password,
      });

      if (data.success) {
        toast.success(`Registration successful! Welcome ${name}`);
        await checkAuth(); // refresh auth status
        navigate('/dashboard');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed. Try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-16 flex items-center justify-center px-4 relative z-10">
      <div className="absolute top-[15%] left-[-10%] w-[35vw] h-[35vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#12111d]/75 glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border-purple-950/40 relative">
        <div className="text-center mb-8">
          <span className="font-accent text-lg font-bold tracking-widest text-purple-300">
            YOGYATA <span className="text-indian-gold font-normal">योग्यता</span>
          </span>
          <h2 className="font-accent text-2xl font-bold text-white mt-2">
            Create Personal Vault
          </h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">
            Register to store your certificates
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
              <input
                type="text"
                placeholder="Rahul Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
              <input
                type="email"
                placeholder="rahul@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#07050d] border border-purple-950/70 hover:border-purple-800/40 focus:border-accent text-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Password
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

          <div className="flex flex-col gap-3 pt-4 border-t border-purple-950/20">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/15 hover:shadow-purple-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" /> Registering...
                </>
              ) : (
                'Register Account'
              )}
            </button>
            <div className="text-center text-xs text-gray-400 mt-2">
              Already have an account?{' '}
              <Link to="/login" className="text-accent hover:underline font-semibold">
                Login here
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
