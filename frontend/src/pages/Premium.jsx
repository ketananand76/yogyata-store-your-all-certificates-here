import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { Sparkles, Check, CreditCard, Copy, ExternalLink, RefreshCw, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Premium() {
  const { user, checkAuth } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null); // 'Basic Monthly' or 'Pro Yearly'
  const [utrNumber, setUtrNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myPayments, setMyPayments] = useState([]);

  const plans = [
    {
      name: 'Basic Monthly',
      price: 99,
      duration: '30 Days',
      features: [
        'Unlimited AI Certificate Scans',
        'Verified Premium Gold Star Badge',
        'Priority Admin Approvals',
        'Ad-free Showcase Page Layouts',
      ],
      tag: 'Popular',
    },
    {
      name: 'Pro Yearly',
      price: 499,
      duration: '365 Days',
      features: [
        'Everything in Basic Monthly',
        'Gold Animated Profile Card Frame',
        'Download Complete PDF Portfolio',
        'Custom External Links Placement',
      ],
      tag: 'Best Value',
    },
  ];

  const fetchMyPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/payments/my-status');
      if (res.data && res.data.success) {
        setMyPayments(res.data.payments);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyPayments();
    }
  }, [user]);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText('9771735011@mbk');
    toast.success('UPI ID copied to clipboard!');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!utrNumber || utrNumber.length !== 12 || isNaN(utrNumber)) {
      toast.error('Please enter a valid 12-digit numeric UTR/Transaction ID.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/api/payments/request', {
        planName: selectedPlan.name,
        utrNumber,
      });

      if (res.data && res.data.success) {
        toast.success('Proof of payment submitted! Admin will verify soon.');
        setUtrNumber('');
        setSelectedPlan(null);
        fetchMyPayments();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification submission failed.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Build UPI links
  const getUPILink = (price, planName) => {
    const payee = '9771735011@mbk';
    const payeeName = 'Yogyata Store';
    const note = `Premium ${planName} Plan`;
    return `upi://pay?pa=${payee}&pn=${encodeURIComponent(payeeName)}&am=${price}&cu=INR&tn=${encodeURIComponent(note)}`;
  };

  const isPremiumActive = user?.isPremium && user?.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date();
  const pendingPayment = myPayments.find(p => p.status === 'pending');

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative bg-transparent overflow-hidden">
      {/* Dynamic blurred mesh circles background */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-400/25 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-pink-400/20 blur-[130px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-xs font-semibold mb-3 tracking-wider uppercase animate-pulse">
            <Sparkles className="h-3.5 w-3.5 fill-current" /> Premium Showcase
          </div>
          <h1 className="font-accent text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
            Unlock the Full Power of <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Yogyata Premium</span>
          </h1>
          <p className="mt-3 text-slate-600 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Verify unlimited certificates, customize your showcase templates, and compile clean PDF portfolios for job recruiters.
          </p>
        </div>

        {/* 1. Status Section */}
        {isPremiumActive ? (
          <div className="bg-white/45 backdrop-blur-2xl border border-yellow-500/35 rounded-2xl p-6 sm:p-8 text-center shadow-xl shadow-yellow-500/5 max-w-2xl mx-auto mb-10 transform hover:scale-[1.01] transition-transform">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
              <Star className="h-8 w-8 text-yellow-500 fill-current animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 font-accent">You are a Premium Member!</h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-2">
              All premium features are fully unlocked for your profile. Enjoy unlimited AI OCR scans, gold borders, and PDF downloads.
            </p>
            <div className="mt-4 px-4 py-2 rounded-xl bg-yellow-500/5 inline-block text-xs font-semibold text-yellow-750 border border-yellow-500/10">
              Subscription Valid Until: {new Date(user.premiumExpiresAt).toLocaleDateString()} at {new Date(user.premiumExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ) : pendingPayment ? (
          <div className="bg-white/45 backdrop-blur-2xl border border-indigo-500/35 rounded-2xl p-6 sm:p-8 text-center shadow-xl shadow-indigo-500/5 max-w-2xl mx-auto mb-10">
            <div className="w-16 h-16 rounded-full bg-indigo-550/10 flex items-center justify-center mx-auto mb-4 border border-indigo-550/20">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 font-accent">Verification in Progress</h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-2 max-w-md mx-auto leading-relaxed">
              We are verifying your transaction UTR ID: <span className="font-mono font-bold text-slate-850">{pendingPayment.utrNumber}</span> ({pendingPayment.planName}). This process usually takes 5-15 minutes.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={checkAuth}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/10"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Check Status
              </button>
            </div>
          </div>
        ) : null}

        {/* 2. Plan Selection Grid */}
        {!selectedPlan && !isPremiumActive && !pendingPayment && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="bg-white/45 backdrop-blur-2xl border border-white/60 hover:border-purple-500/35 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-slate-100 hover:shadow-purple-550/5 hover:scale-[1.02] transition-all relative overflow-hidden"
              >
                {plan.tag && (
                  <span className="absolute top-4 right-4 bg-purple-600/10 border border-purple-500/20 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {plan.tag}
                  </span>
                )}
                <div>
                  <h3 className="font-accent text-lg font-bold text-slate-800">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-800">₹{plan.price}</span>
                    <span className="text-xs text-slate-500">/ {plan.duration}</span>
                  </div>
                  
                  {/* Features List */}
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-650">
                        <Check className="h-4 w-4 text-emerald-550 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setSelectedPlan(plan)}
                  className="mt-8 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/10"
                >
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 3. Payment Details Container */}
        {selectedPlan && !isPremiumActive && !pendingPayment && (
          <div className="bg-white/45 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto shadow-2xl shadow-slate-200/50">
            <button
              onClick={() => setSelectedPlan(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 inline-flex items-center gap-1"
            >
              ← Back to plans
            </button>

            <h2 className="font-accent text-xl font-bold text-slate-800 mb-4">Complete Payment - {selectedPlan.name}</h2>
            <p className="text-xs text-slate-600 mb-6">
              Scan the QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) or tap "Pay via UPI App" on your mobile device. Amount will fetch automatically.
            </p>

            {/* UPI ID Info Box */}
            <div className="bg-slate-50/75 border border-slate-200/60 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Payee UPI ID</p>
                <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">9771735011@mbk</p>
              </div>
              <button
                onClick={handleCopyUPI}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
                title="Copy UPI ID"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            {/* QR Code and Mobile Link */}
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center mb-8 border-b border-slate-200/50 pb-6">
              {/* QR Image Generator */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getUPILink(selectedPlan.price, selectedPlan.name))}`}
                  alt="UPI QR Code"
                  className="w-40 h-40 object-contain"
                />
              </div>

              <div className="text-center sm:text-left flex flex-col gap-2">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Total Amount</p>
                  <p className="text-3xl font-extrabold text-slate-800">₹{selectedPlan.price}</p>
                </div>
                <a
                  href={getUPILink(selectedPlan.price, selectedPlan.name)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/10 mt-1"
                >
                  Pay via UPI App <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* UTR Number Form */}
            <form onSubmit={handlePaymentSubmit}>
              <div className="mb-4">
                <label htmlFor="utr" className="block text-xs font-bold text-slate-655 uppercase tracking-wide mb-1.5">
                  12-Digit Transaction UTR / Ref Number
                </label>
                <input
                  type="text"
                  id="utr"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="Enter the 12-digit UPI transaction number"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 text-sm placeholder:text-slate-400 font-mono tracking-wider"
                />
              </div>
              
              <button
                type="submit"
                disabled={submitting || utrNumber.length !== 12}
                className={`w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-lg flex items-center justify-center gap-1.5 ${
                  utrNumber.length === 12
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/10 cursor-pointer'
                    : 'bg-slate-400 shadow-none cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Submitting Verification...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" /> Submit Proof of Payment
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
