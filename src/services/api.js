const TOKEN_KEY = 'cloudstream_auth_token';

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      res.ok
        ? 'Respons server bukan JSON valid.'
        : `Server PHP error (${res.status}). Pastikan PHP server & MySQL (Laragon) aktif.`
    );
  }

  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.expired = Boolean(data?.expired);
    throw err;
  }

  return data;
}

export const api = {
  // Auth & Health
  health: () => request('/api/auth.php?action=health'),
  login: (username, password) =>
    request('/api/auth.php?action=login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request('/api/auth.php?action=me'),
  logout: () => request('/api/auth.php?action=logout', { method: 'POST' }),

  // Full User State
  loadState: () => request('/api/state.php'),
  saveSettings: (settings) =>
    request('/api/state.php?action=settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    }),
  saveSearchHistory: (searchHistory) =>
    request('/api/state.php?action=search_history', {
      method: 'POST',
      body: JSON.stringify({ searchHistory }),
    }),
  resetWorkspace: () =>
    request('/api/state.php?action=reset', { method: 'POST' }),

  // Extensions, Repositories & Streams (MySQL persisted)
  fetchRemoteUrl: (url) =>
    request(`/api/extensions.php?action=fetch_url&url=${encodeURIComponent(url)}`),
  addRepo: (repo, autoInstallWeb = true) =>
    request('/api/extensions.php?action=add_repo', {
      method: 'POST',
      body: JSON.stringify({ repo, autoInstallWeb }),
    }),
  removeRepo: (repoId) =>
    request('/api/extensions.php?action=remove_repo', {
      method: 'POST',
      body: JSON.stringify({ repoId }),
    }),
  installPlugin: (pluginId) =>
    request('/api/extensions.php?action=install_plugin', {
      method: 'POST',
      body: JSON.stringify({ pluginId }),
    }),
  uninstallPlugin: (pluginId) =>
    request('/api/extensions.php?action=uninstall_plugin', {
      method: 'POST',
      body: JSON.stringify({ pluginId }),
    }),
  togglePlugin: (pluginId, enabled) =>
    request('/api/extensions.php?action=toggle_plugin', {
      method: 'POST',
      body: JSON.stringify({ pluginId, enabled }),
    }),
  addStreams: (items) =>
    request('/api/extensions.php?action=add_streams', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  deleteStream: (mediaId) =>
    request('/api/extensions.php?action=delete_stream', {
      method: 'POST',
      body: JSON.stringify({ mediaId }),
    }),

  // User Media Data (Library, Progress, Downloads)
  setLibrary: (mediaId, status) =>
    request('/api/user_data.php?action=library', {
      method: 'POST',
      body: JSON.stringify({ mediaId, status }),
    }),
  saveProgress: (payload) =>
    request('/api/user_data.php?action=progress', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeProgress: (mediaId) =>
    request('/api/user_data.php?action=remove_progress', {
      method: 'POST',
      body: JSON.stringify({ mediaId }),
    }),
  saveDownload: (item) =>
    request('/api/user_data.php?action=download_save', {
      method: 'POST',
      body: JSON.stringify({ item }),
    }),
  removeDownload: (id) =>
    request('/api/user_data.php?action=download_remove', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
  clearCompletedDownloads: () =>
    request('/api/user_data.php?action=download_clear_completed', {
      method: 'POST',
    }),

  // Super Admin Account Management
  adminListUsers: () => request('/api/admin.php?action=list'),
  adminCreateUser: (payload) =>
    request('/api/admin.php?action=create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminExtendUser: (userId, months, mode = 'add') =>
    request('/api/admin.php?action=extend', {
      method: 'POST',
      body: JSON.stringify({ userId, months, mode }),
    }),
  adminToggleUser: (userId) =>
    request('/api/admin.php?action=toggle', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  adminResetPassword: (userId, password) =>
    request('/api/admin.php?action=reset_password', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    }),
  adminDeleteUser: (userId) =>
    request(`/api/admin.php?action=delete&id=${userId}`, {
      method: 'DELETE',
    }),

  // PHP Web Provider Bridge & MySQL Media Catalog
  inspectCs3: (url) =>
    request(`/api/web_provider.php?action=inspect_cs3&url=${encodeURIComponent(url)}`),
  bindWebAdapter: (pluginId, adapter, config = {}) =>
    request('/api/web_provider.php?action=bind_web_adapter', {
      method: 'POST',
      body: JSON.stringify({ pluginId, adapter, config }),
    }),
  fetchProviderItems: (pluginId) =>
    request(
      `/api/web_provider.php?action=fetch_provider_items&pluginId=${encodeURIComponent(pluginId)}`
    ),
  resolveArchiveStream: (archiveId) =>
    request(
      `/api/web_provider.php?action=archive_stream&id=${encodeURIComponent(archiveId)}`
    ),
  resolveAnimeStream: (site, url) =>
    request(
      `/api/web_provider.php?action=resolve_anime_stream&site=${encodeURIComponent(
        site
      )}&url=${encodeURIComponent(url)}`
    ),
  fetchAnimeEpisodes: (site, url) =>
    request(
      `/api/web_provider.php?action=fetch_anime_episodes&site=${encodeURIComponent(
        site
      )}&url=${encodeURIComponent(url)}`
    ),
  listDbMedia: () => request('/api/web_provider.php?action=media_list'),
  createDbMedia: (payload) =>
    request('/api/web_provider.php?action=media_create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteDbMedia: (id) =>
    request(`/api/web_provider.php?action=media_delete&id=${id}`, {
      method: 'DELETE',
    }),
};
