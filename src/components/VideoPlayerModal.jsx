import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  Lock,
  Unlock,
  SkipForward,
  PictureInPicture2,
  ListVideo,
  Sun,
  Loader2,
  Expand,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { formatTime } from '../utils/helpers';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const RESIZE_MODES = [
  { id: 'contain', label: 'Fit' },
  { id: 'cover', label: 'Fill / Zoom' },
  { id: 'fill', label: 'Stretch' },
];

export function VideoPlayerModal() {
  const {
    t,
    settings,
    playerSession,
    setPlayerSession,
    watchProgress,
    saveProgress,
    startPlayback,
  } = useApp();

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const lastSavedRef = useRef(0);

  const media = playerSession?.media || null;
  const episode = playerSession?.episode || null;
  const seasonNumber = playerSession?.seasonNumber || null;

  const streams = useMemo(() => {
    if (!media) return [];
    if (episode?.streams?.length) return episode.streams;
    return media.streams || [];
  }, [media, episode]);

  const [streamIdx, setStreamIdx] = useState(0);
  const [hlsLevels, setHlsLevels] = useState([]);
  const [selectedHlsLevel, setSelectedHlsLevel] = useState(-1); // -1 = Auto
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [streamError, setStreamError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [resizeIdx, setResizeIdx] = useState(0);
  const [subtitleLang, setSubtitleLang] = useState(settings.language === 'id' ? 'id' : 'en');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null); // null | 'quality' | 'subtitles' | 'speed' | 'episodes'
  const [clockText, setClockText] = useState('');
  const [seekFeedback, setSeekFeedback] = useState(null);

  const currentStream = streams[streamIdx] || streams[0] || null;
  const isEmbed = Boolean(
    currentStream &&
      (currentStream.type === 'embed' || currentStream.type === 'iframe')
  );

  // Compute next episode for Series
  const nextEpisodeInfo = useMemo(() => {
    if (!media?.seasons?.length || !episode) return null;
    for (let sIdx = 0; sIdx < media.seasons.length; sIdx++) {
      const s = media.seasons[sIdx];
      const epIdx = s.episodes.findIndex((e) => e.id === episode.id);
      if (epIdx !== -1) {
        if (epIdx + 1 < s.episodes.length) {
          return { episode: s.episodes[epIdx + 1], seasonNumber: s.seasonNumber };
        }
        if (sIdx + 1 < media.seasons.length && media.seasons[sIdx + 1].episodes.length > 0) {
          return {
            episode: media.seasons[sIdx + 1].episodes[0],
            seasonNumber: media.seasons[sIdx + 1].seasonNumber,
          };
        }
      }
    }
    return null;
  }, [media, episode]);

  // Reset per media/episode change
  useEffect(() => {
    setStreamIdx(0);
    setHlsLevels([]);
    setSelectedHlsLevel(-1);
    setStreamError('');
    setActiveMenu(null);
  }, [media?.id, episode?.id]);

  // Live clock in player (CloudStream signature feature)
  useEffect(() => {
    if (!media) return;
    const updateClock = () => {
      const now = new Date();
      setClockText(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, [media]);

  // Attach HLS.js or native MP4 stream
  useEffect(() => {
    const video = videoRef.current;
    if (!currentStream) return;

    if (currentStream.type === 'embed' || currentStream.type === 'iframe') {
      setIsBuffering(false);
      setStreamError('');
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    // On-demand resolving for anime scraper direct streams
    if (currentStream.type === 'scraper_direct' || !currentStream.url) {
      setIsBuffering(true);
      setStreamError('');
      let isSubscribed = true;
      api
        .resolveAnimeStream(
          currentStream.sourceSite || 'samehadaku',
          currentStream.sourceUrl
        )
        .then((res) => {
          if (!isSubscribed) return;
          if (res.streams && res.streams.length > 0) {
            const updatedEp = episode ? { ...episode, streams: res.streams } : null;
            const updatedMedia = {
              ...media,
              streams: res.streams,
              ...(media.seasons && updatedEp
                ? {
                    seasons: media.seasons.map((s) => ({
                      ...s,
                      episodes: s.episodes.map((e) => (e.id === updatedEp.id ? updatedEp : e)),
                    })),
                  }
                : {}),
            };
            setPlayerSession({
              media: updatedMedia,
              episode: updatedEp,
              seasonNumber,
            });
          } else {
            setStreamError('Tidak ada server video aktif yang ditemukan.');
            setIsBuffering(false);
          }
        })
        .catch((err) => {
          if (!isSubscribed) return;
          setStreamError(err.message || 'Gagal mengambil video dari server.');
          setIsBuffering(false);
        });

      return () => {
        isSubscribed = false;
      };
    }

    if (!video) return;

    setIsBuffering(true);
    setStreamError('');
    setHlsLevels([]);
    setSelectedHlsLevel(-1);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const saved = watchProgress[media.id];
    const shouldResume =
      saved &&
      saved.episodeId === (episode?.id || null) &&
      saved.currentTime > 5 &&
      saved.duration &&
      saved.currentTime < saved.duration - 10;

    const handleLoadedMeta = () => {
      if (shouldResume && video.duration && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(saved.currentTime, video.duration - 5);
      }
      video.playbackRate = playbackRate;
      video.play().catch(() => {});
    };

    const isHls =
      currentStream.type === 'hls' || currentStream.url.toLowerCase().includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(currentStream.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setHlsLevels(data.levels || []);
        handleLoadedMeta();
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setIsBuffering(false);
          setStreamError(
            'Stream failed to load (CORS or network error). Try switching source in Quality menu.'
          );
        }
      });
    } else {
      video.src = currentStream.url;
      video.addEventListener('loadedmetadata', handleLoadedMeta, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStream?.url, media?.id, episode?.id]);

  // Auto-hide controls after inactivity
  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (activeMenu) return;
      if (isEmbed) {
        setShowControls(false);
      } else if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3200);
  }, [activeMenu, isEmbed]);

  useEffect(() => {
    if (!media) return;
    bumpControls();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [media, bumpControls]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const flashSeek = (label) => {
    setSeekFeedback(label);
    setTimeout(() => setSeekFeedback(null), 700);
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    bumpControls();
  }, [bumpControls]);

  const seekBy = useCallback(
    (delta) => {
      const video = videoRef.current;
      if (!video) return;
      const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
      video.currentTime = target;
      setCurrentTime(target);
      flashSeek(delta > 0 ? `+${delta}s` : `${delta}s`);
      bumpControls();
    },
    [bumpControls]
  );

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    if (videoRef.current && media && videoRef.current.duration > 3) {
      saveProgress({
        mediaId: media.id,
        episodeId: episode?.id || null,
        seasonNumber,
        episodeNumber: episode?.number || null,
        currentTime: videoRef.current.currentTime,
        duration: videoRef.current.duration,
      });
    }
    setPlayerSession(null);
  }, [media, episode, seasonNumber, saveProgress, setPlayerSession]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!media) return;
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      if (key === 'escape') {
        if (activeMenu) setActiveMenu(null);
        else handleClose();
        return;
      }
      if (key === 'l') {
        setLocked((prev) => !prev);
        return;
      }
      if (locked) return;

      if (key === ' ' || key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (key === 'arrowright') {
        e.preventDefault();
        seekBy(settings.skipSeconds);
      } else if (key === 'arrowleft') {
        e.preventDefault();
        seekBy(-settings.skipSeconds);
      } else if (key === 'arrowup') {
        e.preventDefault();
        setVolume((v) => {
          const nv = Math.min(1, +(v + 0.1).toFixed(2));
          if (videoRef.current) videoRef.current.volume = nv;
          return nv;
        });
      } else if (key === 'arrowdown') {
        e.preventDefault();
        setVolume((v) => {
          const nv = Math.max(0, +(v - 0.1).toFixed(2));
          if (videoRef.current) videoRef.current.volume = nv;
          return nv;
        });
      } else if (key === 'f') {
        toggleFullscreen();
      } else if (key === 'm') {
        setMuted((m) => {
          if (videoRef.current) videoRef.current.muted = !m;
          return !m;
        });
      } else if (key === 'n' && nextEpisodeInfo) {
        startPlayback(media, nextEpisodeInfo.episode, nextEpisodeInfo.seasonNumber);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    media,
    locked,
    activeMenu,
    settings.skipSeconds,
    togglePlay,
    seekBy,
    toggleFullscreen,
    handleClose,
    nextEpisodeInfo,
    startPlayback,
  ]);

  // Active custom subtitle cue
  const activeSubtitleCue = useMemo(() => {
    if (!media?.subtitles || subtitleLang === 'off') return null;
    const cues = media.subtitles[subtitleLang] || [];
    return cues.find((c) => currentTime >= c.start && currentTime <= c.end) || null;
  }, [media, subtitleLang, currentTime]);

  if (!media) return null;

  const resizeMode = RESIZE_MODES[resizeIdx];
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={bumpControls}
      onClick={() => {
        if (activeMenu) setActiveMenu(null);
        else bumpControls();
      }}
      className="fixed inset-0 z-50 flex flex-col bg-black select-none overflow-hidden"
    >
      {/* Either Video Element or Web Player Iframe Embed */}
      {isEmbed ? (
        <div className="relative h-full w-full bg-black flex items-center justify-center">
          <iframe
            key={currentStream.url}
            src={currentStream.url}
            title={media.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="origin"
            allowFullScreen
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          playsInline
          style={{
            objectFit: resizeMode.id,
            filter: `brightness(${brightness})`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (locked) {
              bumpControls();
              return;
            }
            if (activeMenu) {
              setActiveMenu(null);
              return;
            }
            togglePlay();
          }}
          onDoubleClick={() => !locked && toggleFullscreen()}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setStreamError('');
          }}
          onCanPlay={() => setIsBuffering(false)}
          onError={() => {
            setIsBuffering(false);
            // Automatic failover to next stream/mirror if available
            if (streams.length > 1 && streamIdx + 1 < streams.length) {
              setStreamIdx((i) => i + 1);
              setStreamError('');
            } else {
              setStreamError('Gagal memutar video. Silakan pilih server lain di menu Kualitas.');
            }
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setCurrentTime(v.currentTime);
            if (Number.isFinite(v.duration)) setDuration(v.duration);
            if (v.buffered.length > 0) {
              setBuffered(v.buffered.end(v.buffered.length - 1));
            }

            // Save watch progress every 4 seconds
            const now = Date.now();
            if (now - lastSavedRef.current > 4000 && v.duration > 3) {
              lastSavedRef.current = now;
              saveProgress({
                mediaId: media.id,
                episodeId: episode?.id || null,
                seasonNumber,
                episodeNumber: episode?.number || null,
                currentTime: v.currentTime,
                duration: v.duration,
              });
            }
          }}
          onEnded={() => {
            if (settings.autoPlayNext && nextEpisodeInfo) {
              startPlayback(media, nextEpisodeInfo.episode, nextEpisodeInfo.seasonNumber);
            }
          }}
          className="h-full w-full transition-[filter] duration-150"
        />
      )}

      {/* Buffering Spinner */}
      {isBuffering && !streamError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-black/60 backdrop-blur-md px-5 py-4">
            <Loader2 className="w-9 h-9 animate-spin cs-accent-text" />
            <span className="text-xs font-semibold text-slate-200">Buffering stream...</span>
          </div>
        </div>
      )}

      {/* Stream Error Overlay */}
      {streamError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4">
          <div className="max-w-md rounded-2xl cs-bg-elevated border cs-border p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-white mb-1">Playback Error</p>
            <p className="text-xs text-slate-400 mb-4">{streamError}</p>
            <div className="flex justify-center gap-2">
              {streams.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStreamIdx((i) => (i + 1) % streams.length);
                  }}
                  className="rounded-xl cs-accent-bg px-4 py-2 text-xs font-bold text-white"
                >
                  Switch Mirror
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl cs-surface px-4 py-2 text-xs font-semibold text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seek Feedback Pill */}
      {seekFeedback && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl bg-black/75 backdrop-blur-md px-5 py-2.5 text-lg font-extrabold text-white border border-white/15">
            {seekFeedback}
          </div>
        </div>
      )}

      {/* Custom CloudStream Subtitle Overlay */}
      {activeSubtitleCue && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-6 transition-all duration-200 ${
            showControls && !locked ? 'bottom-28 sm:bottom-32' : 'bottom-8 sm:bottom-12'
          }`}
        >
          <span
            className="max-w-3xl rounded-lg px-3.5 py-1.5 text-center font-semibold text-white leading-snug shadow-lg"
            style={{
              fontSize: `${settings.subtitleSize}px`,
              backgroundColor: `rgba(0, 0, 0, ${settings.subtitleBgOpacity})`,
              textShadow: '0 2px 4px rgba(0,0,0,0.9)',
            }}
          >
            {activeSubtitleCue.text}
          </span>
        </div>
      )}

      {/* Locked State Floating Unlock Button */}
      {locked && (
        <div
          className={`absolute top-5 right-5 z-30 transition-opacity duration-200 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLocked(false);
            }}
            className="inline-flex items-center gap-2 rounded-full cs-accent-bg px-4 py-2 text-xs font-bold text-white shadow-xl"
          >
            <Unlock className="w-4 h-4" />
            {t.player.unlock}
          </button>
        </div>
      )}

      {/* 1. EMBED MODE FLOATING HEADER (Auto-hides, leaves seeker completely unblocked!) */}
      {isEmbed && !locked && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-0 inset-x-0 z-40 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/90 via-black/45 to-transparent transition-opacity duration-300 ${
            showControls || activeMenu
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate font-display text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                {media.title}
                <span className="hidden sm:inline-flex rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold">
                  {currentStream?.label || 'Server Asli'}
                </span>
              </h2>
              <p className="truncate text-[11px] text-slate-300">
                {episode
                  ? `S${seasonNumber}:E${episode.number} · ${episode.title}`
                  : 'Gunakan kontrol video & timeline seeker di player asli'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {media?.seasons?.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveMenu((m) => (m === 'episodes' ? null : 'episodes'))}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition border border-white/15 backdrop-blur-md ${
                  activeMenu === 'episodes'
                    ? 'cs-accent-bg text-white'
                    : 'bg-black/60 hover:bg-black/80 text-white'
                }`}
              >
                <ListVideo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Episode</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveMenu((m) => (m === 'quality' ? null : 'quality'))}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition shadow-lg ${
                activeMenu === 'quality'
                  ? 'cs-accent-bg text-white'
                  : 'cs-surface cs-surface-hover border cs-border text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Ganti Server</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* 2. NATIVE VIDEO MODE FULL CONTROLS (Only rendered when NOT in embed mode) */}
      {!isEmbed && !locked && (
        <div
          className={`pointer-events-none absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-b from-black/80 via-transparent to-black/90 transition-opacity duration-200 ${
            showControls || !isPlaying || activeMenu ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* TOP BAR */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 sm:px-6 pt-4 pb-6"
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className="truncate font-display text-sm sm:text-base font-bold text-white">
                  {media.title}
                </h2>
                <p className="truncate text-xs text-slate-300">
                  {episode
                    ? `S${seasonNumber}:E${episode.number} · ${episode.title}`
                    : currentStream?.label}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {settings.showClockInPlayer && clockText && (
                <span className="hidden sm:inline-block rounded-lg bg-black/45 px-2.5 py-1 font-mono text-xs font-bold text-slate-200 border border-white/10">
                  {clockText}
                </span>
              )}

              {/* Brightness Control */}
              <div className="hidden md:flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 border border-white/10">
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <input
                  type="range"
                  min={0.4}
                  max={1.4}
                  step={0.05}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  title={t.player.brightness}
                  className="cs-range w-16"
                />
              </div>

              <button
                type="button"
                onClick={() => setLocked(true)}
                title={t.player.lock}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CENTER PLAY / SKIP CONTROLS */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto flex items-center justify-center gap-7 sm:gap-12"
          >
            <button
              type="button"
              onClick={() => seekBy(-settings.skipSeconds)}
              className="flex flex-col items-center gap-1 rounded-full bg-black/45 hover:bg-black/70 p-3.5 text-white border border-white/10 transition active:scale-90"
            >
              <RotateCcw className="w-6 h-6" />
              <span className="text-[10px] font-bold">-{settings.skipSeconds}s</span>
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full cs-accent-bg text-white cs-accent-glow shadow-2xl transition active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 sm:w-9 sm:h-9 fill-white" />
              ) : (
                <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-white ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seekBy(settings.skipSeconds)}
              className="flex flex-col items-center gap-1 rounded-full bg-black/45 hover:bg-black/70 p-3.5 text-white border border-white/10 transition active:scale-90"
            >
              <RotateCw className="w-6 h-6" />
              <span className="text-[10px] font-bold">+{settings.skipSeconds}s</span>
            </button>
          </div>

          {/* BOTTOM BAR */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto px-4 sm:px-6 pb-4 pt-6 space-y-3"
          >
            {/* Skip Intro & Next Episode Quick Pills */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => seekBy(settings.introSkipSeconds)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white border border-white/15 transition"
              >
                <SkipForward className="w-3.5 h-3.5" />
                +{settings.introSkipSeconds}s Intro
              </button>

              {nextEpisodeInfo && (
                <button
                  type="button"
                  onClick={() =>
                    startPlayback(media, nextEpisodeInfo.episode, nextEpisodeInfo.seasonNumber)
                  }
                  className="inline-flex items-center gap-1.5 rounded-full cs-accent-bg px-3.5 py-1.5 text-xs font-bold text-white shadow transition"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  {t.player.nextEpisode} (E{nextEpisodeInfo.episode.number})
                </button>
              )}
            </div>

            {/* Seek Timeline */}
            <div className="flex items-center gap-3">
              <span className="w-12 text-right font-mono text-xs font-semibold text-slate-200">
                {formatTime(currentTime)}
              </span>

              <div className="relative flex-1 flex items-center h-5">
                <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white/35 transition-all"
                    style={{ width: `${Math.min(100, bufferedPct)}%` }}
                  />
                </div>
                <div
                  className="pointer-events-none absolute left-0 h-1.5 rounded-full cs-accent-bg"
                  style={{ width: `${Math.min(100, progressPct)}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onInput={(e) => {
                    const val = Number(e.target.value);
                    if (videoRef.current) videoRef.current.currentTime = val;
                    setCurrentTime(val);
                  }}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (videoRef.current) videoRef.current.currentTime = val;
                    setCurrentTime(val);
                  }}
                  className="cs-range absolute inset-0 w-full opacity-90"
                />
              </div>

              <span className="w-12 font-mono text-xs font-semibold text-slate-300">
                {formatTime(duration)}
              </span>
            </div>

            {/* Bottom Action Buttons (CloudStream Style) */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left: Volume */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextMuted = !muted;
                    setMuted(nextMuted);
                    if (videoRef.current) videoRef.current.muted = nextMuted;
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 text-white transition"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    setMuted(v === 0);
                    if (videoRef.current) {
                      videoRef.current.volume = v;
                      videoRef.current.muted = v === 0;
                    }
                  }}
                  className="cs-range hidden sm:block w-24"
                />
              </div>

              {/* Right: CloudStream Feature Buttons */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                {media.seasons?.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMenu((m) => (m === 'episodes' ? null : 'episodes'))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                      activeMenu === 'episodes'
                        ? 'cs-accent-bg text-white'
                        : 'hover:bg-white/15 text-slate-200'
                    }`}
                  >
                    <ListVideo className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.player.episodes}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveMenu((m) => (m === 'speed' ? null : 'speed'))}
                  className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                    activeMenu === 'speed'
                      ? 'cs-accent-bg text-white'
                      : 'hover:bg-white/15 text-slate-200'
                  }`}
                >
                  {playbackRate}x
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveMenu((m) => (m === 'subtitles' ? null : 'subtitles'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                    activeMenu === 'subtitles' || subtitleLang !== 'off'
                      ? 'cs-accent-soft cs-accent-text'
                      : 'hover:bg-white/15 text-slate-200'
                  }`}
                >
                  <Subtitles className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.player.subtitles}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMenu((m) => (m === 'quality' ? null : 'quality'))}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                    activeMenu === 'quality'
                      ? 'cs-accent-bg text-white'
                      : 'hover:bg-white/15 text-slate-200'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.player.quality}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (resizeIdx + 1) % RESIZE_MODES.length;
                    setResizeIdx(nextIdx);
                    flashSeek(RESIZE_MODES[nextIdx].label);
                  }}
                  title={`${t.player.resize}: ${resizeMode.label}`}
                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/15 transition"
                >
                  <Expand className="w-4 h-4" />
                  <span className="hidden md:inline">{resizeMode.label}</span>
                </button>

                {document.pictureInPictureEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      if (document.pictureInPictureElement) {
                        document.exitPictureInPicture?.().catch(() => {});
                      } else {
                        videoRef.current?.requestPictureInPicture?.().catch(() => {});
                      }
                    }}
                    title="Picture-in-Picture"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-200 hover:bg-white/15 transition"
                  >
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title="Fullscreen"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white hover:bg-white/15 transition"
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPOVER MENUS (Quality / Subtitles / Speed / Episodes) */}
      {activeMenu && !locked && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${
            isEmbed ? 'top-16 right-4 sm:right-6' : 'bottom-24 right-4 sm:right-6'
          } z-50 w-72 max-h-[60vh] overflow-y-auto rounded-2xl cs-bg-elevated/95 backdrop-blur-xl border cs-border p-4 shadow-2xl animate-cs-fade`}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b cs-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {activeMenu === 'quality'
                ? t.player.quality
                : activeMenu === 'subtitles'
                ? t.player.subtitles
                : activeMenu === 'speed'
                ? t.player.speed
                : t.player.episodes}
            </h4>
            <button
              type="button"
              onClick={() => setActiveMenu(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quality & Source Menu */}
          {activeMenu === 'quality' && (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                  Stream Mirrors
                </p>
                <div className="space-y-1">
                  {streams.map((st, idx) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setStreamIdx(idx);
                        setActiveMenu(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        idx === streamIdx
                          ? 'cs-accent-bg text-white'
                          : 'cs-surface cs-surface-hover text-slate-200'
                      }`}
                    >
                      <span className="truncate">{st.label}</span>
                      {idx === streamIdx && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {hlsLevels.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                    HLS Adaptive Resolution
                  </p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (hlsRef.current) hlsRef.current.currentLevel = -1;
                        setSelectedHlsLevel(-1);
                        setActiveMenu(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                        selectedHlsLevel === -1
                          ? 'cs-accent-bg text-white'
                          : 'cs-surface cs-surface-hover text-slate-200'
                      }`}
                    >
                      <span>{t.player.autoQuality}</span>
                      {selectedHlsLevel === -1 && <Check className="w-3.5 h-3.5" />}
                    </button>
                    {hlsLevels.map((lvl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (hlsRef.current) hlsRef.current.currentLevel = idx;
                          setSelectedHlsLevel(idx);
                          setActiveMenu(null);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                          selectedHlsLevel === idx
                            ? 'cs-accent-bg text-white'
                            : 'cs-surface cs-surface-hover text-slate-200'
                        }`}
                      >
                        <span>
                          {lvl.height ? `${lvl.height}p` : `Track ${idx + 1}`}{' '}
                          {lvl.bitrate ? `(${Math.round(lvl.bitrate / 1000)} kbps)` : ''}
                        </span>
                        {selectedHlsLevel === idx && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtitles Menu */}
          {activeMenu === 'subtitles' && (
            <div className="space-y-1">
              {[
                { id: 'off', label: t.player.subOff },
                { id: 'id', label: 'Bahasa Indonesia (CC)' },
                { id: 'en', label: 'English (CC)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSubtitleLang(opt.id);
                    setActiveMenu(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                    subtitleLang === opt.id
                      ? 'cs-accent-bg text-white'
                      : 'cs-surface cs-surface-hover text-slate-200'
                  }`}
                >
                  <span>{opt.label}</span>
                  {subtitleLang === opt.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}

          {/* Speed Menu */}
          {activeMenu === 'speed' && (
            <div className="grid grid-cols-3 gap-1.5">
              {SPEEDS.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => {
                    setPlaybackRate(sp);
                    if (videoRef.current) videoRef.current.playbackRate = sp;
                    setActiveMenu(null);
                  }}
                  className={`rounded-xl py-2 text-xs font-bold ${
                    playbackRate === sp
                      ? 'cs-accent-bg text-white'
                      : 'cs-surface cs-surface-hover text-slate-200'
                  }`}
                >
                  {sp}x
                </button>
              ))}
            </div>
          )}

          {/* Episodes Drawer Menu */}
          {activeMenu === 'episodes' && media.seasons && (
            <div className="space-y-3">
              {media.seasons.map((s) => (
                <div key={s.seasonNumber}>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                    {t.detail.season} {s.seasonNumber}
                  </p>
                  <div className="space-y-1">
                    {s.episodes.map((ep) => {
                      const active = ep.id === episode?.id;
                      return (
                        <button
                          key={ep.id}
                          type="button"
                          onClick={() => {
                            startPlayback(media, ep, s.seasonNumber);
                            setActiveMenu(null);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                            active
                              ? 'cs-accent-bg text-white'
                              : 'cs-surface cs-surface-hover text-slate-200'
                          }`}
                        >
                          <span className="truncate">
                            E{ep.number}. {ep.title}
                          </span>
                          <span className="ml-2 text-[10px] opacity-75 shrink-0">
                            {ep.duration}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
