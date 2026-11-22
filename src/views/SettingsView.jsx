import React, { useRef } from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  PlaySquare,
  Database,
  Info,
  Download,
  Upload,
  RotateCcw,
  Github,
  Globe,
  Keyboard,
  LogOut,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const THEMES = [
  { id: 'dark', label: 'AwiFlix Dark', bg: '#0e0f14', card: '#1b1e2c' },
  { id: 'amoled', label: 'AMOLED Pitch Black', bg: '#000000', card: '#11131a' },
  { id: 'midnight', label: 'Midnight Navy', bg: '#09101f', card: '#162340' },
  { id: 'purple', label: 'Obsidian Violet', bg: '#0e0b16', card: '#201834' },
];

const ACCENTS = [
  { id: 'blue', label: 'CloudStream Blue', hex: '#3d63ff' },
  { id: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
  { id: 'rose', label: 'Crimson', hex: '#f43f5e' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
  { id: 'amber', label: 'Amber', hex: '#f59e0b' },
];

export function SettingsView() {
  const { t, currentUser, logout, settings, updateSettings, exportBackup, importBackup, resetAllData } = useApp();
  const fileInputRef = useRef(null);

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        importBackup(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="px-4 sm:px-7 pt-6 pb-24 md:pb-12 max-w-4xl mx-auto animate-cs-fade">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 cs-accent-text" />
          {t.settings.title}
        </h1>
      </div>

      <div className="space-y-6">
        {/* Account & Session Info */}
        {currentUser && (
          <section className="rounded-2xl cs-bg-elevated border cs-border p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl cs-accent-soft cs-accent-text">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {currentUser.fullName}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    (@{currentUser.username})
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Role: <strong className="text-slate-200 uppercase">{currentUser.role}</strong> ·{' '}
                  {currentUser.role === 'super_admin' || !currentUser.expiresAt
                    ? 'Masa aktif: Unlimited'
                    : `Sisa ${currentUser.daysRemaining} hari (Exp: ${currentUser.expiresAt})`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 px-4 py-2 text-xs font-bold text-rose-300 transition"
            >
              <LogOut className="w-4 h-4" />
              Keluar / Logout
            </button>
          </section>
        )}

        {/* General / Language */}
        <section className="rounded-2xl cs-bg-elevated border cs-border p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 cs-accent-text" />
            {t.settings.general}
          </h2>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{t.settings.language}</p>
              <p className="text-xs text-slate-400">Bahasa Indonesia / English</p>
            </div>
            <div className="flex rounded-xl cs-surface border cs-border p-1">
              <button
                type="button"
                onClick={() => updateSettings({ language: 'id' })}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  settings.language === 'id' ? 'cs-accent-bg text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Indonesia
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ language: 'en' })}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  settings.language === 'en' ? 'cs-accent-bg text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* NSFW / 18+ Vivamax Filter Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-4 border-t cs-border">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">Mode NSFW (Konten Dewasa 18+)</p>
                  <span className="rounded-md bg-rose-600/20 border border-rose-500/40 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-300">
                    18+
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aktifkan untuk menampilkan kategori <strong className="text-rose-300">Vivamax 18+</strong> dan film dewasa 18+ di Beranda &amp; daftar kategori.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(settings.showNsfw)}
              onClick={() => updateSettings({ showNsfw: !settings.showNsfw })}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                settings.showNsfw
                  ? 'bg-rose-600 border-rose-500'
                  : 'bg-slate-700/80 border-slate-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  settings.showNsfw ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Appearance & Theme */}
        <section className="rounded-2xl cs-bg-elevated border cs-border p-5 space-y-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Palette className="w-4 h-4 cs-accent-text" />
            {t.settings.appearance}
          </h2>

          <div>
            <p className="text-sm font-semibold text-white mb-2.5">{t.settings.theme}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {THEMES.map((th) => {
                const active = settings.theme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => updateSettings({ theme: th.id })}
                    className={`flex flex-col items-start rounded-xl p-3 border text-left transition ${
                      active
                        ? 'border-[var(--cs-accent)] cs-accent-ring'
                        : 'cs-border hover:border-white/25'
                    }`}
                    style={{ backgroundColor: th.bg }}
                  >
                    <div
                      className="h-8 w-full rounded-lg mb-2.5 border border-white/10"
                      style={{ backgroundColor: th.card }}
                    />
                    <span className="text-xs font-bold text-white">{th.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white mb-2.5">{t.settings.accent}</p>
            <div className="flex flex-wrap gap-3">
              {ACCENTS.map((ac) => {
                const active = settings.accent === ac.id;
                return (
                  <button
                    key={ac.id}
                    type="button"
                    onClick={() => updateSettings({ accent: ac.id })}
                    className={`flex items-center gap-2 rounded-xl cs-surface px-3 py-2 text-xs font-semibold text-slate-200 border transition ${
                      active ? 'border-white ring-2 ring-white/30' : 'cs-border hover:border-white/25'
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full shadow"
                      style={{ backgroundColor: ac.hex }}
                    />
                    {ac.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Video Player Settings */}
        <section className="rounded-2xl cs-bg-elevated border cs-border p-5 space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <PlaySquare className="w-4 h-4 cs-accent-text" />
            {t.settings.player}
          </h2>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-white">{t.settings.showClock}</p>
              <p className="text-xs text-slate-400">Display current local time in player top bar</p>
            </div>
            <input
              type="checkbox"
              checked={settings.showClockInPlayer}
              onChange={(e) => updateSettings({ showClockInPlayer: e.target.checked })}
              className="h-5 w-5 accent-[var(--cs-accent)] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-4 cursor-pointer pt-2 border-t cs-border">
            <div>
              <p className="text-sm font-semibold text-white">{t.settings.autoNext}</p>
              <p className="text-xs text-slate-400">Automatically advance to the next episode</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPlayNext}
              onChange={(e) => updateSettings({ autoPlayNext: e.target.checked })}
              className="h-5 w-5 accent-[var(--cs-accent)] rounded cursor-pointer"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t cs-border">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.settings.skipSeconds}: <span className="text-white">{settings.skipSeconds}s</span>
              </label>
              <select
                value={settings.skipSeconds}
                onChange={(e) => updateSettings({ skipSeconds: Number(e.target.value) })}
                className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-xs font-semibold text-white"
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.settings.introSkipSeconds}:{' '}
                <span className="text-white">{settings.introSkipSeconds}s</span>
              </label>
              <select
                value={settings.introSkipSeconds}
                onChange={(e) => updateSettings({ introSkipSeconds: Number(e.target.value) })}
                className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-xs font-semibold text-white"
              >
                <option value={60}>60 seconds</option>
                <option value={85}>85 seconds (Anime Standard)</option>
                <option value={90}>90 seconds</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.settings.subtitleSize}: <span className="text-white">{settings.subtitleSize}px</span>
              </label>
              <input
                type="range"
                min={14}
                max={30}
                value={settings.subtitleSize}
                onChange={(e) => updateSettings({ subtitleSize: Number(e.target.value) })}
                className="w-full accent-[var(--cs-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.settings.subtitleBg}:{' '}
                <span className="text-white">{Math.round(settings.subtitleBgOpacity * 100)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.subtitleBgOpacity}
                onChange={(e) => updateSettings({ subtitleBgOpacity: Number(e.target.value) })}
                className="w-full accent-[var(--cs-accent)]"
              />
            </div>
          </div>
        </section>

        {/* Backup & Restore (.csbackup style) */}
        <section className="rounded-2xl cs-bg-elevated border cs-border p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 cs-accent-text" />
            {t.settings.backup}
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={exportBackup}
              className="inline-flex items-center gap-2 rounded-xl cs-accent-bg px-4 py-2.5 text-xs font-bold text-white cs-accent-glow"
            >
              <Download className="w-4 h-4" />
              {t.settings.exportBackup}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl cs-surface cs-surface-hover border cs-border px-4 py-2.5 text-xs font-bold text-slate-200"
            >
              <Upload className="w-4 h-4" />
              {t.settings.importBackup}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileImport}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all AwiFlix settings, library, and extensions?')) {
                  resetAllData();
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 px-4 py-2.5 text-xs font-bold text-rose-400 transition ml-auto"
            >
              <RotateCcw className="w-4 h-4" />
              {t.settings.resetAll}
            </button>
          </div>
        </section>

        {/* Keyboard Shortcuts & About */}
        <section className="rounded-2xl cs-bg-elevated border cs-border p-5 space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Keyboard className="w-4 h-4 cs-accent-text" />
            {t.player.shortcuts}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              ['Space / K', 'Play / Pause'],
              ['← / →', 'Seek -/+'],
              ['↑ / ↓', 'Volume'],
              ['F', 'Fullscreen'],
              ['M', 'Mute'],
              ['L', 'Lock Controls'],
              ['N', 'Next Episode'],
              ['Esc', 'Close Player'],
            ].map(([key, desc]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl cs-surface border cs-border px-3 py-2"
              >
                <kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                  {key}
                </kbd>
                <span className="text-slate-400">{desc}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t cs-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 cs-accent-text shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-white">{t.settings.about} v1.0.0</h3>
                <p className="mt-0.5 text-xs text-slate-400 max-w-xl leading-relaxed">
                  {t.settings.aboutDesc}
                </p>
              </div>
            </div>
            <a
              href="https://github.com/recloudstream/cloudstream"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl cs-surface cs-surface-hover border cs-border px-4 py-2.5 text-xs font-bold text-white"
            >
              <Github className="w-4 h-4" />
              GitHub Repo
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
