import React from 'react';

export default function SkeletonLoader({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="glass-panel rounded-2xl p-4 flex flex-col h-[340px] shimmer"
        >
          {/* Card Image Area */}
          <div className="w-full h-44 bg-purple-950/20 rounded-xl mb-4"></div>
          {/* Category Badge */}
          <div className="w-20 h-5 bg-purple-950/30 rounded mb-3"></div>
          {/* Title */}
          <div className="w-3/4 h-6 bg-purple-950/20 rounded mb-2"></div>
          {/* Issuer */}
          <div className="w-1/2 h-4 bg-purple-950/30 rounded mb-auto"></div>
          {/* Footer controls */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-purple-950/10">
            <div className="flex-1 h-9 bg-purple-950/20 rounded-lg"></div>
            <div className="flex-1 h-9 bg-purple-950/20 rounded-lg"></div>
          </div>
        </div>
      ))}
    </>
  );
}
