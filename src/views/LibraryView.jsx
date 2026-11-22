import React, { useMemo, useState } from 'react';
import { Bookmark, Clock, ArrowUpDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MediaCard } from '../components/MediaCard';

export function LibraryView() {
  const { t, library, watchProgress, getMediaById } = useApp();
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const tabs = [
    'all',
    'watching',
    'plan_to_watch',
    'completed',
    'on_hold',
    'dropped',
    'history',
  ];

  const items = useMemo(() => {
    let list = [];
    if (activeSubTab === 'history') {
      list = Object.values(watchProgress)
        .map((p) => {
          const media = getMediaById(p.mediaId);
          return media ? { media, updatedAt: p.updatedAt } : null;
        })
        .filter(Boolean);
    } else {
      list = Object.entries(library)
        .filter(([, meta]) => activeSubTab === 'all' || meta.status === activeSubTab)
        .map(([mediaId, meta]) => {
          const media = getMediaById(mediaId);
          return media ? { media, updatedAt: meta.updatedAt, status: meta.status } : null;
        })
        .filter(Boolean);
    }

    if (sortBy === 'title') {
      list.sort((a, b) => a.media.title.localeCompare(b.media.title));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.media.rating || 0) - (a.media.rating || 0));
    } else {
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
    return list;
  }, [activeSubTab, library, watchProgress, getMediaById, sortBy]);

  return (
    <div className="px-4 sm:px-7 pt-6 pb-24 md:pb-12 max-w-7xl mx-auto animate-cs-fade">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Bookmark className="w-6 h-6 cs-accent-text" />
            {t.library.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl cs-surface border cs-border px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none"
          >
            <option value="recent">{t.library.sortRecent}</option>
            <option value="title">{t.library.sortTitle}</option>
            <option value="rating">{t.library.sortRating}</option>
          </select>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6 border-b cs-border">
        {tabs.map((tab) => {
          const count =
            tab === 'history'
              ? Object.keys(watchProgress).length
              : tab === 'all'
              ? Object.keys(library).length
              : Object.values(library).filter((m) => m.status === tab).length;
          const active = activeSubTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveSubTab(tab)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                active
                  ? 'cs-accent-bg text-white shadow'
                  : 'cs-surface cs-surface-hover text-slate-300 border cs-border'
              }`}
            >
              {tab === 'history' && <Clock className="w-3.5 h-3.5" />}
              {t.library.tabs[tab]}
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl cs-surface border cs-border mb-4 text-slate-500">
            <Bookmark className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">{t.library.empty}</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-400">{t.library.emptySub}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map(({ media }) => (
            <MediaCard key={media.id} media={media} />
          ))}
        </div>
      )}
    </div>
  );
}
