/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Crown,
  WifiOff,
  Loader,
  ShieldCheck,
} from "lucide-react";

const AD_NODE =
  /(^|[-_])(ad|ads|advert|advertise|preroll|midroll|overlay-ad|sponsor)([-_]|$)/i;

const AD_FRAME =
  /(doubleclick|googlesyndication|googleadservices|imasdk|adservice|amazon-adsystem|pubmatic|criteo|taboola|outbrain|exoclick|juicyads|propellerads|onclickads|adsterra|monetag)/i;

export default function VideoPlayer({
  videoUrl,
  subtitleUrl,
  isHost,
  syncEvent,
  onPlay,
  onPause,
  onSeek,
  onBuffering,
  onBufferingDone,
  bufferingUsers,
  blockAds = true,
}) {
  const frameRef = useRef(null);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const observers = useRef([]);
  const pollTimer = useRef(null);
  const controlsTimer = useRef(null);
  const isSyncing = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(null);
  const [canControl, setCanControl] = useState(false);
  const [bypass, setBypass] = useState(false);

  const src = videoUrl
    ? bypass
      ? videoUrl
      : `/api/player/proxy?url=${encodeURIComponent(videoUrl)}`
    : "";

  const findVideo = useCallback((doc, depth = 0) => {
    if (!doc || depth > 6) return null;

    const direct = doc.querySelector("video");
    if (direct) return direct;

    for (const frame of doc.querySelectorAll("iframe")) {
      let inner = null;
      try {
        inner = frame.contentDocument;
      } catch {
        continue;
      }
      const found = findVideo(inner, depth + 1);
      if (found) return found;
    }

    return null;
  }, []);

  const scrub = useCallback((doc) => {
    const kill = () => {
      doc.querySelectorAll("iframe").forEach((frame) => {
        if (AD_FRAME.test(frame.src)) frame.remove();
      });

      doc.querySelectorAll("div,section,aside,a,img").forEach((el) => {
        if (el.dataset.kept === "1") return;
        if (el.querySelector("video")) return;

        const tag = `${el.id} ${el.className}`;
        if (!AD_NODE.test(tag)) return;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        el.remove();
      });

      doc.querySelectorAll('[style*="z-index"]').forEach((el) => {
        if (el.querySelector("video")) return;
        const z = parseInt(el.style.zIndex || "0", 10);
        if (z >= 9990) el.remove();
      });
    };

    kill();

    const mo = new MutationObserver(kill);
    mo.observe(doc.documentElement, { childList: true, subtree: true });
    observers.current.push(mo);
  }, []);

  const attach = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) {
      setCanControl(false);
      return false;
    }

    const video = findVideo(doc);
    if (!video) return false;
    if (videoRef.current === video) return true;

    videoRef.current = video;
    setCanControl(true);

    const onTime = () => setCurrentTime(video.currentTime);
    const onDur = () => setDuration(video.duration || 0);
    const onPlayEvt = () => {
      setIsPlaying(true);
      setIsLoading(false);
      onBufferingDone?.();
    };
    const onPauseEvt = () => setIsPlaying(false);
    const onWait = () => {
      setIsLoading(true);
      onBuffering?.();
    };
    const onReady = () => {
      setIsLoading(false);
      setDuration(video.duration || 0);
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("durationchange", onDur);
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("playing", onPlayEvt);
    video.addEventListener("pause", onPauseEvt);
    video.addEventListener("waiting", onWait);
    video.addEventListener("ended", onPauseEvt);

    video.volume = volume;
    video.muted = isMuted;

    return true;
  }, [findVideo, onBuffering, onBufferingDone, volume, isMuted]);

  const handleFrameLoad = useCallback(() => {
    observers.current.forEach((o) => o.disconnect());
    observers.current = [];
    videoRef.current = null;
    setCanControl(false);
    setVideoError(null);
    setIsLoading(true);

    const doc = frameRef.current?.contentDocument;
    if (doc) scrub(doc);

    let tries = 0;
    clearInterval(pollTimer.current);
    pollTimer.current = setInterval(() => {
      tries += 1;
      if (attach() || tries > 40) clearInterval(pollTimer.current);
    }, 250);
  }, [attach, scrub]);

  useEffect(
    () => () => {
      clearInterval(pollTimer.current);
      clearTimeout(controlsTimer.current);
      observers.current.forEach((o) => o.disconnect());
    },
    [],
  );

  useEffect(() => {
    if (!syncEvent) return;

    const video = videoRef.current;
    if (!video) return;

    isSyncing.current = true;

    const { type, currentTime: t, serverTimestamp } = syncEvent;
    const latency = serverTimestamp ? (Date.now() - serverTimestamp) / 1000 : 0;
    const target = t + (type === "play" ? Math.min(latency, 2) : 0);

    if (type === "play") {
      video.currentTime = Math.max(0, target);
      video.play().catch(() => {});
    } else if (type === "pause") {
      video.pause();
      video.currentTime = Math.max(0, t);
    } else if (type === "seek") {
      video.currentTime = Math.max(0, target);
    }

    setTimeout(() => {
      isSyncing.current = false;
    }, 500);
  }, [syncEvent]);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!isHost || !video) return;

    if (video.paused) {
      video
        .play()
        .then(() => onPlay?.(video.currentTime))
        .catch(() => {});
    } else {
      video.pause();
      onPause?.(video.currentTime);
    }
  }, [isHost, onPlay, onPause]);

  const handleProgressClick = useCallback(
    (e) => {
      const video = videoRef.current;
      if (!isHost || !video || !duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      const next = pct * duration;

      video.currentTime = next;
      setCurrentTime(next);
      onSeek?.(next);
    },
    [isHost, duration, onSeek],
  );

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const next = !isMuted;
    if (videoRef.current) videoRef.current.muted = next;
    setIsMuted(next);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (isPlaying) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-xl overflow-hidden"
      style={{ aspectRatio: "16/9" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
    >
      <iframe
        key={src}
        ref={frameRef}
        src={src}
        title="Player"
        className="w-full h-full"
        style={{ border: 0 }}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={handleFrameLoad}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <Loader className="w-8 h-8 text-red-500 animate-spin" />
            <p className="text-white text-sm">Loading stream...</p>
          </div>
        </div>
      )}

      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
          <p className="text-red-400 font-semibold">Playback blocked</p>
          <p className="text-gray-400 text-sm">{videoError}</p>
          <button
            onClick={() => {
              setBypass(true);
              setVideoError(null);
            }}
            className="mt-2 text-xs px-3 py-1.5 rounded-full border border-white/20 text-white hover:bg-white/10"
          >
            Load without ad filter
          </button>
        </div>
      )}

      {bufferingUsers?.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black/80 text-white text-xs px-4 py-2 rounded-full flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
            Waiting for {bufferingUsers.map((u) => u.name).join(", ")}...
          </div>
        </div>
      )}

      {isHost && (
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <div className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
            <Crown className="w-3 h-3" />
            You control playback
          </div>
          {blockAds && !bypass && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
              <ShieldCheck className="w-3 h-3" />
              Ad shield
            </div>
          )}
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/40 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`relative w-full h-1.5 bg-white/20 rounded-full mb-4 transition-all duration-150 ${
            isHost && canControl ? "cursor-pointer hover:h-3" : "cursor-default"
          }`}
          onClick={handleProgressClick}
        >
          <div
            className="absolute left-0 top-0 h-full bg-red-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
          {isHost && canControl && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              disabled={!isHost || !canControl}
              className={`text-white transition-all ${
                isHost && canControl
                  ? "hover:text-red-400 hover:scale-110"
                  : "opacity-30 cursor-not-allowed"
              }`}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-red-400 transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolume}
                className="w-20 h-1 accent-red-500 cursor-pointer hidden sm:block"
              />
            </div>

            <span className="text-white text-xs font-mono hidden sm:block">
              {fmt(currentTime)} <span className="text-gray-500">/</span>{" "}
              {fmt(duration)}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-red-400 transition"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
