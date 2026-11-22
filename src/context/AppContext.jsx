import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  DEFAULT_INSTALLED_PLUGINS,
  DEFAULT_REPOSITORIES,
  SHORTCODE_REPOS,
} from '../data/repositories';
import { MEDIA_CATALOG } from '../data/catalog';
import { translations } from '../data/i18n';
import {
  detectStreamType,
  normalizeCloudStreamPlugin,
  normalizeWebCatalogItem,
  parseM3UPlaylist,
} from '../utils/helpers';
import { api, getAuthToken, setAuthToken } from '../services/api';

const DEFAULT_SETTINGS = {
  language: 'id',
  theme: 'dark',
  accent: 'blue',
  showClockInPlayer: true,
  autoPlayNext: true,
  skipSeconds: 10,
  introSkipSeconds: 85,
  subtitleSize: 18,
  subtitleBgOpacity: 0.65,
  defaultProvider: 'all',
  showNsfw: false,
};

const AppContext = createContext(null);

// Helper that fetches remote URLs cleanly (direct first, falls back to PHP proxy for CORS)
async function fetchTextSmart(url) {
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
  } catch {
    // CORS blocked -> try PHP server-side fetcher
  }
  const proxied = await api.fetchRemoteUrl(url);
  return proxied.content;
}

export function AppProvider({ children }) {
  // Authentication state (MySQL + PHP)
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // User workspace state (loaded from MySQL)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [repositories, setRepositories] = useState(DEFAULT_REPOSITORIES);
  const [installedPlugins, setInstalledPlugins] = useState(DEFAULT_INSTALLED_PLUGINS);
  const [customItems, setCustomItems] = useState([]);
  const [dbMediaItems, setDbMediaItems] = useState([]);
  const [externalMediaByPlugin, setExternalMediaByPlugin] = useState({});
  const [library, setLibrary] = useState({});
  const [watchProgress, setWatchProgress] = useState({});
  const [watchedEpisodes, setWatchedEpisodes] = useState({});
  const [downloads, setDownloads] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);

  // Navigation & UI overlays
  const [activeTab, setActiveTab] = useState('home');
  const [activeProvider, setActiveProvider] = useState('all');
  const [selectedMediaId, setSelectedMediaId] = useState(null);
  const [playerSession, setPlayerSession] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Apply theme & accent attributes to root HTML element
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme || 'dark');
    root.setAttribute('data-accent', settings.accent || 'blue');
  }, [settings.theme, settings.accent]);

  const hydratePluginMedia = useCallback(
    async (plugin) => {
      if (!plugin) return 0;

      // Always query PHP Web Bridge for installed extensions
      try {
        const res = await api.fetchProviderItems(plugin.id);
        if (Array.isArray(res.items) && res.items.length > 0) {
          setExternalMediaByPlugin((prev) => ({ ...prev, [plugin.id]: res.items }));
          return res.items.length;
        }
        if (Array.isArray(res.rawItems) && res.rawItems.length > 0) {
          const normalized = res.rawItems.map((item, idx) =>
            normalizeWebCatalogItem(item, plugin.id, idx)
          );
          setExternalMediaByPlugin((prev) => ({ ...prev, [plugin.id]: normalized }));
          return normalized.length;
        }
        if (res.m3uContent) {
          const parsed = parseM3UPlaylist(res.m3uContent).map((item) => ({
            ...item,
            providerId: plugin.id,
          }));
          setExternalMediaByPlugin((prev) => ({ ...prev, [plugin.id]: parsed }));
          return parsed.length;
        }
      } catch {
        // ignore transient fetch errors on startup
      }

      if (Array.isArray(plugin.inlineItems) && plugin.inlineItems.length > 0) {
        const normalized = plugin.inlineItems.map((item, idx) =>
          normalizeWebCatalogItem(item, plugin.id, idx)
        );
        setExternalMediaByPlugin((prev) => ({ ...prev, [plugin.id]: normalized }));
        return normalized.length;
      }

      if (plugin.catalogUrl) {
        try {
          const text = await fetchTextSmart(plugin.catalogUrl);
          const data = JSON.parse(text);
          const arr = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
          const normalized = arr.map((item, idx) =>
            normalizeWebCatalogItem(item, plugin.id, idx)
          );
          setExternalMediaByPlugin((prev) => ({ ...prev, [plugin.id]: normalized }));
          return normalized.length;
        } catch {
          showToast('Gagal memuat catalogUrl remote.', 'error');
        }
      }

      if (plugin.m3uUrl) {
        try {
          const text = await fetchTextSmart(plugin.m3uUrl);
          const parsed = parseM3UPlaylist(text).map((item) => ({
            ...item,
            providerId: plugin.id,
          }));
          setExternalMediaByPlugin((prev) => ({ ...prev, [plugin.id]: parsed }));
          return parsed.length;
        } catch {
          showToast('Gagal memuat m3uUrl remote.', 'error');
        }
      }

      return 0;
    },
    [showToast]
  );

  // Load full state from MySQL via PHP API
  const syncFromDatabase = useCallback(async () => {
    const res = await api.loadState();
    setCurrentUser(res.user);
    const st = res.state || {};

    setSettings({ ...DEFAULT_SETTINGS, ...(st.settings || {}) });
    setRepositories(st.repositories?.length ? st.repositories : DEFAULT_REPOSITORIES);
    setInstalledPlugins(st.installedPlugins || {});
    setCustomItems(st.customItems || []);
    setDbMediaItems(st.dbMediaItems || []);
    setLibrary(st.library || {});
    setWatchProgress(st.watchProgress || {});
    setWatchedEpisodes(st.watchedEpisodes || {});
    setDownloads(st.downloads || []);
    setSearchHistory(st.searchHistory || []);
    setActiveProvider(st.settings?.defaultProvider || 'all');

    // Hydrate all installed and enabled plugins
    const installedMap = st.installedPlugins || {};
    (st.repositories || []).forEach((repo) => {
      (repo.plugins || []).forEach((plugin) => {
        if (installedMap[plugin.id]?.enabled) {
          hydratePluginMedia(plugin);
        }
      });
    });
  }, [hydratePluginMedia]);

  // Verify existing session token on mount
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }

    syncFromDatabase()
      .catch(() => {
        setAuthToken('');
        setCurrentUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, [syncFromDatabase]);

  const login = useCallback(
    async (username, password) => {
      const res = await api.login(username, password);
      setAuthToken(res.token);
      setCurrentUser(res.user);
      await syncFromDatabase();
      setActiveTab('home');
      showToast(`Selamat datang, ${res.user.fullName}!`, 'success');
      return res.user;
    },
    [syncFromDatabase, showToast]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setAuthToken('');
    setCurrentUser(null);
    setPlayerSession(null);
    setSelectedMediaId(null);
    setActiveTab('home');
    showToast('Anda telah keluar dari akun.', 'info');
  }, [showToast]);

  // Simulate active download progress & persist completion to MySQL
  useEffect(() => {
    const hasActive = downloads.some((d) => d.status === 'downloading');
    if (!hasActive) return;

    const interval = setInterval(() => {
      setDownloads((prev) =>
        prev.map((item) => {
          if (item.status !== 'downloading') return item;
          const next = Math.min(100, item.progress + Math.floor(Math.random() * 16 + 10));
          const updated = {
            ...item,
            progress: next,
            status: next >= 100 ? 'completed' : 'downloading',
          };
          if (next >= 100) {
            api.saveDownload(updated).catch(() => {});
          }
          return updated;
        })
      );
    }, 650);

    return () => clearInterval(interval);
  }, [downloads]);

  const t = useMemo(() => translations[settings.language] || translations.en, [settings.language]);

  // Flatten all plugins from all repositories
  const allPlugins = useMemo(() => {
    const map = new Map();
    repositories.forEach((repo) => {
      (repo.plugins || []).forEach((plugin) => {
        if (!map.has(plugin.id)) {
          map.set(plugin.id, { ...plugin, repoId: repo.id, repoName: repo.name });
        }
      });
    });
    return Array.from(map.values());
  }, [repositories]);

  const enabledPluginIds = useMemo(() => {
    return new Set(
      Object.entries(installedPlugins)
        .filter(([, meta]) => meta?.enabled)
        .map(([id]) => id)
    );
  }, [installedPlugins]);

  const enabledPlugins = useMemo(
    () => allPlugins.filter((p) => enabledPluginIds.has(p.id)),
    [allPlugins, enabledPluginIds]
  );

  // Full media pool filtered by currently enabled extensions
  const allCatalogMedia = useMemo(() => {
    const extItems = Object.values(externalMediaByPlugin).flat();
    return [...dbMediaItems, ...customItems, ...extItems, ...MEDIA_CATALOG];
  }, [dbMediaItems, customItems, externalMediaByPlugin]);

  const activeMedia = useMemo(() => {
    return allCatalogMedia.filter((item) => {
      if (!enabledPluginIds.has(item.providerId)) return false;
      const isItemNsfw = Boolean(
        item.isNsfw ||
          item.category === 'vivamax' ||
          item.category === 'nsfw' ||
          /vivamax|dewasa 18\+|nsfw/i.test(item.section || '')
      );
      if (isItemNsfw && !settings.showNsfw) return false;
      return true;
    });
  }, [allCatalogMedia, enabledPluginIds, settings.showNsfw]);

  const getMediaById = useCallback(
    (id) => allCatalogMedia.find((m) => m.id === id) || null,
    [allCatalogMedia]
  );

  const getPluginById = useCallback(
    (id) => allPlugins.find((p) => p.id === id) || null,
    [allPlugins]
  );

  // Actions synced to MySQL via PHP API
  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      api.saveSettings(next).catch(() => {});
      return next;
    });
  }, []);

  const installPlugin = useCallback(
    async (pluginId) => {
      const plugin = allPlugins.find((p) => p.id === pluginId);
      setInstalledPlugins((prev) => ({
        ...prev,
        [pluginId]: { enabled: true, installedAt: new Date().toISOString() },
      }));

      try {
        await api.installPlugin(pluginId);
      } catch (err) {
        showToast(err.message, 'error');
        return;
      }

      if (plugin?.runtime === 'android-cs3') {
        showToast(
          `"${plugin.name}" disimpan di DB (.cs3 Android DEX tidak dapat dijalankan langsung di browser).`,
          'info'
        );
        return;
      }

      const loadedCount = await hydratePluginMedia(plugin);
      if (loadedCount > 0) {
        showToast(`"${plugin?.name}" terpasang di DB (${loadedCount} judul siap putar)!`, 'success');
      } else {
        showToast('Ekstensi dipasang & disimpan ke MySQL!', 'success');
      }
    },
    [allPlugins, hydratePluginMedia, showToast]
  );

  const uninstallPlugin = useCallback(
    async (pluginId) => {
      setInstalledPlugins((prev) => {
        const next = { ...prev };
        delete next[pluginId];
        return next;
      });
      setExternalMediaByPlugin((prev) => {
        if (!prev[pluginId]) return prev;
        const next = { ...prev };
        delete next[pluginId];
        return next;
      });
      if (activeProvider === pluginId) setActiveProvider('all');
      try {
        await api.uninstallPlugin(pluginId);
        showToast('Ekstensi dihapus dari database.');
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
    [activeProvider, showToast]
  );

  const togglePluginEnabled = useCallback(
    async (pluginId) => {
      const current = installedPlugins[pluginId];
      if (!current) return;
      const nextEnabled = !current.enabled;
      const plugin = allPlugins.find((p) => p.id === pluginId);

      setInstalledPlugins((prev) => ({
        ...prev,
        [pluginId]: { ...prev[pluginId], enabled: nextEnabled },
      }));

      try {
        await api.togglePlugin(pluginId, nextEnabled);
        if (nextEnabled) {
          if (plugin && (plugin.webAdapter || plugin.catalogUrl || plugin.m3uUrl || plugin.inlineItems)) {
            await hydratePluginMedia(plugin);
          }
          showToast(`"${plugin?.name || pluginId}" aktif & tampil di Pilih Penyedia!`, 'success');
        } else {
          if (activeProvider === pluginId) setActiveProvider('all');
          showToast(`"${plugin?.name || pluginId}" dinonaktifkan.`, 'info');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
    [installedPlugins, allPlugins, hydratePluginMedia, activeProvider, showToast]
  );

  const addRepository = useCallback(
    async ({ name, url }) => {
      const trimmedUrl = url.trim();
      const lower = trimmedUrl.toLowerCase();

      // Shortcode preset
      if (SHORTCODE_REPOS[lower]) {
        const preset = SHORTCODE_REPOS[lower];
        const exists = repositories.some((r) => r.id === preset.id);
        if (exists) {
          showToast('Repositori sudah ada di database.', 'info');
          return { ok: true, repo: preset };
        }
        try {
          await api.addRepo(preset, false);
          setRepositories((prev) => [preset, ...prev]);
          showToast(`Repositori "${preset.name}" tersimpan ke MySQL!`, 'success');
          return { ok: true, repo: preset };
        } catch (err) {
          showToast(err.message, 'error');
          return { ok: false };
        }
      }

      // Remote URL (CloudStream repo.json, plugins.json, or Web JSON repo)
      if (/^https?:\/\//i.test(trimmedUrl)) {
        try {
          const text = await fetchTextSmart(trimmedUrl);
          const json = JSON.parse(text);
          let rawPlugins = [];

          if (Array.isArray(json.pluginLists) && json.pluginLists.length > 0) {
            const listResults = await Promise.all(
              json.pluginLists.map(async (listUrl) => {
                try {
                  const listText = await fetchTextSmart(listUrl);
                  const listJson = JSON.parse(listText);
                  return Array.isArray(listJson)
                    ? listJson
                    : Array.isArray(listJson.plugins)
                    ? listJson.plugins
                    : [];
                } catch {
                  return [];
                }
              })
            );
            rawPlugins = listResults.flat();
          } else if (Array.isArray(json)) {
            rawPlugins = json;
          } else if (Array.isArray(json.plugins)) {
            rawPlugins = json.plugins;
          } else if (Array.isArray(json.items)) {
            rawPlugins = [
              {
                id: `web-cat-${Date.now()}`,
                name: name.trim() || json.name || 'Web Catalog Provider',
                version: json.version || '1.0.0',
                language: 'MULTI',
                description: json.description || `Web catalog loaded from ${trimmedUrl}`,
                runtime: 'web',
                items: json.items,
              },
            ];
          }

          const normalizedPlugins = rawPlugins.map((p, idx) =>
            normalizeCloudStreamPlugin(p, idx)
          );
          const cs3Count = normalizedPlugins.filter((p) => p.runtime === 'android-cs3').length;
          const webCount = normalizedPlugins.length - cs3Count;

          const parsedRepo = {
            id: `repo-${Date.now()}`,
            name: name.trim() || json.name || 'External CloudStream Repo',
            shortCode: (name || json.name || 'custom')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .slice(0, 20),
            url: trimmedUrl,
            iconUrl:
              typeof json.iconUrl === 'string' ? json.iconUrl.replace(/%size%/g, '128') : '',
            description:
              json.description ||
              `Memuat ${normalizedPlugins.length} plugin dari repositori eksternal.`,
            author: json.author || 'External Repo',
            hasAndroidCs3: cs3Count > 0,
            builtIn: false,
            plugins: normalizedPlugins,
          };

          // Persist to MySQL!
          await api.addRepo(parsedRepo, true);
          setRepositories((prev) => [parsedRepo, ...prev]);

          for (const plugin of normalizedPlugins) {
            if (
              plugin.runtime === 'web' &&
              (plugin.inlineItems || plugin.catalogUrl || plugin.m3uUrl)
            ) {
              setInstalledPlugins((prev) => ({
                ...prev,
                [plugin.id]: { enabled: true, installedAt: new Date().toISOString() },
              }));
              await hydratePluginMedia(plugin);
            }
          }

          if (cs3Count > 0 && webCount === 0) {
            showToast(
              `"${parsedRepo.name}" tersimpan ke MySQL (${cs3Count} plugin .cs3 Android terdeteksi).`,
              'info'
            );
          } else {
            showToast(
              `"${parsedRepo.name}" & ${normalizedPlugins.length} plugin tersimpan ke MySQL!`,
              'success'
            );
          }
          return { ok: true, repo: parsedRepo };
        } catch (err) {
          showToast(err.message || 'Gagal mengambil atau menyimpan repo ke MySQL.', 'error');
          return { ok: false };
        }
      }

      showToast('Masukkan URL repo.json valid (https://...) atau shortcode (anime / live).', 'error');
      return { ok: false };
    },
    [repositories, hydratePluginMedia, showToast]
  );

  const removeRepository = useCallback(
    async (repoId) => {
      setRepositories((prev) => prev.filter((r) => r.id !== repoId));
      try {
        await api.removeRepo(repoId);
        showToast('Repositori dihapus dari MySQL.');
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
    [showToast]
  );

  const addCustomStreamItem = useCallback(
    async ({ title, url, poster = '', type }) => {
      const streamType = detectStreamType(url);
      const newItem = {
        id: `custom-${Date.now()}`,
        providerId: 'custom-streams',
        title: title.trim() || 'Direct Stream',
        originalTitle: 'Direct Stream URL',
        type: type || (streamType === 'hls' ? 'live' : 'movie'),
        year: new Date().getFullYear(),
        rating: 8.5,
        duration: streamType === 'hls' ? 'HLS Stream' : 'Direct Video',
        status: streamType === 'hls' ? 'Live' : 'Released',
        quality: streamType === 'hls' ? 'Auto HLS' : 'Direct',
        genres: ['Custom', streamType.toUpperCase()],
        director: 'Direct Link',
        cast: ['CloudStream Web Player'],
        featured: false,
        poster,
        backdrop: poster,
        accentGradient: 'from-violet-950 via-blue-950 to-slate-950',
        synopsis: `Direct ${streamType.toUpperCase()} stream: ${url}`,
        streams: [
          {
            id: `custom-s-${Date.now()}`,
            label: `Direct ${streamType.toUpperCase()} Source`,
            quality: streamType === 'hls' ? 'Auto HLS' : 'Original',
            type: streamType,
            url: url.trim(),
          },
        ],
      };

      setInstalledPlugins((prev) => ({
        ...prev,
        'custom-streams': { enabled: true, installedAt: new Date().toISOString() },
      }));
      setCustomItems((prev) => [newItem, ...prev]);

      try {
        await api.addStreams([newItem]);
        showToast(`"${newItem.title}" tersimpan ke MySQL!`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
      return newItem;
    },
    [showToast]
  );

  const addBatchCustomItems = useCallback(
    async (items) => {
      if (!items.length) return;
      setInstalledPlugins((prev) => ({
        ...prev,
        'custom-streams': { enabled: true, installedAt: new Date().toISOString() },
      }));
      setCustomItems((prev) => [...items, ...prev]);
      try {
        await api.addStreams(items);
        showToast(`${items.length} stream M3U tersimpan ke MySQL!`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
    [showToast]
  );

  const importM3UFromUrl = useCallback(
    async (playlistUrl) => {
      const clean = playlistUrl.trim();
      if (!/^https?:\/\//i.test(clean)) {
        showToast('URL playlist M3U tidak valid', 'error');
        return 0;
      }
      try {
        const text = await fetchTextSmart(clean);
        const parsed = parseM3UPlaylist(text);
        if (parsed.length === 0) {
          showToast('Tidak ada URL stream ditemukan di file M3U tersebut', 'error');
          return 0;
        }
        await addBatchCustomItems(parsed);
        return parsed.length;
      } catch {
        showToast('Gagal mengambil M3U dari URL.', 'error');
        return 0;
      }
    },
    [addBatchCustomItems, showToast]
  );

  const setLibraryStatus = useCallback(
    async (mediaId, status) => {
      setLibrary((prev) => {
        const next = { ...prev };
        if (!status || status === 'none') delete next[mediaId];
        else next[mediaId] = { status, updatedAt: Date.now() };
        return next;
      });
      try {
        await api.setLibrary(mediaId, status);
        showToast(status === 'none' ? 'Dihapus dari Pustaka' : 'Pustaka tersimpan ke MySQL', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
    [showToast]
  );

  const saveProgress = useCallback(
    ({ mediaId, episodeId = null, seasonNumber = null, episodeNumber = null, currentTime, duration }) => {
      if (!mediaId || !duration || duration < 3) return;
      setWatchProgress((prev) => ({
        ...prev,
        [mediaId]: {
          mediaId,
          episodeId,
          seasonNumber,
          episodeNumber,
          currentTime,
          duration,
          updatedAt: Date.now(),
        },
      }));

      if (episodeId && currentTime / duration >= 0.85) {
        setWatchedEpisodes((prev) => ({ ...prev, [episodeId]: true }));
      }

      api
        .saveProgress({ mediaId, episodeId, seasonNumber, episodeNumber, currentTime, duration })
        .catch(() => {});
    },
    []
  );

  const removeWatchProgress = useCallback((mediaId) => {
    setWatchProgress((prev) => {
      const next = { ...prev };
      delete next[mediaId];
      return next;
    });
    api.removeProgress(mediaId).catch(() => {});
  }, []);

  const bindWebAdapter = useCallback(
    async (pluginId, adapter, config = {}) => {
      const res = await api.bindWebAdapter(pluginId, adapter, config);

      // Update repository plugin runtime in state immediately
      setRepositories((prev) =>
        prev.map((repo) => ({
          ...repo,
          plugins: (repo.plugins || []).map((p) =>
            p.id === pluginId
              ? {
                  ...p,
                  runtime: 'web-bridge',
                  badge: 'WEB',
                  webAdapter: adapter,
                  adapterConfig: config,
                }
              : p
          ),
        }))
      );

      setInstalledPlugins((prev) => ({
        ...prev,
        [pluginId]: { enabled: true, installedAt: new Date().toISOString() },
      }));

      // Automatically select this newly activated provider on Home so user sees it right away
      setActiveProvider(pluginId);

      if (Array.isArray(res.items) && res.items.length > 0) {
        setExternalMediaByPlugin((prev) => ({ ...prev, [pluginId]: res.items }));
        showToast(`Web Bridge aktif! ${res.items.length} film siap diputar di Beranda!`, 'success');
      } else {
        const hydrated = await hydratePluginMedia({
          id: pluginId,
          webAdapter: adapter,
          adapterConfig: config,
        });
        if (hydrated > 0) {
          showToast(`Web Bridge aktif! ${hydrated} judul siap diputar!`, 'success');
        } else {
          showToast(
            adapter === 'mysql_catalog'
              ? 'Provider aktif di Pilih Penyedia! Tambahkan film lewat Super Admin → Tambah Film DB.'
              : res.message || 'Plugin diaktifkan sebagai Web Provider!',
            'success'
          );
        }
      }
      return res;
    },
    [hydratePluginMedia, showToast]
  );

  const fetchEpisodesForMedia = useCallback(
    async (mediaId, site, detailUrl) => {
      if (!mediaId || !detailUrl) return null;
      try {
        const res = await api.fetchAnimeEpisodes(site || 'samehadaku', detailUrl);
        const hasSeasons = Array.isArray(res.seasons) && res.seasons.length > 0;
        const hasEpisodes = Array.isArray(res.episodes) && res.episodes.length > 0;
        if (hasSeasons || hasEpisodes) {
          const nextSeasons = hasSeasons
            ? res.seasons
            : [
                {
                  seasonNumber: 1,
                  name: 'Season 1',
                  episodes: res.episodes,
                },
              ];

          setExternalMediaByPlugin((prev) => {
            const next = { ...prev };
            let changed = false;
            for (const [providerId, items] of Object.entries(next)) {
              if (Array.isArray(items)) {
                const idx = items.findIndex((m) => m.id === mediaId);
                if (idx !== -1) {
                  const updatedMedia = {
                    ...items[idx],
                    seasons: nextSeasons,
                  };
                  next[providerId] = [
                    ...items.slice(0, idx),
                    updatedMedia,
                    ...items.slice(idx + 1),
                  ];
                  changed = true;
                }
              }
            }
            return changed ? next : prev;
          });

          setPlayerSession((prev) => {
            if (!prev || prev.media?.id !== mediaId) return prev;
            return {
              ...prev,
              media: {
                ...prev.media,
                seasons: nextSeasons,
              },
            };
          });

          return res.episodes || nextSeasons[0]?.episodes || [];
        }
      } catch (err) {
        console.error('Error fetching episodes:', err);
      }
      return null;
    },
    []
  );

  const startPlayback = useCallback(
    async (media, episode = null, seasonNumber = null) => {
      if (!media) return;
      let targetMedia = media;
      let targetEp = episode;
      let targetSeason = seasonNumber;

      // Auto-fetch full seasons & episodes in background if user clicked Quick Play on a series card
      if (
        targetMedia.sourceSite &&
        targetMedia.detailUrl &&
        targetMedia.seasons?.length === 1 &&
        (targetMedia.seasons[0]?.episodes?.length || 0) <= 1
      ) {
        fetchEpisodesForMedia(targetMedia.id, targetMedia.sourceSite, targetMedia.detailUrl);
      }

      if (targetMedia.seasons?.length && !targetEp) {
        const savedProg = watchProgress[targetMedia.id];
        if (savedProg?.episodeId) {
          for (const s of targetMedia.seasons) {
            const found = s.episodes?.find((ep) => ep.id === savedProg.episodeId);
            if (found) {
              targetEp = found;
              targetSeason = s.seasonNumber;
              break;
            }
          }
        }
        if (!targetEp) {
          targetSeason = targetMedia.seasons[0]?.seasonNumber || 1;
          targetEp = targetMedia.seasons[0]?.episodes?.[0] || null;
        }
      }

      // Identify the stream to play or resolve
      const activeStream = targetEp ? targetEp.streams?.[0] : targetMedia.streams?.[0];

      // Open player immediately so user sees responsive feedback
      setPlayerSession({
        media: targetMedia,
        episode: targetEp,
        seasonNumber: targetSeason,
      });

      // Resolve live anime stream in background if needed
      if (activeStream?.type === 'scraper_direct' && activeStream?.sourceUrl) {
        api.resolveAnimeStream(activeStream.sourceSite || 'samehadaku', activeStream.sourceUrl)
          .then((resolved) => {
            if (resolved.streams && resolved.streams.length > 0) {
              const updatedEp = targetEp ? { ...targetEp, streams: resolved.streams } : null;
              const updatedMedia = {
                ...targetMedia,
                streams: resolved.streams,
                ...(targetMedia.seasons && updatedEp
                  ? {
                      seasons: targetMedia.seasons.map((s) => ({
                        ...s,
                        episodes: s.episodes.map((e) => (e.id === updatedEp.id ? updatedEp : e)),
                      })),
                    }
                  : {}),
              };

              setPlayerSession({
                media: updatedMedia,
                episode: updatedEp,
                seasonNumber: targetSeason,
              });

              setExternalMediaByPlugin((prev) => {
                const list = prev[media.providerId];
                if (!list) return prev;
                return {
                  ...prev,
                  [media.providerId]: list.map((m) => (m.id === media.id ? updatedMedia : m)),
                };
              });
            }
          })
          .catch(() => {});
      } else if (!targetEp && activeStream?.type === 'archive' && activeStream?.archiveId) {
        api.resolveArchiveStream(activeStream.archiveId)
          .then((resolved) => {
            if (resolved.streams && resolved.streams.length > 0) {
              const updatedMedia = { ...targetMedia, streams: resolved.streams };
              setPlayerSession({
                media: updatedMedia,
                episode: null,
                seasonNumber: targetSeason,
              });
              setExternalMediaByPlugin((prev) => {
                const list = prev[media.providerId];
                if (!list) return prev;
                return {
                  ...prev,
                  [media.providerId]: list.map((m) => (m.id === media.id ? updatedMedia : m)),
                };
              });
            }
          })
          .catch(() => {});
      }
    },
    [watchProgress, showToast]
  );

  const queueDownload = useCallback(
    (media, episode = null, seasonNumber = null) => {
      const targetStream = episode ? episode.streams?.[0] : media.streams?.[0];
      if (!targetStream) return;

      const dlId = episode ? `${media.id}-${episode.id}` : media.id;
      if (downloads.find((d) => d.id === dlId)) {
        showToast('Sudah ada di antrean Unduhan', 'info');
        return;
      }

      const entry = {
        id: dlId,
        mediaId: media.id,
        episodeId: episode?.id || null,
        seasonNumber,
        episodeNumber: episode?.number || null,
        title: media.title,
        subtitle: episode
          ? `S${seasonNumber}E${episode.number} · ${episode.title}`
          : `${media.year} · ${media.quality}`,
        poster: episode?.thumbnail || media.poster,
        streamUrl: targetStream.url,
        streamType: targetStream.type,
        sizeMb: Math.floor(Math.random() * 320 + 85),
        progress: 6,
        status: 'downloading',
        addedAt: Date.now(),
      };

      setDownloads((prev) => [entry, ...prev]);
      api.saveDownload(entry).catch(() => {});
      showToast(`Unduhan ditambahkan: ${media.title}`, 'success');
    },
    [downloads, showToast]
  );

  const toggleDownloadPause = useCallback((dlId) => {
    setDownloads((prev) =>
      prev.map((d) => {
        if (d.id !== dlId || d.status === 'completed') return d;
        const next = { ...d, status: d.status === 'paused' ? 'downloading' : 'paused' };
        api.saveDownload(next).catch(() => {});
        return next;
      })
    );
  }, []);

  const removeDownload = useCallback((dlId) => {
    setDownloads((prev) => prev.filter((d) => d.id !== dlId));
    api.removeDownload(dlId).catch(() => {});
  }, []);

  const clearCompletedDownloads = useCallback(() => {
    setDownloads((prev) => prev.filter((d) => d.status !== 'completed'));
    api.clearCompletedDownloads().catch(() => {});
  }, []);

  const addSearchHistory = useCallback((term) => {
    const clean = term.trim();
    if (!clean) return;
    setSearchHistory((prev) => {
      const next = [clean, ...prev.filter((i) => i.toLowerCase() !== clean.toLowerCase())].slice(
        0,
        10
      );
      api.saveSearchHistory(next).catch(() => {});
      return next;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    api.saveSearchHistory([]).catch(() => {});
  }, []);

  const exportBackup = useCallback(() => {
    const data = {
      app: 'AwiFlix',
      version: 2,
      user: currentUser?.username,
      exportedAt: new Date().toISOString(),
      settings,
      repositories,
      installedPlugins,
      customItems,
      library,
      watchProgress,
      watchedEpisodes,
      searchHistory,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `awiflix-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t.settings.backupSuccess, 'success');
  }, [
    currentUser,
    settings,
    repositories,
    installedPlugins,
    customItems,
    library,
    watchProgress,
    watchedEpisodes,
    searchHistory,
    showToast,
    t,
  ]);

  const importBackup = useCallback(
    async (jsonText) => {
      try {
        const data = JSON.parse(jsonText);
        if (data.settings) updateSettings(data.settings);
        if (Array.isArray(data.customItems) && data.customItems.length) {
          await addBatchCustomItems(data.customItems);
        }
        if (Array.isArray(data.repositories)) {
          for (const repo of data.repositories) {
            if (!repo.builtIn) {
              await api.addRepo(repo, false);
            }
          }
          await syncFromDatabase();
        }
        showToast(t.settings.restoreSuccess, 'success');
        return true;
      } catch {
        showToast('File backup JSON tidak valid', 'error');
        return false;
      }
    },
    [updateSettings, addBatchCustomItems, syncFromDatabase, showToast, t]
  );

  const resetAllData = useCallback(async () => {
    try {
      await api.resetWorkspace();
      await syncFromDatabase();
      showToast('Data workspace di MySQL direset ke default.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [syncFromDatabase, showToast]);

  const value = {
    t,
    currentUser,
    authLoading,
    login,
    logout,
    syncFromDatabase,
    settings,
    updateSettings,
    repositories,
    allPlugins,
    installedPlugins,
    enabledPlugins,
    enabledPluginIds,
    installPlugin,
    uninstallPlugin,
    togglePluginEnabled,
    bindWebAdapter,
    addRepository,
    removeRepository,
    addCustomStreamItem,
    addBatchCustomItems,
    importM3UFromUrl,
    allCatalogMedia,
    activeMedia,
    getMediaById,
    getPluginById,
    library,
    setLibraryStatus,
    watchProgress,
    saveProgress,
    removeWatchProgress,
    watchedEpisodes,
    downloads,
    queueDownload,
    toggleDownloadPause,
    removeDownload,
    clearCompletedDownloads,
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    activeTab,
    setActiveTab,
    activeProvider,
    setActiveProvider,
    selectedMediaId,
    setSelectedMediaId,
    fetchEpisodesForMedia,
    hydratePluginMedia,
    playerSession,
    setPlayerSession,
    startPlayback,
    toast,
    showToast,
    exportBackup,
    importBackup,
    resetAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
