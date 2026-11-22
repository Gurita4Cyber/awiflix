import React, { useState } from 'react';
import {
  Puzzle,
  Plus,
  Trash2,
  Power,
  Download,
  CheckCircle2,
  Link2,
  Radio,
  Search,
  X,
  FolderGit2,
  ListVideo,
  Play,
  Smartphone,
  Globe,
  Code2,
  Zap,
  Loader2,
  Database,
  Film,
  FileCode2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBytes, parseM3UPlaylist } from '../utils/helpers';
import { api } from '../services/api';

function PluginIcon({ plugin }) {
  const [imgErr, setImgErr] = useState(false);

  if (plugin.iconUrl && !imgErr) {
    return (
      <img
        src={plugin.iconUrl}
        alt={plugin.name}
        onError={() => setImgErr(true)}
        className="h-11 w-11 shrink-0 rounded-xl object-cover bg-black/40 border cs-border shadow-md"
      />
    );
  }

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white font-display font-extrabold text-xs shadow-md"
      style={{ backgroundColor: plugin.iconColor || '#3d63ff' }}
    >
      {plugin.badge || plugin.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

const ARCHIVE_COLLECTIONS = [
  { id: 'classic_cartoons', label: 'Classic Cartoons & Animation (Public Domain)' },
  { id: 'feature_films', label: 'Feature Films (Full Movies — Public Domain)' },
  { id: 'sci_fi_horror', label: 'Sci-Fi & Classic Horror Cinema' },
  { id: 'animationandcartoons', label: 'Animation & Indie Shorts' },
  { id: 'comedy_films', label: 'Classic Comedy Films' },
];

export function ExtensionsView() {
  const {
    t,
    repositories,
    installedPlugins,
    installPlugin,
    uninstallPlugin,
    togglePluginEnabled,
    bindWebAdapter,
    addRepository,
    removeRepository,
    addCustomStreamItem,
    addBatchCustomItems,
    importM3UFromUrl,
    startPlayback,
    setActiveTab,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [showWebSpec, setShowWebSpec] = useState(false);

  // Web Bridge Conversion Modal (for .cs3 -> Web Provider)
  const [bridgePlugin, setBridgePlugin] = useState(null);
  const [cs3Inspection, setCs3Inspection] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [adapterType, setAdapterType] = useState('archive_org');
  const [archiveCollection, setArchiveCollection] = useState('classic_cartoons');
  const [archiveQuery, setArchiveQuery] = useState('');
  const [adapterUrl, setAdapterUrl] = useState('');
  const [bridgeSubmitting, setBridgeSubmitting] = useState(false);

  // Add Repo form state
  const [repoName, setRepoName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [repoLoading, setRepoLoading] = useState(false);

  // Custom Stream / M3U form state
  const [streamTitle, setStreamTitle] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uText, setM3uText] = useState('');
  const [m3uLoading, setM3uLoading] = useState(false);
  const [customTab, setCustomTab] = useState('single');

  const openBridgeModal = async (plugin) => {
    setBridgePlugin(plugin);
    setCs3Inspection(null);
    setAdapterType(plugin.webAdapter || 'native_source');
    setArchiveCollection(plugin.adapterConfig?.collection || 'classic_cartoons');
    setArchiveQuery(plugin.adapterConfig?.query || '');
    setAdapterUrl(plugin.adapterConfig?.url || '');

    // Automatically inspect .cs3 archive via PHP if URL ends with .cs3
    if (plugin.url && plugin.url.toLowerCase().includes('.cs3')) {
      setInspectLoading(true);
      try {
        const res = await api.inspectCs3(plugin.url);
        setCs3Inspection(res);
      } catch {
        setCs3Inspection(null);
      } finally {
        setInspectLoading(false);
      }
    }
  };

  const handleActivateBridge = async (e) => {
    e.preventDefault();
    if (!bridgePlugin) return;
    setBridgeSubmitting(true);
    try {
      const config =
        adapterType === 'archive_org'
          ? { collection: archiveCollection, query: archiveQuery.trim() }
          : adapterType === 'm3u_url' || adapterType === 'json_catalog'
          ? { url: adapterUrl.trim() }
          : {};

      await bindWebAdapter(bridgePlugin.id, adapterType, config);
      setBridgePlugin(null);
      setActiveTab('home');
    } catch (err) {
      showToast(err.message || 'Gagal mengaktifkan Web Bridge', 'error');
    } finally {
      setBridgeSubmitting(false);
    }
  };

  const handleAddRepo = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setRepoLoading(true);
    const result = await addRepository({ name: repoName, url: repoUrl });
    setRepoLoading(false);
    if (result?.ok) {
      setRepoName('');
      setRepoUrl('');
      setRepoModalOpen(false);
    }
  };

  const handleAddSingleStream = async (e) => {
    e.preventDefault();
    if (!streamUrl.trim()) return;
    const item = await addCustomStreamItem({
      title: streamTitle.trim() || 'Custom Stream',
      url: streamUrl.trim(),
    });
    setStreamTitle('');
    setStreamUrl('');
    setCustomModalOpen(false);
    startPlayback(item);
  };

  const handleImportM3U = async (e) => {
    e.preventDefault();
    if (m3uUrl.trim()) {
      setM3uLoading(true);
      const count = await importM3UFromUrl(m3uUrl.trim());
      setM3uLoading(false);
      if (count > 0) {
        setM3uUrl('');
        setCustomModalOpen(false);
      }
      return;
    }

    const parsed = parseM3UPlaylist(m3uText);
    if (parsed.length === 0) {
      showToast('No valid http(s) stream URLs found in M3U text', 'error');
      return;
    }
    await addBatchCustomItems(parsed);
    setM3uText('');
    setCustomModalOpen(false);
  };

  const q = searchTerm.trim().toLowerCase();

  return (
    <div className="px-4 sm:px-7 pt-6 pb-24 md:pb-12 max-w-6xl mx-auto animate-cs-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Puzzle className="w-6 h-6 cs-accent-text" />
            {t.extensions.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">{t.extensions.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowWebSpec((s) => !s)}
            className="inline-flex items-center gap-2 rounded-xl cs-surface cs-surface-hover border cs-border px-3.5 py-2.5 text-xs font-bold text-slate-200 transition"
          >
            <Code2 className="w-4 h-4 cs-accent-text" />
            Web JSON Spec
          </button>

          <button
            type="button"
            onClick={() => setCustomModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl cs-surface cs-surface-hover border cs-border px-4 py-2.5 text-xs font-bold text-slate-100 transition"
          >
            <Radio className="w-4 h-4 text-violet-400" />
            {t.extensions.addCustom}
          </button>

          <button
            type="button"
            onClick={() => setRepoModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl cs-accent-bg px-4 py-2.5 text-xs font-bold text-white cs-accent-glow transition"
          >
            <Plus className="w-4 h-4" />
            {t.extensions.addRepo}
          </button>
        </div>
      </div>

      {/* Collapsible Web Extension JSON Spec */}
      {showWebSpec && (
        <div className="mb-6 rounded-2xl cs-bg-elevated border cs-border p-5 space-y-3 animate-cs-fade">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 cs-accent-text" />
              Format Repositori Web-Ready &amp; PHP Web Bridge
            </h3>
            <button
              type="button"
              onClick={() => setShowWebSpec(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Setiap plugin dari <code className="text-slate-200">repo.json</code> (termasuk plugin{' '}
            <code className="text-amber-300">.cs3</code> Android) kini bisa diinspeksi lewat PHP dan
            diaktifkan di web menggunakan tombol <strong>Aktifkan di Web (Web Bridge)</strong> untuk
            menghubungkannya ke <strong>Internet Archive Live API</strong>,{' '}
            <strong>Playlist M3U/M3U8</strong>, <strong>Web JSON Catalog</strong>, atau{' '}
            <strong>Katalog Film MySQL</strong> kamu sendiri.
          </p>
          <pre className="overflow-x-auto rounded-xl bg-black/50 border cs-border p-3.5 text-[11px] font-mono text-slate-300">
{`{
  "name": "My Web Cinema Repo",
  "plugins": [
    {
      "id": "my-web-provider",
      "name": "Open Cinema Web",
      "version": "1.0.0",
      "language": "ID",
      "catalogUrl": "https://example.com/catalog.json",
      "m3uUrl": "https://example.com/playlist.m3u"
    }
  ]
}`}
          </pre>
        </div>
      )}

      {/* Plugin Filter Search */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter repositories or plugins..."
          className="w-full rounded-xl cs-surface border cs-border pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--cs-accent)]"
        />
      </div>

      {/* Quick Shortcode Tip Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl cs-accent-soft border border-[var(--cs-accent)]/30 px-4 py-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-200">
          <FolderGit2 className="w-4 h-4 cs-accent-text shrink-0" />
          <span>
            Semua repositori &amp; ekstensi tersimpan permanen di <strong>MySQL</strong>. Klik{' '}
            <strong>Aktifkan di Web</strong> pada plugin eksternal mana saja untuk langsung
            menghubungkannya ke sumber film yang bisa diputar di browser!
          </span>
        </div>
        <button
          type="button"
          onClick={() => addRepository({ name: 'Open Animation Repo', url: 'anime' })}
          className="shrink-0 rounded-lg cs-accent-bg px-3 py-1.5 text-[11px] font-bold text-white shadow"
        >
          + Quick Add "anime"
        </button>
      </div>

      {/* Repositories & Plugins List */}
      <div className="space-y-6">
        {repositories.map((repo) => {
          const filteredPlugins = (repo.plugins || []).filter(
            (p) =>
              !q ||
              p.name.toLowerCase().includes(q) ||
              (p.description || '').toLowerCase().includes(q) ||
              repo.name.toLowerCase().includes(q)
          );

          if (q && filteredPlugins.length === 0) return null;

          const hasUnbridgedCs3 = (repo.plugins || []).some((p) => p.runtime === 'android-cs3');

          return (
            <section
              key={repo.id}
              className="rounded-2xl cs-bg-elevated border cs-border overflow-hidden shadow-lg"
            >
              {/* Repo Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b cs-border p-4 sm:p-5 bg-white/[0.02]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base sm:text-lg font-bold text-white">
                      {repo.name}
                    </h2>
                    <span className="rounded-md cs-surface border cs-border px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      {repo.plugins?.length || 0} {t.extensions.providersCount}
                    </span>
                    {repo.shortCode && (
                      <span className="rounded-md cs-accent-soft cs-accent-text px-2 py-0.5 text-[10px] font-mono font-bold">
                        #{repo.shortCode}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{repo.description}</p>
                  <p className="mt-1 truncate text-[11px] font-mono text-slate-500">{repo.url}</p>
                </div>

                {!repo.builtIn && (
                  <button
                    type="button"
                    onClick={() => removeRepository(repo.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t.extensions.removeRepo}
                  </button>
                )}
              </div>

              {/* Actionable Web Bridge Hint Banner for Android .cs3 repos */}
              {hasUnbridgedCs3 && (
                <div className="flex items-start gap-3 border-b cs-border bg-blue-500/10 px-4 sm:px-5 py-3 text-xs text-blue-100">
                  <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>PHP Web Bridge Siap Digunakan:</strong> File binary{' '}
                    <code className="text-cyan-200">.cs3</code> Android (Dalvik DEX) tidak bisa
                    dijalankan mentah oleh browser, namun kamu bisa klik tombol{' '}
                    <strong className="text-white">Aktifkan di Web</strong> pada plugin di bawah
                    untuk menginspeksi arsip <code className="text-cyan-200">.cs3</code>-nya dan
                    menghubungkannya ke <strong>Internet Archive Live API</strong>,{' '}
                    <strong>Playlist M3U</strong>, <strong>JSON Catalog</strong>, atau{' '}
                    <strong>Katalog Film MySQL</strong> agar film langsung tampil &amp; bisa diputar!
                  </div>
                </div>
              )}

              {/* Plugins inside Repo */}
              <div className="divide-y divide-white/[0.06]">
                {filteredPlugins.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Tidak ada plugin di dalam repositori ini.
                  </div>
                ) : (
                  filteredPlugins.map((plugin) => {
                    const installed = installedPlugins[plugin.id];
                    const isEnabled = Boolean(installed?.enabled);
                    const isCs3 = plugin.runtime === 'android-cs3';
                    const isBridged = plugin.runtime === 'web-bridge';

                    return (
                      <div
                        key={plugin.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-5 hover:bg-white/[0.02] transition"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <PluginIcon plugin={plugin} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-sm font-bold text-white">{plugin.name}</h3>
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                                v{plugin.version}
                              </span>
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                                {plugin.language}
                              </span>
                              {isBridged ? (
                                <span className="inline-flex items-center gap-1 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                                  <Zap className="w-2.5 h-2.5" />
                                  WEB BRIDGE ({plugin.webAdapter})
                                </span>
                              ) : isCs3 ? (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/25">
                                  <Smartphone className="w-2.5 h-2.5" />
                                  ANDROID .CS3
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/25">
                                  <Globe className="w-2.5 h-2.5" />
                                  WEB READY
                                </span>
                              )}
                              {plugin.fileSize > 0 && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {formatBytes(plugin.fileSize)}
                                </span>
                              )}
                              {installed && !isCs3 && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    isEnabled
                                      ? 'bg-emerald-500/15 text-emerald-400'
                                      : 'bg-slate-500/20 text-slate-400'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  {isEnabled ? t.extensions.enabled : t.extensions.disabled}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">{plugin.description}</p>
                            {plugin.tvTypes?.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {plugin.tvTypes.map((tv) => (
                                  <span
                                    key={tv}
                                    className="rounded cs-surface border cs-border px-1.5 py-0.5 text-[10px] text-slate-400"
                                  >
                                    {tv}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Plugin Controls */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {isCs3 ? (
                            <button
                              type="button"
                              onClick={() => openBridgeModal(plugin)}
                              className="inline-flex items-center gap-1.5 rounded-xl cs-accent-bg px-3.5 py-2 text-xs font-bold text-white cs-accent-glow transition"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              Aktifkan di Web
                            </button>
                          ) : installed ? (
                            <>
                              {isBridged && (
                                <button
                                  type="button"
                                  onClick={() => openBridgeModal(plugin)}
                                  className="inline-flex items-center gap-1 rounded-xl cs-surface cs-surface-hover border cs-border px-2.5 py-2 text-xs font-semibold text-cyan-300"
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  Atur Bridge
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => togglePluginEnabled(plugin.id)}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition ${
                                  isEnabled
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-amber-500/15 hover:text-amber-300 hover:border-amber-500/30'
                                    : 'cs-accent-bg text-white border-transparent shadow'
                                }`}
                                title={isEnabled ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'}
                              >
                                <Power className="w-3.5 h-3.5" />
                                {isEnabled ? 'ON (Nonaktifkan)' : 'OFF → Aktifkan'}
                              </button>
                              <button
                                type="button"
                                onClick={() => uninstallPlugin(plugin.id)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 px-3 py-2 text-xs font-semibold text-rose-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t.extensions.uninstall}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => installPlugin(plugin.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl cs-accent-bg px-4 py-2 text-xs font-bold text-white shadow transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {t.extensions.install}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* PHP Web Bridge Modal (Convert .cs3 -> Working Web Provider) */}
      {bridgePlugin && (
        <div
          onClick={() => setBridgePlugin(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl cs-bg-elevated border cs-border p-6 shadow-2xl animate-cs-fade my-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <PluginIcon plugin={bridgePlugin} />
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-white truncate">
                    Aktifkan di Web: {bridgePlugin.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    PHP Web Provider Bridge → MySQL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBridgePlugin(null)}
                className="rounded-full p-1.5 text-slate-400 hover:text-white cs-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live PHP .cs3 Inspection Result */}
            {inspectLoading ? (
              <div className="mb-4 flex items-center gap-2.5 rounded-xl cs-surface border cs-border p-3 text-xs text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin cs-accent-text shrink-0" />
                Menginspeksi arsip .cs3 melalui PHP server...
              </div>
            ) : cs3Inspection ? (
              <div className="mb-4 rounded-xl bg-black/40 border cs-border p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-cyan-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5" /> Sumber Asli Terdeteksi
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {formatBytes(cs3Inspection.archiveBytes)}
                  </span>
                </div>
                {cs3Inspection.manifest?.pluginClassName && (
                  <p className="font-mono text-[11px] text-slate-300 truncate">
                    Plugin: {cs3Inspection.manifest.pluginClassName}
                  </p>
                )}
                <p className="text-[11px] text-emerald-300 leading-relaxed font-semibold">
                  ✓ Siap dihubungkan ke server cloud stream web ({bridgePlugin.name}).
                </p>
              </div>
            ) : null}

            <form onSubmit={handleActivateBridge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Pilih Mode Pengambilan Data:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'native_source',
                      title: 'Sumber Asli Ekstensi (Otomatis)',
                      desc: `Ambil film, anime & series langsung dari ${bridgePlugin.name}!`,
                      icon: Zap,
                    },
                    {
                      id: 'mysql_catalog',
                      title: 'Katalog MySQL Sendiri',
                      desc: 'Isi judul lewat Super Admin DB',
                      icon: Database,
                    },
                    {
                      id: 'm3u_url',
                      title: 'Playlist M3U / M3U8',
                      desc: 'Impor otomatis dari URL .m3u',
                      icon: Radio,
                    },
                    {
                      id: 'archive_org',
                      title: 'Internet Archive Live',
                      desc: 'Koleksi film & kartun legal',
                      icon: Film,
                    },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = adapterType === opt.id || (opt.id === 'native_source' && adapterType === 'native_anime');
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAdapterType(opt.id)}
                        className={`flex flex-col items-start rounded-xl p-3 text-left border transition ${
                          active
                            ? 'cs-accent-soft border-[var(--cs-accent)] text-white'
                            : 'cs-surface cs-border text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1.5 ${active ? 'cs-accent-text' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">{opt.title}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(adapterType === 'native_source' || adapterType === 'native_anime') && (
                <div className="rounded-xl cs-surface border cs-border p-3.5 text-xs text-slate-300 leading-relaxed space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" /> Pengambilan Langsung dari Server {bridgePlugin.name}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Ekstensi ini akan langsung mem-fetch katalog film/anime, episode terbaru, dan tautan stream video asli ke dalam Web Player!
                  </p>
                </div>
              )}

              {(adapterType === 'm3u_url' || adapterType === 'json_catalog') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {adapterType === 'm3u_url' ? 'URL Playlist .m3u / .m3u8 *' : 'URL Web JSON Catalog *'}
                  </label>
                  <input
                    type="url"
                    required
                    value={adapterUrl}
                    onChange={(e) => setAdapterUrl(e.target.value)}
                    placeholder={
                      adapterType === 'm3u_url'
                        ? 'https://raw.githubusercontent.com/.../playlist.m3u'
                        : 'https://example.com/catalog.json'
                    }
                    className="w-full rounded-xl cs-surface border cs-border px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--cs-accent)]"
                  />
                </div>
              )}

              {adapterType === 'mysql_catalog' && (
                <div className="rounded-xl cs-surface border cs-border p-3.5 text-xs text-slate-300 leading-relaxed">
                  Provider ini akan mengambil film dari tabel MySQL{' '}
                  <code className="text-white">media_items</code> dengan{' '}
                  <code className="text-cyan-300">provider_id = "{bridgePlugin.id}"</code>. Kamu bisa
                  menambahkan film &amp; link stream MP4/HLS lewat menu{' '}
                  <strong>Super Admin → Katalog Film MySQL</strong>!
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBridgePlugin(null)}
                  className="rounded-xl cs-surface px-4 py-2 text-xs font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={bridgeSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl cs-accent-bg px-5 py-2 text-xs font-bold text-white cs-accent-glow disabled:opacity-50"
                >
                  {bridgeSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat film...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" /> Aktifkan &amp; Tampilkan Film
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Repository Modal */}
      {repoModalOpen && (
        <div
          onClick={() => setRepoModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl cs-bg-elevated border cs-border p-6 shadow-2xl animate-cs-fade"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-white">
                {t.extensions.repoModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setRepoModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-white cs-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRepo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder={t.extensions.repoNamePlaceholder}
                  className="w-full rounded-xl cs-surface border cs-border px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--cs-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Repository URL / Shortcode *
                </label>
                <input
                  type="text"
                  required
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder={t.extensions.repoUrlPlaceholder}
                  className="w-full rounded-xl cs-surface border cs-border px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--cs-accent)]"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">{t.extensions.repoHint}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRepoModalOpen(false)}
                  className="rounded-xl cs-surface px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={repoLoading}
                  className="rounded-xl cs-accent-bg px-5 py-2 text-xs font-bold text-white cs-accent-glow disabled:opacity-50"
                >
                  {repoLoading ? 'Fetching repo...' : t.extensions.addRepo}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Direct Stream / M3U Importer Modal */}
      {customModalOpen && (
        <div
          onClick={() => setCustomModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl cs-bg-elevated border cs-border p-6 shadow-2xl animate-cs-fade"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-white">
                {t.extensions.customStreamTitle}
              </h3>
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-white cs-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex rounded-xl cs-surface border cs-border p-1 mb-4">
              <button
                type="button"
                onClick={() => setCustomTab('single')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  customTab === 'single'
                    ? 'cs-accent-bg text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                Single URL (.m3u8 / .mp4)
              </button>
              <button
                type="button"
                onClick={() => setCustomTab('m3u')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  customTab === 'm3u'
                    ? 'cs-accent-bg text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListVideo className="w-3.5 h-3.5" />
                #EXTM3U Playlist
              </button>
            </div>

            {customTab === 'single' ? (
              <form onSubmit={handleAddSingleStream} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Title</label>
                  <input
                    type="text"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder={t.extensions.streamTitlePlaceholder}
                    className="w-full rounded-xl cs-surface border cs-border px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--cs-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Stream URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder={t.extensions.streamUrlPlaceholder}
                    className="w-full rounded-xl cs-surface border cs-border px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--cs-accent)]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCustomModalOpen(false)}
                    className="rounded-xl cs-surface px-4 py-2 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl cs-accent-bg px-5 py-2 text-xs font-bold text-white cs-accent-glow"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    {t.extensions.addStream}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleImportM3U} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Remote M3U URL (Opsional)
                  </label>
                  <input
                    type="url"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/.../playlist.m3u"
                    className="w-full rounded-xl cs-surface border cs-border px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--cs-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Atau tempel isi #EXTM3U
                  </label>
                  <textarea
                    rows={5}
                    value={m3uText}
                    onChange={(e) => setM3uText(e.target.value)}
                    placeholder={`#EXTM3U\n#EXTINF:-1 group-title="Open TV",Big Buck Bunny HLS\nhttps://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`}
                    className="w-full rounded-xl cs-surface border cs-border p-3.5 font-mono text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--cs-accent)]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomModalOpen(false)}
                    className="rounded-xl cs-surface px-4 py-2 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={m3uLoading}
                    className="rounded-xl cs-accent-bg px-5 py-2 text-xs font-bold text-white cs-accent-glow disabled:opacity-50"
                  >
                    {m3uLoading ? 'Importing...' : t.extensions.importM3u}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
