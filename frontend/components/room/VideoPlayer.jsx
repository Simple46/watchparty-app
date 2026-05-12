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
} from "lucide-react";

export default function VideoPlayer({
  videoUrl,
  isHost,
  syncEvent,
  onPlay,
  onPause,
  onSeek,
  onBuffering,
  onBufferingDone,
  bufferingUsers,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const isSyncing = useRef(false);
  const controlsTimer = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(null);

  // ─── LOAD VIDEO ───
  // Direct MP4 from Cloudinary — no HLS.js needed
  // Just set the src directly on the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setVideoError(null);
    setIsPlaying(false);
    setCurrentTime(0);

    // Set source directly — browser handles MP4 natively
    video.src = videoUrl;
    video.load();

    return () => {
      video.pause();
      video.src = "";
    };
  }, [videoUrl]);

  // ─── VIDEO EVENT LISTENERS ───
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setIsLoading(false);
    };

    const onLoadedData = () => {
      setIsLoading(false);
    };

    const onCanPlay = () => {
      setIsLoading(false);
      onBufferingDone?.();
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const onWaiting = () => {
      setIsLoading(true);
      onBuffering?.();
    };

    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      onBufferingDone?.();
    };

    const onPauseEvent = () => {
      setIsPlaying(false);
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    const onError = () => {
      const err = video.error;
      let message = "Failed to load video";
      if (err) {
        switch (err.code) {
          case 1:
            message = "Video loading was aborted";
            break;
          case 2:
            message = "Network error while loading video";
            break;
          case 3:
            message = "Video decoding failed — format may not be supported";
            break;
          case 4:
            message = "Video format not supported by your browser";
            break;
        }
      }
      setVideoError(message);
      setIsLoading(false);
      console.error("Video error:", err);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPauseEvent);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPauseEvent);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
  }, [onBuffering, onBufferingDone]);

  // ─── HANDLE SYNC EVENTS FROM SOCKET ───
  useEffect(() => {
    if (!syncEvent || !videoRef.current) return;
    const video = videoRef.current;

    isSyncing.current = true;

    const { type, currentTime: syncTime, serverTimestamp } = syncEvent;

    const latency = serverTimestamp ? (Date.now() - serverTimestamp) / 1000 : 0;

    const compensatedTime =
      syncTime + (type === "play" ? Math.min(latency, 2) : 0);

    if (type === "play") {
      video.currentTime = Math.max(0, compensatedTime);
      video.play().catch((err) => {
        console.warn("Autoplay blocked:", err.message);
      });
    } else if (type === "pause") {
      video.pause();
      video.currentTime = Math.max(0, syncTime);
    } else if (type === "seek") {
      video.currentTime = Math.max(0, compensatedTime);
    }

    setTimeout(() => {
      isSyncing.current = false;
    }, 500);
  }, [syncEvent]);

  // ─── HOST PLAY/PAUSE ───
  const handlePlayPause = useCallback(() => {
    if (!isHost || !videoRef.current) return;
    const video = videoRef.current;

    if (video.paused) {
      video
        .play()
        .then(() => {
          onPlay?.(video.currentTime);
        })
        .catch(console.error);
    } else {
      video.pause();
      onPause?.(video.currentTime);
    }
  }, [isHost, onPlay, onPause]);

  // ─── HOST SEEK ───
  const handleProgressClick = useCallback(
    (e) => {
      if (!isHost || !videoRef.current || !duration) return;
      const video = videoRef.current;
      const rect = e.currentTarget.getBoundingClientRect();
      const percentage = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      const newTime = percentage * duration;

      video.currentTime = newTime;
      setCurrentTime(newTime);
      onSeek?.(newTime);
    },
    [isHost, duration, onSeek],
  );

  // ─── VOLUME ───
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  // ─── FULLSCREEN ───
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
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // ─── CONTROLS AUTO-HIDE ───
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (isPlaying) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  // ─── FORMAT TIME ───
  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-xl
                 overflow-hidden"
      style={{ aspectRatio: "16/9" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
    >
      {/* ─── THE VIDEO ELEMENT ─── */}
      {/* 
        width/height 100% + object-contain is critical
        Without this the video element has no size
        and you only hear audio
      */}
      <video
        ref={videoRef}
        className="w-full h-full"
        style={{
          display: "block",
          objectFit: "contain",
          backgroundColor: "#000",
        }}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        onClick={handlePlayPause}
      />

      {/* ─── LOADING SPINNER ─── */}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center
                        justify-center bg-black/50 pointer-events-none"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader className="w-8 h-8 text-red-500 animate-spin" />
            <p className="text-white text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {/* ─── ERROR STATE ─── */}
      {videoError && (
        <div
          className="absolute inset-0 flex items-center
                        justify-center bg-black/80"
        >
          <div className="text-center px-6">
            <p className="text-red-400 font-semibold mb-2">Video Error</p>
            <p className="text-gray-400 text-sm">{videoError}</p>
            <p className="text-gray-600 text-xs mt-3">
              Try refreshing the page
            </p>
          </div>
        </div>
      )}

      {/* ─── BUFFERING NOTICE ─── */}
      {bufferingUsers && bufferingUsers.length > 0 && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2
                        z-10"
        >
          <div
            className="bg-black/80 text-white text-xs px-4 py-2
                          rounded-full flex items-center gap-2"
          >
            <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
            Waiting for {bufferingUsers.map((u) => u.name).join(", ")}...
          </div>
        </div>
      )}

      {/* ─── HOST BADGE ─── */}
      {isHost && (
        <div className="absolute top-4 left-4 z-10">
          <div
            className="bg-yellow-500/20 border border-yellow-500/40
                          text-yellow-400 text-xs px-3 py-1.5
                          rounded-full flex items-center gap-1.5
                          backdrop-blur-sm"
          >
            <Crown className="w-3 h-3" />
            You control playback
          </div>
        </div>
      )}

      {/* ─── VIEWER BADGE ─── */}
      {!isHost && !isLoading && (
        <div
          className={`
            absolute top-4 left-4 z-10 transition-opacity duration-300
            ${showControls ? "opacity-100" : "opacity-0"}
          `}
        >
          <div
            className="bg-black/60 text-gray-400 text-xs
                          px-3 py-1.5 rounded-full backdrop-blur-sm"
          >
            Host controls playback
          </div>
        </div>
      )}

      {/* ─── CONTROLS OVERLAY ─── */}
      <div
        className={`
          absolute bottom-0 left-0 right-0 z-10
          bg-gradient-to-t from-black via-black/40 to-transparent
          px-4 pb-4 pt-12 transition-opacity duration-300
          ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}
        `}
      >
        {/* Progress bar */}
        <div
          className={`
            relative w-full h-1.5 bg-white/20 rounded-full mb-4
            transition-all duration-150
            ${isHost ? "cursor-pointer hover:h-3" : "cursor-default"}
          `}
          onClick={handleProgressClick}
        >
          {/* Filled progress */}
          <div
            className="absolute left-0 top-0 h-full bg-red-500
                       rounded-full"
            style={{ width: `${progress}%` }}
          />
          {/* Scrubber handle */}
          {isHost && (
            <div
              className="absolute top-1/2 -translate-y-1/2
                         w-3.5 h-3.5 bg-white rounded-full
                         shadow-lg pointer-events-none"
              style={{
                left: `calc(${progress}% - 7px)`,
              }}
            />
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              disabled={!isHost}
              title={
                isHost
                  ? isPlaying
                    ? "Pause"
                    : "Play"
                  : "Only host can control"
              }
              className={`
                text-white transition-all
                ${
                  isHost
                    ? "hover:text-red-400 hover:scale-110"
                    : "opacity-30 cursor-not-allowed"
                }
              `}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current" />
              )}
            </button>

            {/* Volume */}
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
                onChange={handleVolumeChange}
                className="w-20 h-1 accent-red-500 cursor-pointer
                           hidden sm:block"
              />
            </div>

            {/* Time */}
            <span
              className="text-white text-xs font-mono
                             hidden sm:block"
            >
              {formatTime(currentTime)} <span className="text-gray-500">/</span>{" "}
              {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-red-400 transition"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
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
