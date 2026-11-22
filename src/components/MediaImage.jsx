import React, { useState } from 'react';
import { Film, Radio, Tv } from 'lucide-react';

/**
 * Resilient media image component with cinematic gradient fallback if an external poster fails to load.
 */
export function MediaImage({
  src,
  alt = '',
  className = '',
  gradient = 'from-blue-950 via-slate-900 to-zinc-950',
  type = 'movie',
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const Icon = type === 'live' ? Radio : type === 'series' ? Tv : Film;
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br ${gradient} text-slate-300/80 select-none ${className}`}
      >
        <Icon className="w-9 h-9 opacity-60 mb-2" />
        <span className="text-[11px] font-semibold uppercase tracking-wider px-3 text-center line-clamp-2 opacity-80">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
