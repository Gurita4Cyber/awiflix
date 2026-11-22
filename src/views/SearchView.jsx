import React, { useMemo, useState } from 'react';
import {
  Search as SearchIcon,
  X,
  Clock,
  LayoutGrid,
  Rows3,
  Play,
  Link2,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MediaCard } from '../components/MediaCard';
import { isDirectStreamUrl } from '../utils/helpers';

export function SearchView() {
  const {
    t,
    activeMedia,
    enabledPlugins,
    getPluginById,
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    addCustomStreamItem,
    startPlayback,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [groupedMode, setGroupedMode] = useState(true);

  const directUrlDetected = isDirectStreamUrl(query);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeMedia.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (selectedProvider !== 'all' && item.providerId !== selectedProvider) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.originalTitle || '').toLowerCase().includes(q) ||
        item.genres.some((g) => g.toLowerCase().includes(q)) ||
        (item.director || '').toLowerCase().includes(q) ||
        item.synopsis.toLowerCase().includes(q)
      );
    });
  }, [activeMedia, query, selectedType, selectedProvider]);

  const groupedResults = useMemo(() => {
    const map = new Map();
    results.forEach((item) => {
      if (!map.has(item.providerId)) map.set(item.providerId, []);
      map.get(item.providerId).push(item);
    });
    return Array.from(map.entries()).map(([providerId, items]) => ({
      providerId,
      plugin: getPluginById(providerId),
      items,
    }));
  }, [results, getPluginById]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (directUrlDetected) {
      const item = addCustomStreamItem({
        title: 'Quick Direct Stream',
        url: query.trim(),
      });
      startPlayback(item);
      return;
    }
    addSearchHistory(query.trim());
  };

  const types = ['all', 'movie', 'series', 'anime', 'documentary', 'live'];

  return (
    <div className="px-4 sm:px-7 pt-5 pb-24 md:pb-12 max-w-7xl mx-auto animate-cs-fade">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search.placeholder}
          className="w-full rounded-2xl cs-surface border cs-border pl-12 pr-12 py-3.5 text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--cs-accent)] transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Direct Stream URL Quick Action */}
      {directUrlDetected && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl cs-accent-soft border border-[var(--cs-accent)]/40 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link2 className="w-5 h-5 cs-accent-text shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{t.search.playDirectUrl}</p>
              <p className="truncate text-xs text-slate-300">{query.trim()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const item = addCustomStreamItem({ title: 'Direct URL Stream', url: query.trim() });
              startPlayback(item);
            }}
            className="inline-flex items-center gap-2 rounded-xl cs-accent-bg px-4 py-2 text-xs font-bold text-white shadow"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {t.home.play}
          </button>
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedType === type
                  ? 'cs-accent-bg text-white'
                  : 'cs-surface text-slate-300 border cs-border cs-surface-hover'
              }`}
            >
              {t.home.categories[type]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <SlidersHorizontal className="pointer-events-none absolute left-3 w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="rounded-xl cs-surface border cs-border pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
            >
              <option value="all">{t.home.allProviders}</option>
              {enabledPlugins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex rounded-xl cs-surface border cs-border p-0.5">
            <button
              type="button"
              onClick={() => setGroupedMode(true)}
              title={t.search.groupByProvider}
              className={`rounded-lg p-1.5 transition ${
                groupedMode ? 'cs-accent-bg text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Rows3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setGroupedMode(false)}
              title={t.search.gridView}
              className={`rounded-lg p-1.5 transition ${
                !groupedMode ? 'cs-accent-bg text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Searches (when input empty) */}
      {!query && searchHistory.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {t.search.recentSearches}
            </span>
            <button
              type="button"
              onClick={clearSearchHistory}
              className="text-xs font-semibold text-slate-400 hover:text-rose-400 transition"
            >
              {t.search.clearHistory}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="rounded-full cs-surface cs-surface-hover border cs-border px-3 py-1.5 text-xs font-medium text-slate-200 transition"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="mt-6 flex items-center justify-between border-b cs-border pb-2.5">
        <p className="text-xs font-semibold text-slate-400">
          {t.search.quickSearch} —{' '}
          <span className="text-white">
            {results.length} {t.search.resultsCount}
          </span>
        </p>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="mt-14 flex flex-col items-center justify-center text-center">
          <SearchIcon className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white">{t.search.noResults}</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-400">{t.search.noResultsSub}</p>
        </div>
      ) : groupedMode ? (
        <div className="mt-6 space-y-8">
          {groupedResults.map((group) => (
            <section key={group.providerId}>
              <div className="flex items-center gap-2.5 mb-3.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: group.plugin?.iconColor || '#3d63ff' }}
                />
                <h3 className="font-display text-base font-bold text-white">
                  {group.plugin?.name || 'Custom Provider'}
                </h3>
                <span className="rounded-full cs-surface border cs-border px-2 py-0.5 text-[10px] font-bold text-slate-300">
                  {group.items.length}
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {group.items.map((item) => (
                  <MediaCard key={item.id} media={item} compact />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {results.map((item) => (
            <MediaCard key={item.id} media={item} />
          ))}
        </div>
      )}
    </div>
  );
}
