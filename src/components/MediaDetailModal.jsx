import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  X,
  Play,
  Bookmark,
  Download,
  Share2,
  Star,
  Check,
  Clock,
  Layers,
  CheckCircle2,
  Radio,
  Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MediaImage } from './MediaImage';
import { MediaCard } from './MediaCard';

export function MediaDetailModal() {
  const {
    t,
    selectedMediaId,
    setSelectedMediaId,
    getMediaById,
    getPluginById,
    activeMedia,
    library,
    setLibraryStatus,
    watchProgress,
    watchedEpisodes,
    startPlayback,
    queueDownload,
    showToast,
    fetchEpisodesForMedia,
  } = useApp();

  const media = useMemo(
    () => (selectedMediaId ? getMediaById(selectedMediaId) : null),
    [selectedMediaId, getMediaById]
  );

  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const modalContentRef = useRef(null);

  // Lock body scroll and reset modal scroll to top so popup is immediately visible without scrolling
  useEffect(() => {
    setSelectedSeasonIdx(0);
    if (media) {
      document.body.style.overflow = 'hidden';
      if (modalContentRef.current) {
        modalContentRef.current.scrollTop = 0;
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [media?.id]);

  useEffect(() => {
    if (!media || !media.sourceSite || !media.detailUrl) return;
    // If episodes list already has more than 1 season or more than 1 episode, skip
    if (media.seasons && (media.seasons.length > 1 || media.seasons[0]?.episodes?.length > 1)) return;

    let isMounted = true;
    setLoadingEpisodes(true);
    fetchEpisodesForMedia(media.id, media.sourceSite, media.detailUrl)
      .finally(() => {
        if (isMounted) setLoadingEpisodes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [media?.id, media?.detailUrl, media?.sourceSite, fetchEpisodesForMedia]);

  const recommendations = useMemo(() => {
    if (!media) return [];
    const mediaTitle = (media.title || '').toLowerCase().trim();
    const seenTitles = new Set(mediaTitle ? [mediaTitle] : []);
    const results = [];

    // 1. Distinct items from same provider first
    for (const item of activeMedia) {
      const cleanT = item.title?.toLowerCase().trim();
      if (!cleanT || seenTitles.has(cleanT) || item.id === media.id) continue;
      if (item.providerId === media.providerId) {
        seenTitles.add(cleanT);
        results.push(item);
        if (results.length >= 8) break;
      }
    }

    // 2. Distinct items matching genre / type if we need more
    if (results.length < 6) {
      for (const item of activeMedia) {
        const cleanT = item.title?.toLowerCase().trim();
        if (!cleanT || seenTitles.has(cleanT) || item.id === media.id) continue;
        if (item.type === media.type || item.genres?.some((g) => media.genres?.includes(g))) {
          seenTitles.add(cleanT);
          results.push(item);
          if (results.length >= 8) break;
        }
      }
    }

    return results;
  }, [media, activeMedia]);

  if (!media) return null;

  const plugin = getPluginById(media.providerId);
  const currentStatus = library[media.id]?.status || 'none';
  const savedProgress = watchProgress[media.id];
  const seasons = media.seasons || [];
  const activeSeason = seasons[selectedSeasonIdx] || seasons[0] || null;

  const handleShare = () => {
    const shareText = `${media.title} (${media.year}) — Watch on AwiFlix`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href + `#${media.id}`).catch(() => {});
    }
    showToast(t.detail.copied + ` (${shareText})`, 'success');
  };

  return (
    <div
      onClick={() => setSelectedMediaId(null)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-5 overflow-hidden"
    >
      <div
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl cs-bg-elevated border cs-border shadow-2xl animate-cs-fade"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setSelectedMediaId(null)}
          className="fixed sm:absolute top-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 backdrop-blur-md transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Backdrop */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <MediaImage
            src={media.backdrop || media.poster}
            alt={media.title}
            type={media.type}
            gradient={media.accentGradient}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--cs-bg-elevated)] via-black/55 to-black/25" />
        </div>

        {/* Main Content */}
        <div className="relative -mt-28 px-5 sm:px-8 pb-12 sm:pb-16">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Poster */}
            <div className="w-32 sm:w-44 shrink-0 overflow-hidden rounded-2xl border-2 border-white/15 shadow-2xl cs-surface">
              <MediaImage
                src={media.poster}
                alt={media.title}
                type={media.type}
                gradient={media.accentGradient}
                className="aspect-[2/3] w-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-2 sm:pt-8">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {plugin && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                    style={{ backgroundColor: plugin.iconColor || 'var(--cs-accent)' }}
                  >
                    {plugin.name}
                  </span>
                )}
                <span className="rounded-full cs-surface border cs-border px-2.5 py-0.5 text-[11px] font-semibold text-slate-200">
                  {media.quality}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {media.rating?.toFixed(1)}
                </span>
                <span className="text-xs font-medium text-slate-300">
                  {media.year} • {media.duration} • {media.status}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                {media.title}
              </h1>
              {media.originalTitle && (
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  {media.originalTitle}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {media.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-lg cs-surface border cs-border px-2.5 py-1 text-[11px] font-medium text-slate-300"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                {media.synopsis}
              </p>

              {(media.director || media.cast?.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                  {media.director && (
                    <span>
                      Director: <strong className="text-slate-200">{media.director}</strong>
                    </span>
                  )}
                  {media.cast?.length > 0 && (
                    <span>
                      Cast: <strong className="text-slate-200">{media.cast.join(', ')}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Action Bar */}
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    startPlayback(media);
                    setSelectedMediaId(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl cs-accent-bg px-5 py-2.5 text-sm font-bold text-white cs-accent-glow transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {savedProgress
                    ? `${t.detail.resumeFrom}${
                        savedProgress.episodeNumber
                          ? ` S${savedProgress.seasonNumber}:E${savedProgress.episodeNumber}`
                          : ''
                      }`
                    : t.detail.playNow}
                </button>

                {/* CloudStream Watch Status Dropdown */}
                <div className="relative inline-flex items-center">
                  <Bookmark
                    className={`pointer-events-none absolute left-3 w-4 h-4 ${
                      currentStatus !== 'none' ? 'cs-accent-text fill-current' : 'text-slate-400'
                    }`}
                  />
                  <select
                    value={currentStatus}
                    onChange={(e) => setLibraryStatus(media.id, e.target.value)}
                    className="rounded-xl cs-surface border cs-border pl-9 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[var(--cs-accent)] cursor-pointer"
                  >
                    {Object.entries(t.detail.status).map(([key, label]) => (
                      <option key={key} value={key} className="bg-[#151722] text-white">
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {!seasons.length && media.streams?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => queueDownload(media)}
                    className="inline-flex items-center gap-1.5 rounded-xl cs-surface cs-surface-hover border cs-border px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition"
                  >
                    <Download className="w-4 h-4" />
                    {t.detail.download}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 rounded-xl cs-surface cs-surface-hover border cs-border px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition"
                >
                  <Share2 className="w-4 h-4" />
                  {t.detail.share}
                </button>
              </div>
            </div>
          </div>

          {/* Available Stream Links Preview (for Movies / Live) */}
          {!seasons.length && media.streams?.length > 0 && (
            <div className="mt-7">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 cs-accent-text" />
                {t.detail.sources} ({media.streams.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {media.streams.map((stream) => (
                  <button
                    key={stream.id}
                    type="button"
                    onClick={() => {
                      startPlayback(media);
                      setSelectedMediaId(null);
                    }}
                    className="flex items-center justify-between rounded-xl cs-surface cs-surface-hover border cs-border px-4 py-3 text-left transition"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">{stream.label}</p>
                      <p className="text-[11px] uppercase text-slate-400">
                        {stream.type} • {stream.quality}
                      </p>
                    </div>
                    <span className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full cs-accent-soft cs-accent-text">
                      {media.type === 'live' ? (
                        <Radio className="w-4 h-4" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Seasons & Episodes Section */}
          {seasons.length > 0 && activeSeason && (
            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  {t.detail.episodes}
                  <span className="rounded-full cs-surface border cs-border px-2.5 py-0.5 text-xs text-slate-300">
                    {activeSeason.episodes.length}
                  </span>
                  {loadingEpisodes && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Memuat episode...
                    </span>
                  )}
                </h3>

                {seasons.length > 1 && (
                  <div className="flex gap-1.5">
                    {seasons.map((s, idx) => (
                      <button
                        key={s.seasonNumber}
                        type="button"
                        onClick={() => setSelectedSeasonIdx(idx)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                          idx === selectedSeasonIdx
                            ? 'cs-accent-bg text-white'
                            : 'cs-surface text-slate-300 border cs-border'
                        }`}
                      >
                        {t.detail.season} {s.seasonNumber}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {activeSeason.episodes.map((ep) => {
                  const isWatched = Boolean(watchedEpisodes[ep.id]);
                  const isCurrentResume = savedProgress?.episodeId === ep.id;
                  const resumePct = isCurrentResume
                    ? Math.round((savedProgress.currentTime / savedProgress.duration) * 100)
                    : 0;

                  return (
                    <div
                      key={ep.id}
                      onClick={() => {
                        startPlayback(media, ep, activeSeason.seasonNumber);
                        setSelectedMediaId(null);
                      }}
                      className="group flex flex-col sm:flex-row sm:items-center gap-3.5 rounded-2xl cs-surface cs-surface-hover border cs-border p-3 cursor-pointer transition"
                    >
                      <div className="relative aspect-video w-full sm:w-40 shrink-0 overflow-hidden rounded-xl bg-black/50">
                        <MediaImage
                          src={ep.thumbnail || media.backdrop}
                          alt={ep.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/20 transition">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full cs-accent-bg text-white shadow-lg">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </div>
                        </div>
                        {resumePct > 0 && (
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/25">
                            <div
                              className="h-full cs-accent-bg"
                              style={{ width: `${resumePct}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold cs-accent-text">
                            EP {ep.number}
                          </span>
                          <h4 className="truncate text-sm font-bold text-white">{ep.title}</h4>
                          {isWatched && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> {t.detail.watched}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2">{ep.synopsis}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{ep.duration}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        title={t.detail.download}
                        onClick={(e) => {
                          e.stopPropagation();
                          queueDownload(media, ep, activeSeason.seasonNumber);
                        }}
                        className="self-end sm:self-center flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-slate-300 hover:text-white transition"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mt-8 pt-6 border-t cs-border">
              <h3 className="font-display text-base font-bold text-white mb-3.5">
                {t.detail.moreLikeThis}
              </h3>
              <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2">
                {recommendations.map((rec) => (
                  <MediaCard key={rec.id} media={rec} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
