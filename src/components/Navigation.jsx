import React from 'react';
import {
  Home,
  Search,
  Bookmark,
  Download,
  Puzzle,
  Settings,
  Globe,
  ShieldCheck,
  LogOut,
  CalendarClock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function CloudStreamLogo({ compact = false }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <img
        src="/awiflix-logo.png"
        alt="AwiFlix"
        className={
          compact
            ? 'h-7 w-auto object-contain drop-shadow-[0_2px_10px_rgba(229,9,20,0.35)]'
            : 'h-9 w-auto object-contain drop-shadow-[0_2px_12px_rgba(229,9,20,0.4)]'
        }
      />
    </div>
  );
}

export function Navigation() {
  const {
    t,
    currentUser,
    logout,
    activeTab,
    setActiveTab,
    downloads,
    enabledPlugins,
    settings,
    updateSettings,
  } = useApp();

  const activeDownloadsCount = downloads.filter((d) => d.status === 'downloading').length;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const navItems = [
    { id: 'home', label: t.nav.home, icon: Home },
    { id: 'search', label: t.nav.search, icon: Search },
    { id: 'library', label: t.nav.library, icon: Bookmark },
    {
      id: 'downloads',
      label: t.nav.downloads,
      icon: Download,
      badge: activeDownloadsCount > 0 ? activeDownloadsCount : null,
    },
    ...(isSuperAdmin
      ? [
          {
            id: 'extensions',
            label: t.nav.extensions,
            icon: Puzzle,
            badge: enabledPlugins.length,
          },
          { id: 'admin', label: 'Super Admin', icon: ShieldCheck, highlight: true },
        ]
      : []),
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <>
      {/* Desktop / Tablet Left Navigation Rail */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[236px] flex-col cs-bg-elevated border-r cs-border px-3.5 py-5">
        <div className="px-2 mb-6">
          <CloudStreamLogo />
        </div>

        {/* Logged-in User Card */}
        {currentUser && (
          <div className="mb-5 rounded-2xl cs-surface border cs-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{currentUser.fullName}</p>
                <p className="truncate text-[11px] text-slate-400">@{currentUser.username}</p>
              </div>
              {isSuperAdmin ? (
                <span className="shrink-0 rounded-md cs-accent-soft cs-accent-text px-1.5 py-0.5 text-[9px] font-extrabold">
                  ADMIN
                </span>
              ) : (
                <span className="shrink-0 rounded-md bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 text-[9px] font-bold">
                  USER
                </span>
              )}
            </div>
            <div className="mt-2 pt-2 border-t cs-border flex items-center gap-1.5 text-[10px] text-slate-400">
              <CalendarClock className="w-3 h-3 cs-accent-text shrink-0" />
              <span className="truncate">
                {isSuperAdmin || !currentUser.expiresAt
                  ? 'Masa aktif: Unlimited'
                  : `Sisa ${currentUser.daysRemaining} hari`}
              </span>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? 'cs-accent-bg text-white cs-accent-glow'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-amber-500/10'
                    : 'text-slate-400 hover:text-white cs-surface-hover'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`w-[18px] h-[18px] ${
                      active
                        ? 'text-white'
                        : item.highlight
                        ? 'text-amber-400'
                        : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  {item.label}
                </span>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'cs-surface text-slate-300 border cs-border'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Quick Controls: Language + Logout */}
        <div className="mt-4 pt-4 border-t cs-border space-y-2">
          <button
            type="button"
            onClick={() =>
              updateSettings({ language: settings.language === 'id' ? 'en' : 'id' })
            }
            className="flex w-full items-center justify-between rounded-xl cs-surface cs-surface-hover px-3 py-2 text-xs font-semibold text-slate-300 border cs-border transition-colors"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 cs-accent-text" />
              {settings.language === 'id' ? 'Bahasa Indonesia' : 'English'}
            </span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase">
              {settings.language}
            </span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-2 text-xs font-bold text-rose-300 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar / Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 cs-bg-elevated/95 backdrop-blur-xl border-t cs-border px-1 py-1.5">
        <div
          className={`grid gap-0.5 ${isSuperAdmin ? 'grid-cols-7' : 'grid-cols-5'}`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 transition-colors ${
                  active ? 'cs-accent-text' : 'text-slate-400'
                }`}
              >
                <div
                  className={`flex items-center justify-center rounded-full px-2.5 py-1 transition-all ${
                    active ? 'cs-accent-soft' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="mt-0.5 text-[9px] font-semibold truncate max-w-full px-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
