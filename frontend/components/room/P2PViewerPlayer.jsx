"use client";

import { useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Maximize,
  Loader,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { getSocket } from "../../lib/socket";
import useWebRTC from "../../hooks/useWebRTC";

export default function P2PViewerPlayer({ roomCode }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const {
    stream,
    connectionState,
    error: webRTCError,
  } = useWebRTC({ roomCode, isHost: false });

  // When stream arrives attach it to the video element
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current
        .play()
        .catch((err) => console.warn("Autoplay blocked:", err.message));
    }
  }, [stream]);

  // Listen to host sync events
  useEffect(() => {
    const socket = getSocket();

    const onPlay = ({ currentTime: t }) => {
      const video = videoRef.current;
      if (!video) return;
      if (Math.abs(video.currentTime - t) > 1) {
        video.currentTime = t;
      }
      video.play().catch(() => {});
    };

    const onPause = ({ currentTime: t }) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = t;
      video.pause();
    };

    const onSeek = ({ currentTime: t }) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = t;
    };

    socket.on("p2p:play", onPlay);
    socket.on("p2p:pause", onPause);
    socket.on("p2p:seek", onSeek);

    return () => {
      socket.off("p2p:play", onPlay);
      socket.off("p2p:pause", onPause);
      socket.off("p2p:seek", onSeek);
    };
  }, []);

  // Video event listeners for display
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration || 0);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onDuration);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onDuration);
    };
  }, []);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
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
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Connecting state
  if (connectionState !== "connected") {
    return (
      <div
        className="relative w-full max-w-5xl mx-auto bg-black
                   rounded-xl overflow-hidden flex items-center
                   justify-center"
        style={{ aspectRatio: "16/9" }}
      >
        {webRTCError ? (
          <div className="text-center px-8">
            <WifiOff className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Stream ended</p>
            <p className="text-gray-400 text-sm">{webRTCError}</p>
          </div>
        ) : (
          <div className="text-center">
            <Loader
              className="w-8 h-8 text-red-500 animate-spin
                              mx-auto mb-3"
            />
            <p className="text-gray-400 text-sm">
              Connecting to host stream...
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Waiting for the host to start the movie
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div
        ref={containerRef}
        className="relative w-full bg-black rounded-xl overflow-hidden"
        style={{ aspectRatio: "16/9" }}
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          className="w-full h-full"
          style={{ objectFit: "contain", backgroundColor: "#000" }}
          playsInline
          autoPlay
        />

        {/* Viewer badge */}
        <div className="absolute top-4 left-4">
          <div
            className="bg-black/60 text-gray-400 text-xs
                          px-3 py-1.5 rounded-full backdrop-blur-sm"
          >
            Host controls playback
          </div>
        </div>

        {/* Controls (volume + fullscreen only — no play/pause for viewer) */}
        <div
          className={`
            absolute bottom-0 left-0 right-0
            bg-gradient-to-t from-black/90 to-transparent
            px-4 pb-4 pt-12 transition-opacity duration-300
            ${showControls ? "opacity-100" : "opacity-0"}
          `}
        >
          {/* Progress (read-only for viewer) */}
          <div className="w-full h-1.5 bg-white/20 rounded-full mb-4">
            <div
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
