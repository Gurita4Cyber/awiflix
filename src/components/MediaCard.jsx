import React from 'react';
import { Play, Star, Radio, Bookmark } from 'lucide-react';
import { MediaImage } from './MediaImage';
import { useApp } from '../context/AppContext';

export function MediaCard({ media, compact = false }) {
  const { setSelectedMediaId, startPlayback, library, getPluginById } = useApp();
  const inLibrary = Boolean(library[media.id]);
  const plugin = getPluginById(media.providerId);

  return (
    <div
      onClick={() => setSelectedMediaId(media.id)}
      className={`group relative flex flex-col cursor-pointer select-none transition-transform duration-200 hover:-translate-y-1 ${
        compact ? 'w-[148px] sm:w-[168px] shrink-0' : 'w-full'
      }`}
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl cs-surface border cs-border shadow-lg group-hover:shadow-2xl group-hover:border-white/20 transition-all">
        <MediaImage
          src={media.poster}
          alt={media.title}
          type={media.type}
          gradient={media.accentGradient}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Subtle gradient vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

        {/* Top Left Quality / Live Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {media.type === 'live' ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-600/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="rounded-md bg-black/70 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-100 border border-white/10">
              {media.quality}
            </span>
          )}
        </div>

        {/* Top Right Rating / Bookmark */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {media.rating && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-black/70 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-white/10">
              <Star className="w-2.5 h-2.5 fill-amber-400" />
              {media.rating.toFixed(1)}
            </span>
          )}
          {inLibrary && (
            <span className="rounded-md cs-accent-bg p-1 text-white shadow">
              <Bookmark className="w-2.5 h-2.5 fill-white" />
            </span>
          )}
        </div>

        {/* Hover Quick Play FAB */}
        <button
          type="button"
          title="Play"
          onClick={(e) => {
            e.stopPropagation();
            startPlayback(media);
          }}
          className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full cs-accent-bg text-white shadow-xl opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200"
        >
          <Play className="w-4 h-4 fill-white ml-0.5" />
        </button>

        {/* Bottom Provider Tag */}
        {plugin && (
          <div className="absolute bottom-2.5 left-2.5 max-w-[68%]">
            <span className="inline-block truncate rounded bg-white/10 backdrop-blur-md px-1.5 py-0.5 text-[9.5px] font-medium text-slate-200 border border-white/10">
              {plugin.name}
            </span>
          </div>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="mt-2 px-0.5">
        <h3 className="truncate text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
          {media.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
          <span>{media.year}</span>
          <span>•</span>
          <span className="capitalize truncate">
            {media.seasons ? `${media.seasons.reduce((acc, s) => acc + s.episodes.length, 0)} Ep` : media.type}
          </span>
        </div>
      </div>
    </div>
  );
}
