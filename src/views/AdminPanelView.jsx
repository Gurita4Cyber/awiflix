import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Trash2,
  KeyRound,
  Power,
  RefreshCw,
  Database,
  Puzzle,
  Plus,
  X,
  Infinity as InfinityIcon,
  Film,
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

const DURATION_PRESETS = [
  { label: '1 Bulan', value: 1 },
  { label: '3 Bulan', value: 3 },
  { label: '6 Bulan', value: 6 },
  { label: '12 Bulan', value: 12 },
  { label: 'Unlimited', value: 0 },
];

export function AdminPanelView() {
  const { currentUser, allPlugins, syncFromDatabase, showToast } = useApp();

  const [adminTab, setAdminTab] = useState('users'); // 'users' | 'catalog'
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbMedia, setDbMedia] = useState([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaForm, setMediaForm] = useState({
    title: '',
    providerId: 'custom-streams',
    type: 'movie',
    year: new Date().getFullYear(),
    quality: '1080p',
    genres: 'Action, Adventure',
    poster: '',
    streamUrl: '',
    synopsis: '',
  });

  // Create Account Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'user',
    durationMonths: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  // Extend Duration Modal
  const [extendTarget, setExtendTarget] = useState(null);
  const [extendMonths, setExtendMonths] = useState(1);

  // Reset Password Modal
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [res, mediaRes] = await Promise.all([
        api.adminListUsers(),
        api.listDbMedia(),
      ]);
      setUsers(res.users || []);
      setStats(res.stats || null);
      setDbMedia(mediaRes.items || []);
    } catch (err) {
      showToast(err.message || 'Gagal memuat daftar akun', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleCreateMedia = async (e) => {
    e.preventDefault();
    try {
      await api.createDbMedia(mediaForm);
      showToast(`Film "${mediaForm.title}" disimpan ke MySQL!`, 'success');
      setMediaForm({
        title: '',
        providerId: allPlugins[0]?.id || 'custom-streams',
        type: 'movie',
        year: new Date().getFullYear(),
        quality: '1080p',
        genres: 'Action, Adventure',
        poster: '',
        streamUrl: '',
        synopsis: '',
      });
      setMediaModalOpen(false);
      await Promise.all([loadUsers(), syncFromDatabase()]);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteMedia = async (item) => {
    if (!window.confirm(`Hapus film "${item.title}" dari database MySQL?`)) return;
    try {
      await api.deleteDbMedia(item.id);
      showToast('Film dihapus dari MySQL.', 'info');
      await Promise.all([loadUsers(), syncFromDatabase()]);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.adminCreateUser({
        username: form.username.trim(),
        fullName: form.fullName.trim() || form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        durationMonths: form.role === 'super_admin' ? 0 : Number(form.durationMonths),
      });
      showToast(`Akun "${form.username}" berhasil dibuat di MySQL!`, 'success');
      setForm({
        username: '',
        fullName: '',
        email: '',
        password: '',
        role: 'user',
        durationMonths: 1,
      });
      setCreateOpen(false);
      await loadUsers();
    } catch (err) {
      showToast(err.message || 'Gagal membuat akun', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    if (!extendTarget) return;
    try {
      const months = Number(extendMonths);
      await api.adminExtendUser(
        extendTarget.id,
        months,
        months === 0 ? 'unlimited' : 'add'
      );
      showToast(
        months === 0
          ? `Akun "${extendTarget.username}" diubah ke Unlimited!`
          : `Masa aktif "${extendTarget.username}" diperpanjang +${months} bulan!`,
        'success'
      );
      setExtendTarget(null);
      await loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggle = async (u) => {
    try {
      await api.adminToggleUser(u.id);
      showToast(
        u.isActive ? `Akun "${u.username}" dinonaktifkan` : `Akun "${u.username}" diaktifkan`,
        'info'
      );
      await loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetPass = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      await api.adminResetPassword(resetTarget.id, newPassword);
      showToast(`Password "${resetTarget.username}" berhasil direset!`, 'success');
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Hapus permanen akun "${u.username}" beserta seluruh data ekstensinya di MySQL?`)) {
      return;
    }
    try {
      await api.adminDeleteUser(u.id);
      showToast(`Akun "${u.username}" dihapus dari database.`, 'info');
      await loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const formatDate = (str) => {
    if (!str) return 'Unlimited';
    const d = new Date(str.replace(' ', 'T'));
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="p-10 text-center text-slate-400">
        Hanya Super Admin yang dapat mengakses halaman ini.
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-7 pt-6 pb-24 md:pb-12 max-w-6xl mx-auto animate-cs-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 cs-accent-text" />
            Super Admin Panel
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Kelola akun pengguna, durasi langganan per bulan, dan pantau data di MySQL (`cloudstream_web`).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadUsers}
            className="inline-flex items-center gap-2 rounded-xl cs-surface cs-surface-hover border cs-border px-3.5 py-2.5 text-xs font-bold text-slate-200 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh DB
          </button>

          <button
            type="button"
            onClick={() => setMediaModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl cs-surface cs-surface-hover border cs-border px-3.5 py-2.5 text-xs font-bold text-slate-100 transition"
          >
            <Film className="w-4 h-4 text-cyan-400" />
            Tambah Film DB
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl cs-accent-bg px-4 py-2.5 text-xs font-bold text-white cs-accent-glow transition"
          >
            <UserPlus className="w-4 h-4" />
            Buat Akun Baru
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="rounded-2xl cs-bg-elevated border cs-border p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Akun</span>
              <Users className="w-4 h-4 cs-accent-text" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold text-white">
              {stats.totalUsers}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-400">
              {stats.activeUsers} aktif • {stats.expiredOrDisabledUsers} expired/nonaktif
            </p>
          </div>

          <div className="rounded-2xl cs-bg-elevated border cs-border p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Repositori di DB</span>
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold text-white">
              {stats.totalRepositories}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Tabel `repositories`</p>
          </div>

          <div className="rounded-2xl cs-bg-elevated border cs-border p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Ekstensi di DB</span>
              <Puzzle className="w-4 h-4 text-violet-400" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold text-white">
              {stats.totalExtensions}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Tabel `extensions`</p>
          </div>

          <div className="rounded-2xl cs-bg-elevated border cs-border p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Custom Stream / M3U</span>
              <CalendarClock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold text-white">
              {stats.totalCustomStreams}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Tabel `custom_streams`</p>
          </div>
        </div>
      )}

      {/* Admin Sub-Tabs */}
      <div className="flex items-center gap-2 mb-5">
        <button
          type="button"
          onClick={() => setAdminTab('users')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            adminTab === 'users'
              ? 'cs-accent-bg text-white shadow'
              : 'cs-surface text-slate-300 border cs-border'
          }`}
        >
          <Users className="w-4 h-4" />
          Akun &amp; Durasi ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('catalog')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            adminTab === 'catalog'
              ? 'cs-accent-bg text-white shadow'
              : 'cs-surface text-slate-300 border cs-border'
          }`}
        >
          <Film className="w-4 h-4" />
          Katalog Film MySQL ({dbMedia.length})
        </button>
      </div>

      {/* Accounts Table */}
      {adminTab === 'users' ? (
      <div className="rounded-2xl cs-bg-elevated border cs-border overflow-hidden shadow-xl">
        <div className="flex items-center justify-between border-b cs-border px-5 py-4">
          <h2 className="font-display text-base font-bold text-white">
            Daftar Akun & Masa Aktif
          </h2>
          <a
            href="http://localhost/phpmyadmin/index.php?route=/database/structure&db=cloudstream_web"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold cs-accent-text hover:underline"
          >
            Buka di phpMyAdmin →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b cs-border bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Akun</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Durasi & Expired</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Data DB</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-white text-sm">{u.username}</p>
                      <p className="text-slate-400">{u.fullName}</p>
                      {u.email && <p className="text-[10px] text-slate-500">{u.email}</p>}
                    </td>
                    <td className="px-4 py-4">
                      {u.role === 'super_admin' ? (
                        <span className="inline-flex items-center gap-1 rounded-full cs-accent-soft cs-accent-text px-2.5 py-0.5 text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3" /> SUPER ADMIN
                        </span>
                      ) : (
                        <span className="rounded-full cs-surface border cs-border px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                          USER
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {u.role === 'super_admin' || !u.expiresAt ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                          <InfinityIcon className="w-3.5 h-3.5" /> Unlimited
                        </span>
                      ) : (
                        <div>
                          <p className="font-semibold text-slate-200">
                            {u.durationMonths} Bulan ·{' '}
                            <span className={u.isExpired ? 'text-rose-400' : 'text-emerald-400'}>
                              {u.isExpired ? 'Habis' : `Sisa ${u.daysRemaining} hari`}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Exp: {formatDate(u.expiresAt)}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {!u.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold text-rose-400">
                          <XCircle className="w-3 h-3" /> Nonaktif
                        </span>
                      ) : u.isExpired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                          <CalendarClock className="w-3 h-3" /> Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      <span>{u.repoCount} repo</span> · <span>{u.pluginCount} ext</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.role !== 'super_admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setExtendTarget(u);
                              setExtendMonths(1);
                            }}
                            title="Perpanjang Durasi"
                            className="inline-flex items-center gap-1 rounded-lg cs-accent-soft cs-accent-text hover:opacity-90 px-2.5 py-1.5 text-[11px] font-bold transition"
                          >
                            <Plus className="w-3 h-3" /> Durasi
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(u);
                            setNewPassword('');
                          }}
                          title="Reset Password"
                          className="rounded-lg cs-surface cs-surface-hover border cs-border p-1.5 text-slate-300 hover:text-white"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        {!isSelf && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggle(u)}
                              title={u.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                              className={`rounded-lg border p-1.5 transition ${
                                u.isActive
                                  ? 'bg-amber-500/15 border-amber-500/25 text-amber-300'
                                  : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              title="Hapus Akun"
                              className="rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 p-1.5 text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
      <div className="rounded-2xl cs-bg-elevated border cs-border overflow-hidden shadow-xl">
        <div className="flex items-center justify-between border-b cs-border px-5 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              Katalog Film Tersimpan di MySQL (`media_items`)
            </h2>
            <p className="text-xs text-slate-400">
              Film yang ditambahkan di sini otomatis muncul &amp; bisa diputar oleh seluruh akun di Beranda/Search.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMediaModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl cs-accent-bg px-3.5 py-2 text-xs font-bold text-white shadow"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Film
          </button>
        </div>
        {dbMedia.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            Belum ada film manual di tabel <code className="text-slate-200">media_items</code>. Klik <strong>Tambah Film</strong> untuk menyimpan film MP4/HLS ke MySQL!
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {dbMedia.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-white/[0.02]">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{m.title}</p>
                  <p className="text-xs text-slate-400">
                    Provider: <code className="text-cyan-300">{m.provider_id}</code> · {m.media_type} · {m.year} · {m.quality}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteMedia(m)}
                  className="rounded-lg bg-rose-500/15 hover:bg-rose-500/25 p-2 text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Add Media to MySQL Modal */}
      {mediaModalOpen && (
        <div
          onClick={() => setMediaModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl cs-bg-elevated border cs-border p-6 shadow-2xl animate-cs-fade my-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 cs-accent-text" />
                Tambah Film / Channel ke MySQL
              </h3>
              <button
                type="button"
                onClick={() => setMediaModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-white cs-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMedia} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Film / Channel *</label>
                <input
                  type="text"
                  required
                  value={mediaForm.title}
                  onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })}
                  placeholder="cth: Sintel Director's Cut"
                  className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Provider / Ekstensi</label>
                  <select
                    value={mediaForm.providerId}
                    onChange={(e) => setMediaForm({ ...mediaForm, providerId: e.target.value })}
                    className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-xs text-white"
                  >
                    {allPlugins.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori</label>
                  <select
                    value={mediaForm.type}
                    onChange={(e) => setMediaForm({ ...mediaForm, type: e.target.value })}
                    className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-xs text-white"
                  >
                    <option value="movie">Movie</option>
                    <option value="series">TV Series</option>
                    <option value="anime">Anime</option>
                    <option value="documentary">Documentary</option>
                    <option value="live">Live HLS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL Stream (.m3u8 / .mp4) *</label>
                <input
                  type="url"
                  required
                  value={mediaForm.streamUrl}
                  onChange={(e) => setMediaForm({ ...mediaForm, streamUrl: e.target.value })}
                  placeholder="https://.../video.m3u8 atau https://.../video.mp4"
                  className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tahun</label>
                  <input
                    type="number"
                    value={mediaForm.year}
                    onChange={(e) => setMediaForm({ ...mediaForm, year: Number(e.target.value) })}
                    className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kualitas</label>
                  <input
                    type="text"
                    value={mediaForm.quality}
                    onChange={(e) => setMediaForm({ ...mediaForm, quality: e.target.value })}
                    className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Genre</label>
                  <input
                    type="text"
                    value={mediaForm.genres}
                    onChange={(e) => setMediaForm({ ...mediaForm, genres: e.target.value })}
                    className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL Poster (Opsional)</label>
                <input
                  type="url"
                  value={mediaForm.poster}
                  onChange={(e) => setMediaForm({ ...mediaForm, poster: e.target.value })}
                  placeholder="https://.../poster.jpg"
                  className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sinopsis</label>
                <textarea
                  rows={2}
                  value={mediaForm.synopsis}
                  onChange={(e) => setMediaForm({ ...mediaForm, synopsis: e.target.value })}
                  className="w-full rounded-xl cs-surface border cs-border p-2.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMediaModalOpen(false)}
                  className="rounded-xl cs-surface px-4 py-2 text-xs font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl cs-accent-bg px-5 py-2 text-xs font-bold text-white cs-accent-glow"
                >
                  Simpan Film ke MySQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {createOpen && (
        <div
          onClick={() => setCreateOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl cs-bg-elevated border cs-border p-6 shadow-2xl animate-cs-fade"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 cs-accent-text" />
                Buat Akun Baru
              </h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-white cs-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="budi_stream"
                    className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--cs-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Budi Santoso"
                    className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--cs-accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="budi@email.com"
                  className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--cs-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimal 4 karakter"
                    className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--cs-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full rounded-xl cs-surface border cs-border px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="user">User (Berlangganan)</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              {form.role !== 'super_admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Durasi Masa Aktif (Bulan)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DURATION_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm({ ...form, durationMonths: p.value })}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          Number(form.durationMonths) === p.value
                            ? 'cs-accent-bg text-white'
                            : 'cs-surface text-slate-300 border cs-border'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={form.durationMonths}
                      onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                      className="w-28 rounded-xl cs-surface border cs-border px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-[var(--cs-accent)]"
                    />
                    <span className="text-xs text-slate-400">
                      bulan (isi <code>0</code> untuk Unlimited)
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl cs-surface px-4 py-2 text-xs font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl cs-accent-bg px-5 py-2 text-xs font-bold text-white cs-accent-glow disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan ke MySQL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Subscription Modal */}
      {extendTarget && (
        <div
          onClick={() => setExtendTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl cs-bg-elevated border cs-border p-6 shadow-2xl animate-cs-fade"
          >
            <h3 className="font-display text-lg font-bold text-white mb-1">
              Perpanjang Durasi Akun
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Akun: <strong className="text-white">{extendTarget.username}</strong>
            </p>

            <form onSubmit={handleExtend} className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setExtendMonths(p.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      Number(extendMonths) === p.value
                        ? 'cs-accent-bg text-white'
                        : 'cs-surface text-slate-300 border cs-border'
                    }`}
                  >
                    {p.value === 0 ? 'Unlimited' : `+${p.label}`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={extendMonths}
                  onChange={(e) => setExtendMonths(e.target.value)}
                  className="w-28 rounded-xl cs-surface border cs-border px-3 py-2 text-sm font-bold text-white"
                />
                <span className="text-xs text-slate-400">bulan tambahan (0 = Unlimited)</span>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExtendTarget(null)}
                  className="rounded-xl cs-surface px-4 py-2 text-xs font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl cs-accent-bg px-5 py-2 text-xs font-bold text-white cs-accent-glow"
                >
                  Terapkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div
          onClick={() => setResetTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl cs-bg-elevated border cs-border p-6 shadow-2xl animate-cs-fade"
          >
            <h3 className="font-display text-lg font-bold text-white mb-1">
              Reset Password
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Akun: <strong className="text-white">{resetTarget.username}</strong>
            </p>
            <form onSubmit={handleResetPass} className="space-y-4">
              <input
                type="text"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password baru (min. 4 karakter)"
                className="w-full rounded-xl cs-surface border cs-border px-3.5 py-2.5 text-sm text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="rounded-xl cs-surface px-4 py-2 text-xs font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl cs-accent-bg px-5 py-2 text-xs font-bold text-white"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
