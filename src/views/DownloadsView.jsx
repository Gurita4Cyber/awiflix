import React from 'react';
import {
  Download,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MediaImage } from '../components/MediaImage';

export function DownloadsView() {
  const {
    t,
    downloads,
    toggleDownloadPause,
    removeDownload,
    clearCompletedDownloads,
    getMediaById,
    startPlayback,
  } = useApp();

  const totalSize = downloads.reduce((acc, d) => acc + (d.sizeMb || 0), 0);
  const completedCount = downloads.filter((d) => d.status === 'completed').length;

  const handlePlayDownload = (dl) => {
    const media = getMediaById(dl.mediaId);
    if (!media) return;
    if (dl.episodeId && media.seasons) {
      for (const s of media.seasons) {
        const ep = s.episodes.find((e) => e.id === dl.episodeId);
        if (ep) {
          startPlayback(media, ep, s.seasonNumber);
          return;
        }
      }
    }
    startPlayback(media);
  };

  return (
    <div className="px-4 sm:px-7 pt-6 pb-24 md:pb-12 max-w-5xl mx-auto animate-cs-fade">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Download className="w-6 h-6 cs-accent-text" />
            {t.downloads.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">{t.downloads.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-xl cs-surface border cs-border px-3.5 py-2 text-xs font-semibold text-slate-300">
            <HardDrive className="w-4 h-4 cs-accent-text" />
            <span>
              {t.downloads.storageUsed}: <strong className="text-white">{totalSize} MB</strong>
            </span>
          </div>
          {completedCount > 0 && (
            <button
              type="button"
              onClick={clearCompletedDownloads}
              className="rounded-xl cs-surface cs-surface-hover border cs-border px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-rose-400 transition"
            >
              {t.downloads.clearCompleted}
            </button>
          )}
        </div>
      </div>

      {downloads.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-3xl cs-surface border cs-border p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl cs-accent-soft cs-accent-text mb-4">
            <Download className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">{t.downloads.empty}</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-400">{t.downloads.emptySub}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {downloads.map((dl) => (
            <div
              key={dl.id}
              className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl cs-surface border cs-border p-3.5 transition hover:border-white/20"
            >
              <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-xl bg-black/40">
                <MediaImage
                  src={dl.poster}
                  alt={dl.title}
                  className="h-full w-full object-cover"
                />
                {dl.status === 'completed' && (
                  <span className="absolute top-1.5 right-1.5 rounded-full bg-emerald-500 p-0.5 text-white shadow">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm sm:text-base font-bold text-white">
                    {dl.title}
                  </h3>
                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    {dl.sizeMb} MB
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{dl.subtitle}</p>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                    <span
                      className={
                        dl.status === 'completed'
                          ? 'text-emerald-400'
                          : dl.status === 'paused'
                          ? 'text-amber-400'
                          : 'cs-accent-text'
                      }
                    >
                      {dl.status === 'completed'
                        ? t.downloads.completed
                        : dl.status === 'paused'
                        ? t.downloads.paused
                        : `${t.downloads.downloading}...`}
                    </span>
                    <span className="text-slate-300">{dl.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        dl.status === 'completed' ? 'bg-emerald-500' : 'cs-accent-bg'
                      }`}
                      style={{ width: `${dl.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {dl.status !== 'completed' ? (
                  <button
                    type="button"
                    onClick={() => toggleDownloadPause(dl.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                    title={dl.status === 'paused' ? 'Resume' : 'Pause'}
                  >
                    {dl.status === 'paused' ? (
                      <Play className="w-4 h-4 fill-white" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePlayDownload(dl)}
                      className="inline-flex items-center gap-1.5 rounded-xl cs-accent-bg px-3.5 py-2 text-xs font-bold text-white shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      {t.home.play}
                    </button>
                    <a
                      href={dl.streamUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-semibold text-slate-200 transition"
                      title={t.downloads.saveToDisk}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t.downloads.saveToDisk}
                    </a>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => removeDownload(dl.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
