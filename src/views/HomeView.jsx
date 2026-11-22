import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Info,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Puzzle,
  Plus,
  X,
  Clock,
  Star,
  Sparkles,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MediaCard } from '../components/MediaCard';
import { MediaImage } from '../components/MediaImage';
import { CloudStreamLogo } from '../components/Navigation';
import { formatRemaining } from '../utils/helpers';

export function HomeView() {
  const {
    t,
    settings,
    currentUser,
    activeMedia,
    allPlugins,
    installedPlugins,
    enabledPlugins,
    togglePluginEnabled,
    activeProvider,
    setActiveProvider,
    hydratePluginMedia,
    setActiveTab,
    setSelectedMediaId,
    startPlayback,
    library,
    setLibraryStatus,
    watchProgress,
    removeWatchProgress,
    getMediaById,
    getPluginById,
  } = useApp();

  // Installed plugins that are currently turned off (shown in Pilih Penyedia with 1-click enable)
  const disabledInstalledPlugins = useMemo(
    () =>
      allPlugins.filter(
        (p) => installedPlugins[p.id] && !installedPlugins[p.id].enabled
      ),
    [allPlugins, installedPlugins]
  );

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [heroIndex, setHeroIndex] = useState(0);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [seeAllRowId, setSeeAllRowId] = useState(null);
  const [seeAllQuery, setSeeAllQuery] = useState('');

  const openSeeAll = (rowId) => {
    setSeeAllQuery('');
    setSeeAllRowId(rowId);
    window.scrollTo({ top: 0 });
  };
  const closeSeeAll = () => {
    setSeeAllRowId(null);
    setSeeAllQuery('');
  };

  // Custom provider sequence (saved in localStorage so user can reorder/geser-geser)
  const [providerOrder, setProviderOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('cs_provider_order');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const safeProviderOrder = Array.isArray(providerOrder) ? providerOrder : [];

  // Re-order enabled plugins based on custom order
  const orderedEnabledPlugins = useMemo(() => {
    const list = Array.isArray(enabledPlugins) ? enabledPlugins : [];
    if (!safeProviderOrder.length) return list;
    const orderMap = new Map(safeProviderOrder.map((id, index) => [id, index]));
    return [...list].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 999;
      return idxA - idxB;
    });
  }, [enabledPlugins, safeProviderOrder]);

  const moveProvider = (pluginId, direction) => {
    const currentList = orderedEnabledPlugins.map((p) => p.id);
    const fromIdx = currentList.indexOf(pluginId);
    if (fromIdx === -1) return;
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= currentList.length) return;

    const nextList = [...currentList];
    const [moved] = nextList.splice(fromIdx, 1);
    nextList.splice(toIdx, 0, moved);

    setProviderOrder(nextList);
    try {
      localStorage.setItem('cs_provider_order', JSON.stringify(nextList));
    } catch {}
  };

  // Lock body scroll while provider modal is open so popup is immediately visible without scrolling
  useEffect(() => {
    if (providerModalOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [providerModalOpen]);

  // Filter media by selected provider & category
  const filteredMedia = useMemo(() => {
    return activeMedia.filter((m) => {
      if (activeProvider !== 'all' && m.providerId !== activeProvider) return false;
      if (selectedCategory === 'vivamax') {
        return Boolean(
          m.isNsfw ||
            m.category === 'vivamax' ||
            m.category === 'nsfw' ||
            /vivamax|dewasa 18\+|nsfw/i.test(m.section || '') ||
            (m.genres || []).some((g) => /vivamax|adult|erotic|18\+/i.test(g))
        );
      }
      if (selectedCategory !== 'all' && m.type !== selectedCategory) return false;
      return true;
    });
  }, [activeMedia, activeProvider, selectedCategory]);

  // Featured hero carousel items
  const heroItems = useMemo(() => {
    const featured = filteredMedia.filter((m) => m.featured);
    if (featured.length > 0) return featured;
    return filteredMedia.slice(0, 4);
  }, [filteredMedia]);

  useEffect(() => {
    setHeroIndex(0);
  }, [activeProvider, selectedCategory]);

  // Auto-advance hero banner every 7.5 seconds
  useEffect(() => {
    if (heroItems.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroItems.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [heroItems.length]);

  const currentHero = heroItems[heroIndex] || null;

  // Continue Watching list sorted by most recently watched
  const continueWatchingList = useMemo(() => {
    return Object.values(watchProgress)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((prog) => {
        const media = getMediaById(prog.mediaId);
        if (!media) return null;
        return { ...prog, media };
      })
      .filter(Boolean);
  }, [watchProgress, getMediaById]);

  // Group rows by provider & section (authentic CloudStream HomePageList rows!)
  const providerRows = useMemo(() => {
    const rows = [];
    const groupMap = new Map();

    filteredMedia.forEach((m) => {
      const plugin = getPluginById(m.providerId);
      const sectionName = m.section || (plugin ? plugin.name : 'Koleksi');
      const groupKey = `${m.providerId}___${sectionName}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          providerId: m.providerId,
          sectionName,
          items: [],
        });
      }
      groupMap.get(groupKey).items.push(m);
    });

    groupMap.forEach(({ providerId, sectionName, items }, key) => {
      const plugin = getPluginById(providerId);
      const isMultiSection = filteredMedia.some(
        (m) => m.providerId === providerId && m.section && m.section !== sectionName
      );

      // Title: if multi-section, "Samehadaku • Top Anime Populer", otherwise plugin.name
      const title = isMultiSection
        ? `${plugin?.name || 'Provider'} • ${sectionName}`
        : (plugin?.name || sectionName);

      // Sort items within each row: newest 2026 films appear first!
      const sortedItems = [...items].sort((a, b) => {
        return (b.year || 0) - (a.year || 0) || (b.rating || 0) - (a.rating || 0);
      });

      rows.push({
        id: key,
        providerId,
        title,
        badge: plugin?.badge || 'WEB',
        color: plugin?.iconColor || '#3d63ff',
        items: sortedItems,
      });
    });

    // Sort rows by custom providerOrder if set
    if (safeProviderOrder.length > 0) {
      const orderMap = new Map(safeProviderOrder.map((id, index) => [id, index]));
      rows.sort((a, b) => {
        const idxA = orderMap.has(a.providerId) ? orderMap.get(a.providerId) : 999;
        const idxB = orderMap.has(b.providerId) ? orderMap.get(b.providerId) : 999;
        return idxA - idxB;
      });
    }

    return rows;
  }, [filteredMedia, getPluginById, safeProviderOrder]);

  const categories = useMemo(
    () =>
      settings?.showNsfw
        ? ['all', 'movie', 'series', 'anime', 'vivamax', 'documentary', 'live']
        : ['all', 'movie', 'series', 'anime', 'documentary', 'live'],
    [settings?.showNsfw]
  );

  // Reset category back to 'all' if NSFW is turned off while viewing Vivamax
  useEffect(() => {
    if (!settings?.showNsfw && selectedCategory === 'vivamax') {
      setSelectedCategory('all');
    }
  }, [settings?.showNsfw, selectedCategory]);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const activePluginObj = activeProvider === 'all' ? null : getPluginById(activeProvider);

  // Empty state if user uninstalled/disabled all extensions (true CloudStream behavior)
  if (enabledPlugins.length === 0) {
    return (
      <div className="flex min-h-[82vh] flex-col items-center justify-center px-6 text-center animate-cs-fade">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl cs-accent-soft cs-accent-text mb-6 border cs-border">
          <Puzzle className="w-10 h-10" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-2">
          {t.home.noProvidersTitle}
        </h2>
        <p className="max-w-md text-sm text-slate-400 leading-relaxed mb-7">
          {isSuperAdmin
            ? t.home.noProvidersDesc
            : 'Belum ada penyedia film aktif. Hubungi Super Admin untuk mengaktifkan sumber film.'}
        </p>
        {isSuperAdmin && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('extensions')}
              className="inline-flex items-center gap-2 rounded-xl cs-accent-bg px-5 py-3 text-sm font-semibold text-white cs-accent-glow transition"
            >
              <Puzzle className="w-4 h-4" />
              {t.home.openExtensions}
            </button>
          </div>
        )}
      </div>
    );
  }

  // "Lihat Semua" page: full grid of every title in the clicked category
  if (seeAllRowId) {
    const seeAllRow = providerRows.find((r) => r.id === seeAllRowId);
    if (!seeAllRow) {
      closeSeeAll();
    } else {
      const q = seeAllQuery.trim().toLowerCase();
      const visible = q
        ? seeAllRow.items.filter((m) => (m.title || '').toLowerCase().includes(q))
        : seeAllRow.items;
      return (
        <div className="pb-24 md:pb-12 animate-cs-fade">
          <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 px-4 sm:px-7 py-3 bg-[var(--cs-bg)]/90 backdrop-blur-xl border-b cs-border">
            <button
              type="button"
              onClick={closeSeeAll}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full cs-surface cs-surface-hover border cs-border text-slate-200"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="h-3 w-3 rounded-full shadow" style={{ backgroundColor: seeAllRow.color }} />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                {seeAllRow.title}
              </h1>
              <p className="text-[11px] text-slate-400">{seeAllRow.items.length} judul dari sumber asli</p>
            </div>
            <input
              type="text"
              value={seeAllQuery}
              onChange={(e) => setSeeAllQuery(e.target.value)}
              placeholder="Cari di kategori ini..."
              className="w-full sm:w-64 rounded-xl cs-surface border cs-border px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-white/30"
            />
          </div>

          <div className="px-4 sm:px-7 pt-5">
            {visible.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-400">Tidak ada judul yang cocok.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3.5 sm:gap-4">
                {visible.map((item) => (
                  <MediaCard key={item.id} media={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="pb-24 md:pb-12 animate-cs-fade">
      {/* Top Sticky Bar (Mobile Logo + CloudStream Provider Switcher Pill) */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-7 py-3.5 bg-gradient-to-b from-[var(--cs-bg)] via-[var(--cs-bg)]/90 to-transparent backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <CloudStreamLogo compact />
          </div>
          {/* Category Chips on Desktop */}
          <div className="hidden lg:flex items-center gap-1.5">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              const isVivamax = cat === 'vivamax';
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? isVivamax
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'cs-accent-bg text-white shadow-md'
                      : isVivamax
                      ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/35'
                      : 'cs-surface text-slate-300 hover:text-white cs-surface-hover border cs-border'
                  }`}
                >
                  {t.home.categories[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {/* CloudStream Iconic Provider Selector Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProviderModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full cs-surface cs-surface-hover border cs-border px-3.5 py-2 text-xs font-semibold text-white shadow-md transition-all"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: activePluginObj?.iconColor || 'var(--cs-accent)' }}
            />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">
              {activePluginObj ? activePluginObj.name : t.home.allProviders}
            </span>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('extensions')}
              title={t.nav.extensions}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full cs-surface cs-surface-hover border cs-border text-slate-300 hover:text-white transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile / Tablet Scrollable Category Bar */}
      <div className="flex lg:hidden items-center gap-2 overflow-x-auto no-scrollbar px-4 sm:px-7 pb-3">
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          const isVivamax = cat === 'vivamax';
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? isVivamax
                    ? 'bg-rose-600 text-white'
                    : 'cs-accent-bg text-white'
                  : isVivamax
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/35'
                  : 'cs-surface text-slate-300 border cs-border'
              }`}
            >
              {t.home.categories[cat]}
            </button>
          );
        })}
      </div>

      {/* Horizontal Swipeable / Draggable Provider Bar ("bisa geser-geser posisinya") */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 sm:px-7 pb-3">
        <button
          type="button"
          onClick={() => setActiveProvider('all')}
          className={`shrink-0 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
            activeProvider === 'all'
              ? 'cs-accent-bg text-white cs-accent-glow'
              : 'cs-surface cs-surface-hover text-slate-300 border cs-border'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-white/80" />
          <span>{t.home.allProviders}</span>
          <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
            {activeMedia.length}
          </span>
        </button>

        {orderedEnabledPlugins.map((plugin) => {
          const count = activeMedia.filter((m) => m.providerId === plugin.id).length;
          const active = activeProvider === plugin.id;
          return (
            <button
              key={plugin.id}
              type="button"
              onClick={() => {
                setActiveProvider(plugin.id);
                hydratePluginMedia(plugin);
              }}
              className={`shrink-0 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shadow-sm ${
                active
                  ? 'cs-accent-bg text-white cs-accent-glow'
                  : 'cs-surface cs-surface-hover text-slate-300 border cs-border'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: plugin.iconColor }}
              />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{plugin.name}</span>
              <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hero Featured Banner */}
      {currentHero && (
        <section className="px-4 sm:px-7 pt-1">
          <div className="relative overflow-hidden rounded-3xl border cs-border min-h-[340px] sm:min-h-[420px] flex items-end shadow-2xl">
            <MediaImage
              src={currentHero.backdrop || currentHero.poster}
              alt={currentHero.title}
              type={currentHero.type}
              gradient={currentHero.accentGradient}
              className="absolute inset-0 h-full w-full object-cover transition-all duration-700"
            />
            {/* Multi-layer cinematic gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--cs-bg)] via-black/60 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />

            {/* Content */}
            <div className="relative z-10 w-full p-5 sm:p-8 lg:p-10 flex flex-col justify-end max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 rounded-full cs-accent-bg px-2.5 py-0.5 text-[11px] font-bold text-white shadow">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
                <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-slate-200 border border-white/15">
                  {currentHero.quality}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-amber-400 border border-white/15">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {currentHero.rating.toFixed(1)}
                </span>
                <span className="text-xs font-medium text-slate-300">
                  {currentHero.year} • {currentHero.duration}
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
                {currentHero.title}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {currentHero.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-md bg-white/10 backdrop-blur-sm px-2 py-0.5 text-[11px] font-medium text-slate-200"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <p className="mt-3 text-xs sm:text-sm text-slate-300 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                {currentHero.synopsis}
              </p>

              {/* CTA Buttons */}
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => startPlayback(currentHero)}
                  className="inline-flex items-center gap-2 rounded-xl cs-accent-bg px-5 py-2.5 text-sm font-bold text-white cs-accent-glow transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {watchProgress[currentHero.id] ? t.home.resume : t.home.play}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMediaId(currentHero.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/12 hover:bg-white/20 backdrop-blur-md px-4 py-2.5 text-sm font-semibold text-white border border-white/15 transition"
                >
                  <Info className="w-4 h-4" />
                  {t.home.moreInfo}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setLibraryStatus(
                      currentHero.id,
                      library[currentHero.id] ? 'none' : 'plan_to_watch'
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition ${
                    library[currentHero.id]
                      ? 'cs-accent-soft cs-accent-text border-[var(--cs-accent)]/40'
                      : 'bg-black/45 hover:bg-black/65 text-slate-200 border-white/15'
                  }`}
                >
                  {library[currentHero.id] ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t.home.bookmarked}
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      {t.home.bookmark}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Carousel Controls & Dots */}
            {heroItems.length > 1 && (
              <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 mr-2">
                  {heroItems.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setHeroIndex(idx)}
                      aria-label={`Slide ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === heroIndex ? 'w-6 cs-accent-bg' : 'w-2 bg-white/35 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setHeroIndex((i) => (i - 1 + heroItems.length) % heroItems.length)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white border border-white/15 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setHeroIndex((i) => (i + 1) % heroItems.length)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white border border-white/15 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Continue Watching Row (Signature CloudStream Feature) */}
      {continueWatchingList.length > 0 && (
        <section className="mt-8 px-4 sm:px-7">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 cs-accent-text" />
              {t.home.continueWatching}
            </h2>
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {continueWatchingList.map((entry) => {
              const pct = Math.min(100, Math.round((entry.currentTime / entry.duration) * 100));
              return (
                <div
                  key={entry.mediaId}
                  onClick={() => startPlayback(entry.media)}
                  className="group relative w-[250px] sm:w-[290px] shrink-0 cursor-pointer rounded-2xl overflow-hidden cs-surface border cs-border hover:border-white/25 transition-all shadow-lg"
                >
                  <div className="relative aspect-video w-full overflow-hidden">
                    <MediaImage
                      src={entry.media.backdrop || entry.media.poster}
                      alt={entry.media.title}
                      type={entry.media.type}
                      gradient={entry.media.accentGradient}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                    {/* Remove button */}
                    <button
                      type="button"
                      title={t.home.removeHistory}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWatchProgress(entry.mediaId);
                      }}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Center Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full cs-accent-bg/95 text-white shadow-xl group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Episode & remaining */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white drop-shadow">
                          {entry.media.title}
                        </p>
                        <p className="text-[11px] font-medium text-slate-300">
                          {entry.episodeNumber
                            ? `S${entry.seasonNumber}:E${entry.episodeNumber} • `
                            : ''}
                          {formatRemaining(entry.currentTime, entry.duration)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {pct}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                      <div
                        className="h-full cs-accent-bg transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Dynamic Provider Rows */}
      <div className="mt-8 space-y-8 px-4 sm:px-7">
        {providerRows.length === 0 ? (
          <div className="rounded-3xl cs-bg-elevated border cs-border p-8 sm:p-10 text-center max-w-xl mx-auto">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl cs-accent-soft cs-accent-text">
              <Puzzle className="w-6 h-6" />
            </div>
            <h3 className="font-display text-base font-bold text-white">
              {activePluginObj
                ? `Belum ada film di "${activePluginObj.name}"`
                : 'Belum ada judul pada kategori ini'}
            </h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              {activePluginObj?.webAdapter === 'mysql_catalog'
                ? 'Provider ini menggunakan mode Katalog MySQL Sendiri. Tambahkan film lewat Super Admin → Tambah Film DB, atau ubah Web Bridge ke Internet Archive Live agar langsung terisi film otomatis.'
                : 'Pilih penyedia lain, ubah filter kategori ke Semua, atau atur Web Bridge di menu Ekstensi.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {currentUser?.role === 'super_admin' && activePluginObj?.webAdapter === 'mysql_catalog' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className="rounded-xl cs-accent-bg px-4 py-2 text-xs font-bold text-white cs-accent-glow"
                >
                  + Tambah Film ke MySQL
                </button>
              )}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('extensions')}
                  className="rounded-xl cs-surface cs-surface-hover border cs-border px-4 py-2 text-xs font-semibold text-slate-200"
                >
                  Atur di Ekstensi
                </button>
              )}
              {activeProvider !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveProvider('all')}
                  className="rounded-xl cs-surface cs-surface-hover border cs-border px-4 py-2 text-xs font-semibold cs-accent-text"
                >
                  Tampilkan Semua Penyedia
                </button>
              )}
            </div>
          </div>
        ) : (
          providerRows.map((row) => (
            <section key={row.id}>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full shadow"
                    style={{ backgroundColor: row.color }}
                  />
                  <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                    {row.title}
                  </h2>
                  <span className="rounded-md cs-surface border cs-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    {row.badge}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openSeeAll(row.id)}
                  className="text-xs font-semibold cs-accent-text hover:underline"
                >
                  {t.home.seeAll} ({row.items.length})
                </button>
              </div>

              <div className="flex gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar pb-2">
                {row.items.map((item) => (
                  <MediaCard key={item.id} media={item} compact />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* CloudStream Provider Switcher Modal (Portaled to body so always dead-center on Desktop & Mobile) */}
      {providerModalOpen &&
        createPortal(
          <div
            onClick={() => setProviderModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-hidden"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[85dvh] flex flex-col rounded-3xl cs-bg-elevated border cs-border p-5 shadow-2xl animate-cs-fade"
            >
            <div className="flex items-center justify-between mb-3 pb-2 border-b cs-border">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  {t.home.selectProvider}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Klik untuk pilih • Geser / panah untuk atur urutan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProviderModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-white cs-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  setActiveProvider('all');
                  setProviderModalOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeProvider === 'all'
                    ? 'cs-accent-bg text-white shadow-md'
                    : 'cs-surface cs-surface-hover text-slate-200 border cs-border'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-white/80 shadow" />
                  {t.home.allProviders}
                </span>
                <span className="text-xs opacity-80">{activeMedia.length}</span>
              </button>

              {orderedEnabledPlugins.map((plugin, idx) => {
                const count = activeMedia.filter((m) => m.providerId === plugin.id).length;
                const selected = activeProvider === plugin.id;
                return (
                  <div
                    key={plugin.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', plugin.id);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = e.dataTransfer.getData('text/plain');
                      if (sourceId && sourceId !== plugin.id) {
                        const currentList = orderedEnabledPlugins.map((p) => p.id);
                        const fromIdx = currentList.indexOf(sourceId);
                        const toIdx = currentList.indexOf(plugin.id);
                        if (fromIdx !== -1 && toIdx !== -1) {
                          const nextList = [...currentList];
                          const [moved] = nextList.splice(fromIdx, 1);
                          nextList.splice(toIdx, 0, moved);
                          setProviderOrder(nextList);
                          try {
                            localStorage.setItem('cs_provider_order', JSON.stringify(nextList));
                          } catch {}
                        }
                      }
                    }}
                    className={`group flex items-center justify-between rounded-xl p-2.5 transition border ${
                      selected
                        ? 'cs-accent-bg text-white border-transparent shadow-md'
                        : 'cs-surface cs-surface-hover text-slate-200 border-white/5'
                    }`}
                  >
                    {/* Click to select provider */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProvider(plugin.id);
                        hydratePluginMedia(plugin);
                        setProviderModalOpen(false);
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full shadow"
                        style={{ backgroundColor: plugin.iconColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">{plugin.name}</p>
                          {plugin.runtime === 'web-bridge' && (
                            <span className="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-bold text-cyan-200">
                              WEB BRIDGE
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] ${selected ? 'text-white/80' : 'text-slate-400'}`}>
                          v{plugin.version} • {plugin.language}
                          {plugin.webAdapter ? ` • ${plugin.webAdapter}` : ''}
                        </p>
                      </div>
                      <span className="ml-1 rounded-md bg-black/25 px-2 py-0.5 text-xs font-bold shrink-0">
                        {count}
                      </span>
                    </button>

                    {/* Reorder Buttons: Geser Posisi Naik / Turun */}
                    <div className="flex items-center gap-0.5 ml-2 shrink-0 opacity-80 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveProvider(plugin.id, 'up');
                        }}
                        title="Geser ke Atas"
                        className={`p-1 rounded-lg transition ${
                          idx === 0
                            ? 'opacity-20 cursor-not-allowed'
                            : selected ? 'hover:bg-white/20 text-white' : 'hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === orderedEnabledPlugins.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveProvider(plugin.id, 'down');
                        }}
                        title="Geser ke Bawah"
                        className={`p-1 rounded-lg transition ${
                          idx === orderedEnabledPlugins.length - 1
                            ? 'opacity-20 cursor-not-allowed'
                            : selected ? 'hover:bg-white/20 text-white' : 'hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <span
                        title="Seret / Geser Posisi"
                        className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-white"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {isSuperAdmin && disabledInstalledPlugins.length > 0 && (
                <div className="pt-3 mt-2 border-t cs-border space-y-1.5">
                  <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Terpasang tapi Nonaktif ({disabledInstalledPlugins.length})
                  </p>
                  {disabledInstalledPlugins.map((plugin) => (
                    <div
                      key={plugin.id}
                      className="flex items-center justify-between rounded-xl cs-surface/60 border cs-border px-3.5 py-2.5 opacity-80"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-300">
                          {plugin.name}
                        </p>
                        <p className="text-[10px] text-slate-500">Status: Nonaktif</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePluginEnabled(plugin.id)}
                        className="ml-2 shrink-0 rounded-lg cs-accent-bg px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        Aktifkan
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setProviderModalOpen(false);
                  setActiveTab('extensions');
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl cs-surface cs-surface-hover border cs-border py-2.5 text-xs font-semibold cs-accent-text"
              >
                <Puzzle className="w-4 h-4" />
                Manage Extensions & Repositories
              </button>
            )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
