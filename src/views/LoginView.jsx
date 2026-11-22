import React, { useEffect, useState } from 'react';
import {
  Lock,
  User,
  LogIn,
  Database,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CloudStreamLogo } from '../components/Navigation';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export function LoginView() {
  const { login } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dbHealth, setDbHealth] = useState({ status: 'checking', info: '' });

  useEffect(() => {
    let active = true;
    api
      .health()
      .then((res) => {
        if (!active) return;
        setDbHealth({
          status: 'connected',
          info: `MySQL (${res.database}) • PHP ${res.phpVersion}`,
        });
      })
      .catch((err) => {
        if (!active) return;
        setDbHealth({
          status: 'error',
          info: err.message || 'Gagal terhubung ke PHP/MySQL server',
        });
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa username & password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen cs-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-blue-600/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md animate-cs-fade">
        <div className="flex justify-center mb-6">
          <CloudStreamLogo />
        </div>

        <div className="rounded-3xl cs-bg-elevated border cs-border p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-extrabold text-white">
              Masuk ke Akun
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Semua ekstensi, repositori, pustaka, dan riwayat tonton tersimpan otomatis di database MySQL.
            </p>
          </div>

          {/* Database Connection Status Badge */}
          <div
            className={`mb-5 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold border ${
              dbHealth.status === 'connected'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                : dbHealth.status === 'error'
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                : 'cs-surface text-slate-300 cs-border'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {dbHealth.status === 'connected'
                ? `Terhubung: ${dbHealth.info}`
                : dbHealth.status === 'error'
                ? dbHealth.info
                : 'Memeriksa koneksi database MySQL...'}
            </span>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-3 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username atau Email
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="superadmin"
                  className="w-full rounded-xl cs-surface border cs-border pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--cs-accent)] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl cs-surface border cs-border pl-10 pr-11 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--cs-accent)] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || dbHealth.status === 'error'}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl cs-accent-bg py-3 text-sm font-bold text-white cs-accent-glow transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Login
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Default Accounts */}
          <div className="mt-6 pt-5 border-t cs-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 cs-accent-text" />
              Akun Default (phpMyAdmin / MySQL)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsername('superadmin');
                  setPassword('admin123');
                }}
                className="rounded-xl cs-surface cs-surface-hover border cs-border p-2.5 text-left transition"
              >
                <p className="text-xs font-bold text-white">Super Admin</p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  superadmin / admin123
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('demo');
                  setPassword('demo123');
                }}
                className="rounded-xl cs-surface cs-surface-hover border cs-border p-2.5 text-left transition"
              >
                <p className="text-xs font-bold text-white">User (1 Bulan)</p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  demo / demo123
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
