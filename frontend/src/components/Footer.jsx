import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-[#07060b] border-t border-purple-950/40 py-10 mt-auto relative overflow-hidden">
      {/* Background mandala subtle highlight */}
      <div className="absolute inset-0 bg-mandala-pattern bg-center pointer-events-none opacity-40"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="font-accent text-md font-bold tracking-wider text-purple-300">
              YOGYATA <span className="text-indian-gold font-normal">योग्यता</span>
            </span>
            <span className="text-xs text-gray-500 mt-1 max-w-sm">
              An elegant, tamper-resistant digital gallery and verifier for official achievements and certificates.
            </span>
          </div>

          {/* Sanskrit motif/quote to enhance Indian vibe */}
          <div className="flex flex-col items-center">
            <p className="text-xs italic text-purple-400 font-medium tracking-wide">
              "योगः कर्मसु कौशलम्"
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Yoga is excellence in actions — Bhagavad Gita
            </p>
          </div>

          <div className="text-xs text-gray-500 flex flex-col items-center md:items-end">
            <p>&copy; {new Date().getFullYear()} Yogyata. All rights reserved.</p>
            <p className="mt-1 flex items-center gap-1.5">
              <span>Made with Pride in India</span>
              <span className="inline-block w-2.5 h-[5px] bg-indian-saffron"></span>
              <span className="inline-block w-2.5 h-[5px] bg-white"></span>
              <span className="inline-block w-2.5 h-[5px] bg-indian-emerald"></span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
