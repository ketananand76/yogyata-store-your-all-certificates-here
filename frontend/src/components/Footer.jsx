import React from 'react';
import { toast } from 'react-hot-toast';
import { Award, Mail, MessageSquare, Shield, Sparkles, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const handleSubscribe = (e) => {
    e.preventDefault();
    toast.success('Thank you for subscribing to Yogyata updates!', { icon: '✉️' });
  };

  return (
    <footer className="bg-[#0b0a14] border-t border-purple-950/20 py-16 mt-auto relative overflow-hidden text-slate-400">
      {/* Subtle Vector Background */}
      <div className="absolute inset-0 bg-mandala-pattern bg-center pointer-events-none opacity-10"></div>
      
      {/* Decorative ambient gradient spots */}
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-accent/5 blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-purple-950/10">
          
          {/* Col 1: Brand Logo & Quote (4 columns) */}
          <div className="md:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-accent to-indigo-500 p-1.5 rounded-xl">
                <Award className="h-5 w-5 text-white" />
              </div>
              <span className="font-accent text-sm font-extrabold tracking-wider text-white">
                YOGYATA <span className="text-[10px] text-purple-400 font-normal">योग्यता</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              An elegant, tamper-resistant digital gallery and verifier for official achievements and certificates. backed by AI-driven verification.
            </p>
            <div className="pt-2 border-t border-purple-950/10 max-w-xs">
              <p className="text-xs italic text-purple-400 font-medium">
                "योगः कर्मसु कौशलम्"
              </p>
              <p className="text-[9px] text-slate-600 mt-0.5">
                Yoga is excellence in actions — Bhagavad Gita
              </p>
            </div>
          </div>

          {/* Col 2: Quick Nav Links (2 columns) */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home Portal</Link>
              </li>
              <li>
                <Link to="/search" className="hover:text-white transition-colors">Search Peers</Link>
              </li>
              <li>
                <Link to="/jobs" className="hover:text-white transition-colors">Career Hub</Link>
              </li>
              <li>
                <Link to="/premium" className="hover:text-white transition-colors">Premium Plans</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Support & Admin (2 columns) */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Access</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">User Login</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">Join Vault</Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-white transition-colors flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-indian-gold" /> Admin Panel</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter Mockup (4 columns) */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Stay Updated</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Subscribe to our newsletter to receive updates on security compliance, verification standards, and platform releases.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2 pt-1 max-w-sm">
              <input
                type="email"
                required
                placeholder="developer@yogyata.in"
                className="flex-1 bg-[#050409] border border-purple-950/70 text-slate-300 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-accent transition-all placeholder:text-slate-650"
              />
              <button
                type="submit"
                className="bg-accent hover:bg-accent-dark text-white p-2.5 rounded-xl transition-all shadow-md shadow-purple-500/10 hover:scale-105 active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

        </div>

        {/* Bottom copyright row */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 text-xs text-slate-600 gap-4">
          <p>&copy; {new Date().getFullYear()} Yogyata. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span>Made with Pride in India</span>
              <span className="inline-block w-2.5 h-[5px] bg-indian-saffron rounded-sm"></span>
              <span className="inline-block w-2.5 h-[5px] bg-white rounded-sm"></span>
              <span className="inline-block w-2.5 h-[5px] bg-indian-emerald rounded-sm"></span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
