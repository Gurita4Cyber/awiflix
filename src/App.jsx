import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { HomeView } from './views/HomeView';
import { SearchView } from './views/SearchView';
import { LibraryView } from './views/LibraryView';
import { DownloadsView } from './views/DownloadsView';
import { ExtensionsView } from './views/ExtensionsView';
import { SettingsView } from './views/SettingsView';
import { AdminPanelView } from './views/AdminPanelView';
import { LoginView } from './views/LoginView';
import { MediaDetailModal } from './components/MediaDetailModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { CheckCircle2, Info, AlertCircle, Loader2 } from 'lucide-react';

function CloudStreamShell() {
  const { currentUser, authLoading, activeTab, toast } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen cs-bg flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin cs-accent-text" />
        <p className="text-xs font-semibold">Menghubungkan ke database MySQL...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginView />
        {toast && (
          <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 rounded-2xl cs-bg-elevated border cs-border px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-cs-fade">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 cs-accent-text shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen cs-bg text-slate-100">
      <Navigation />

      {/* Main Content Area offset for Desktop Navigation Rail */}
      <main className="md:pl-[236px] min-h-screen">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'search' && <SearchView />}
        {activeTab === 'library' && <LibraryView />}
        {activeTab === 'downloads' && <DownloadsView />}
        {activeTab === 'extensions' && currentUser?.role === 'super_admin' && <ExtensionsView />}
        {activeTab === 'admin' && currentUser?.role === 'super_admin' && <AdminPanelView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Modals */}
      <MediaDetailModal />
      <VideoPlayerModal />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-[60] flex items-center gap-2.5 rounded-2xl cs-bg-elevated border cs-border px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-cs-fade">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 cs-accent-text shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <CloudStreamShell />
    </AppProvider>
  );
}
