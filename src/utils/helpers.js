export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatRemaining(currentTime, duration) {
  if (!duration || !Number.isFinite(duration)) return '';
  const left = Math.max(0, Math.round((duration - currentTime) / 60));
  if (left < 1) return '< 1m left';
  if (left >= 60) {
    const h = Math.floor(left / 60);
    const m = left % 60;
    return `${h}h ${m}m left`;
  }
  return `${left}m left`;
}

export function detectStreamType(url = '') {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.m3u8') || url.toLowerCase().includes('.m3u8')) return 'hls';
  if (clean.endsWith('.webm')) return 'webm';
  return 'mp4';
}

export function isDirectStreamUrl(text = '') {
  const trimmed = text.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return (
    trimmed.toLowerCase().includes('.m3u8') ||
    trimmed.toLowerCase().includes('.mp4') ||
    trimmed.toLowerCase().includes('.webm') ||
    trimmed.toLowerCase().includes('.mkv')
  );
}

/**
 * Parses standard #EXTM3U / #EXTINF playlists into CloudStream Web media items.
 */
export function parseM3UPlaylist(m3uText) {
  const lines = m3uText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  let pendingMeta = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const commaIdx = line.lastIndexOf(',');
      const title = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : 'Untitled Stream';
      pendingMeta = {
        title: title || 'Untitled Stream',
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch ? groupMatch[1] : 'Live',
      };
    } else if (!line.startsWith('#') && /^https?:\/\//i.test(line)) {
      const meta = pendingMeta || {
        title: `Custom Stream ${items.length + 1}`,
        logo: '',
        group: 'Custom',
      };
      const streamType = detectStreamType(line);
      items.push({
        id: `custom-${Date.now()}-${items.length}-${Math.random().toString(36).slice(2, 6)}`,
        providerId: 'custom-streams',
        title: meta.title,
        originalTitle: meta.group,
        type: streamType === 'hls' ? 'live' : 'movie',
        year: new Date().getFullYear(),
        rating: 8.0,
        duration: streamType === 'hls' ? 'LIVE / HLS' : 'Direct',
        status: streamType === 'hls' ? 'Live' : 'Released',
        quality: streamType === 'hls' ? 'HLS' : 'Direct',
        genres: [meta.group || 'Custom', streamType.toUpperCase()],
        director: 'User Imported',
        cast: ['M3U Playlist'],
        featured: false,
        poster: meta.logo || '',
        backdrop: meta.logo || '',
        accentGradient: 'from-violet-950 via-indigo-950 to-slate-950',
        synopsis: `Imported custom ${streamType.toUpperCase()} stream from #EXTM3U playlist.`,
        streams: [
          {
            id: `stream-${Date.now()}-${items.length}`,
            label: `Direct ${streamType.toUpperCase()}`,
            quality: streamType === 'hls' ? 'Auto HLS' : 'Original',
            type: streamType,
            url: line,
          },
        ],
      });
      pendingMeta = null;
    }
  }

  return items;
}

const CS3_STATUS_MAP = {
  0: 'down',
  1: 'active',
  2: 'slow',
  3: 'beta',
};

const CS3_COLORS = ['#3d63ff', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];

function hashColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CS3_COLORS[Math.abs(hash) % CS3_COLORS.length];
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function normalizeCloudStreamPlugin(raw, index = 0) {
  const url = String(raw.url || '');
  const isCs3 = url.toLowerCase().endsWith('.cs3') || (!raw.catalogUrl && !raw.m3uUrl && !Array.isArray(raw.items) && url.includes('.cs3'));
  const isWeb = Boolean(raw.catalogUrl || raw.m3uUrl || Array.isArray(raw.items) || raw.runtime === 'web');

  const rawLangs = Array.isArray(raw.languages)
    ? raw.languages
    : raw.language
    ? [raw.language]
    : ['MULTI'];

  const rawTypes = Array.isArray(raw.tvTypes) ? raw.tvTypes : [];
  const categories = [];
  rawTypes.forEach((t) => {
    const lower = String(t).toLowerCase();
    if (lower.includes('anime') || lower.includes('ova')) categories.push('anime');
    else if (lower.includes('movie')) categories.push('movie');
    else if (lower.includes('series') || lower.includes('drama')) categories.push('series');
    else if (lower.includes('live')) categories.push('live');
    else if (lower.includes('doc')) categories.push('documentary');
  });

  const name = raw.name || raw.internalName || `Plugin ${index + 1}`;
  const iconUrl = typeof raw.iconUrl === 'string'
    ? raw.iconUrl.replace(/%size%/g, '128')
    : '';

  return {
    id:
      raw.id ||
      `cs-${(raw.internalName || name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
    name,
    internalName: raw.internalName || name,
    version: raw.version !== undefined ? String(raw.version) : '1.0',
    language: rawLangs.map((l) => String(l).toUpperCase()).join(' / '),
    categories: categories.length ? Array.from(new Set(categories)) : ['movie', 'series'],
    tvTypes: rawTypes,
    status: typeof raw.status === 'number' ? CS3_STATUS_MAP[raw.status] || 'active' : raw.status || 'active',
    description:
      raw.description ||
      (isCs3
        ? `CloudStream Android (.cs3) plugin${raw.authors?.length ? ` by ${raw.authors.join(', ')}` : ''}.`
        : 'Web-compatible CloudStream provider.'),
    authors: Array.isArray(raw.authors) ? raw.authors : [],
    fileSize: raw.fileSize || 0,
    iconUrl,
    iconColor: raw.iconColor || hashColor(name),
    badge: isWeb ? 'WEB' : isCs3 ? 'CS3' : raw.badge || 'EXT',
    runtime: isWeb ? 'web' : isCs3 ? 'android-cs3' : 'web',
    url,
    catalogUrl: raw.catalogUrl || '',
    m3uUrl: raw.m3uUrl || '',
    inlineItems: Array.isArray(raw.items) ? raw.items : null,
  };
}

export function normalizeWebCatalogItem(raw, providerId, idx = 0) {
  const streams = Array.isArray(raw.streams) && raw.streams.length
    ? raw.streams.map((s, sIdx) => ({
        id: s.id || `s-${providerId}-${idx}-${sIdx}`,
        label: s.label || s.quality || `Mirror ${sIdx + 1}`,
        quality: s.quality || 'HD',
        type: s.type || detectStreamType(s.url || ''),
        url: s.url || '',
      }))
    : raw.url
    ? [
        {
          id: `s-${providerId}-${idx}-0`,
          label: raw.quality || 'Direct Stream',
          quality: raw.quality || 'HD',
          type: detectStreamType(raw.url),
          url: raw.url,
        },
      ]
    : [];

  return {
    id: raw.id || `web-${providerId}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    providerId,
    title: raw.title || `Untitled ${idx + 1}`,
    originalTitle: raw.originalTitle || '',
    type: raw.type || 'movie',
    year: raw.year || new Date().getFullYear(),
    rating: Number(raw.rating) || 8.0,
    duration: raw.duration || 'HD',
    status: raw.status || 'Released',
    quality: raw.quality || '1080p',
    genres: Array.isArray(raw.genres) && raw.genres.length ? raw.genres : ['Web Extension'],
    director: raw.director || '',
    cast: Array.isArray(raw.cast) ? raw.cast : [],
    featured: Boolean(raw.featured),
    poster: raw.poster || '',
    backdrop: raw.backdrop || raw.poster || '',
    accentGradient: raw.accentGradient || 'from-blue-950 via-slate-900 to-zinc-950',
    synopsis: raw.synopsis || raw.description || 'Loaded from external CloudStream Web extension.',
    streams,
    seasons: Array.isArray(raw.seasons) ? raw.seasons : undefined,
    subtitles: raw.subtitles || undefined,
  };
}

