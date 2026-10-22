"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Users,
  Wifi,
  WifiOff,
  Film,
  AlertCircle,
} from "lucide-react";
import { getSocket } from "../../lib/socket";
import useWebRTC from "../../hooks/useWebRTC";

export default function P2PHostPlayer({ roomCode }) {
  const [file, setFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef(null);
  const hiddenVideoRef = useRef(null); // drives the stream
  const containerRef = useRef(null);
  const controlsTimer = useRef(null);
  const fileInputRef = useRef(null);

  const {
    stream,
    connectionState,
    viewerCount,
    error: webRTCError,
    startHostStream,
  } = useWebRTC({ roomCode, isHost: true });

  // When file is selected, start streaming
  const handleFileSelect = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);

    const hiddenVideo = await startHostStream(selected);
    hiddenVideoRef.current = hiddenVideo;

    // Also show in the visible player
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(selected);
    }
  };

  // Host play — both local video and broadcast to viewers
  const handlePlay = useCallback(() => {
    const socket = getSocket();
    const video = videoRef.current;
    const hidden = hiddenVideoRef.current;
    if (!video) return;

    video.play();
    if (hidden) hidden.play();

    setIsPlaying(true);
    socket.emit("p2p:play", {
      roomCode,
      currentTime: video.currentTime,
    });
  }, [roomCode]);

  const handlePause = useCallback(() => {
    const socket = getSocket();
    const video = videoRef.current;
    const hidden = hiddenVideoRef.current;
    if (!video) return;

    video.pause();
    if (hidden) hidden.pause();

    setIsPlaying(false);
    socket.emit("p2p:pause", {
      roomCode,
      currentTime: video.currentTime,
    });
  }, [roomCode]);

  const handleSeek = useCallback(
    (e) => {
      const socket = getSocket();
      const video = videoRef.current;
      const hidden = hiddenVideoRef.current;
      if (!video || !duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      const newTime = pct * duration;

      video.currentTime = newTime;
      if (hidden) hidden.currentTime = newTime;
      setCurrentTime(newTime);

      socket.emit("p2p:seek", {
        roomCode,
        currentTime: newTime,
      });
    },
    [roomCode, duration],
  );

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration || 0);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onDuration);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onDuration);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
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

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    }
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (isPlaying) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  // ─── FILE PICKER STATE ───
  if (!file) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div
          className="relative bg-gray-900 border-2 border-dashed
                     border-gray-700 hover:border-red-500/50
                     rounded-2xl transition"
          style={{ aspectRatio: "16/9" }}
        >
          <div
            className="absolute inset-0 flex flex-col
                          items-center justify-center gap-5"
          >
            <div
              className="w-16 h-16 bg-gray-800 rounded-2xl
                            flex items-center justify-center"
            >
              <Film className="w-8 h-8 text-gray-500" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg mb-1">
                Select a movie to stream
              </p>
              <p className="text-gray-500 text-sm">
                The file stays on your device. Friends receive a live stream —
                no uploading.
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-red-600
                         hover:bg-red-700 text-white font-semibold
                         px-6 py-3 rounded-xl transition"
            >
              <Upload className="w-4 h-4" />
              Choose Movie File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE PLAYER ───
  return (
    <div className="w-full max-w-5xl mx-auto space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {connectionState === "connected" ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-yellow-400" />
          )}
          <span className="text-gray-400 text-xs">
            {connectionState === "connected"
              ? `Streaming to ${viewerCount} viewer${viewerCount !== 1 ? "s" : ""}`
              : "Waiting for viewers to connect..."}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-500 text-xs">{viewerCount} connected</span>
        </div>
      </div>

      {webRTCError && (
        <div
          className="flex items-start gap-3 bg-red-500/10
                        border border-red-500/30 text-red-400
                        px-4 py-3 rounded-xl text-sm"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{webRTCError}</p>
        </div>
      )}

      {/* Video player */}
      <div
        ref={containerRef}
        className="relative w-full bg-black rounded-xl overflow-hidden"
        style={{ aspectRatio: "16/9" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <video
          ref={videoRef}
          className="w-full h-full"
          style={{ objectFit: "contain", backgroundColor: "#000" }}
          playsInline
          onClick={isPlaying ? handlePause : handlePlay}
        />

        {/* Host badge */}
        <div className="absolute top-4 left-4">
          <div
            className="bg-yellow-500/20 border border-yellow-500/40
                          text-yellow-400 text-xs px-3 py-1.5
                          rounded-full flex items-center gap-1.5"
          >
            You are streaming this file
          </div>
        </div>

        {/* Controls */}
        <div
          className={`
            absolute bottom-0 left-0 right-0
            bg-gradient-to-t from-black/90 to-transparent
            px-4 pb-4 pt-12 transition-opacity duration-300
            ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}
          `}
        >
          {/* Progress */}
          <div
            className="w-full h-1.5 bg-white/20 rounded-full
                       mb-4 cursor-pointer hover:h-3 transition-all"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                className="text-white hover:text-red-400 transition"
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
                  onChange={handleVolumeChange}
                  className="w-20 h-1 accent-red-500 cursor-pointer
                             hidden sm:block"
                />
              </div>

              <span className="text-white text-xs font-mono">
                {formatTime(currentTime)}{" "}
                <span className="text-gray-500">/</span> {formatTime(duration)}
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-red-400 transition"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
