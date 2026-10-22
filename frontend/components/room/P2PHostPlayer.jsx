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
  Subtitles,
} from "lucide-react";
import { getSocket } from "../../lib/socket";
import useWebRTC from "../../hooks/useWebRTC";
import { convertSubtitleToVtt } from "../../lib/subtitles";

export default function P2PHostPlayer({ roomCode }) {
  const [file, setFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [subtitleContent, setSubtitleContent] = useState("");
  const [subtitleUrl, setSubtitleUrl] = useState("");
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleError, setSubtitleError] = useState("");

  const videoRef = useRef(null);
  const hiddenVideoRef = useRef(null); // drives the stream
  const containerRef = useRef(null);
  const controlsTimer = useRef(null);
  const fileInputRef = useRef(null);
  const subtitleInputRef = useRef(null);
  const subtitleContentRef = useRef("");
  const visibleVideoUrlRef = useRef(null);

  const {
    stream,
    connectionState,
    viewerCount,
    error: webRTCError,
    startHostStream,
  } = useWebRTC({ roomCode, isHost: true });

  // When file is selected, start streaming
  const handleFileSelect = async (e) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;

    const hadMovie = Boolean(file);
    if (!hadMovie) setFile(selected);

    try {
      const hiddenVideo = await startHostStream(selected);
      if (!hiddenVideo) {
        if (!hadMovie) setFile(null);
        return;
      }

      hiddenVideoRef.current = hiddenVideo;
      if (hadMovie) setFile(selected);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      subtitleContentRef.current = "";
      setSubtitleContent("");
      setSubtitleError("");
      getSocket().emit("p2p:subtitle", { roomCode, subtitleContent: "" });

      const nextVideoUrl = URL.createObjectURL(selected);
      const previousVideoUrl = visibleVideoUrlRef.current;
      visibleVideoUrlRef.current = nextVideoUrl;
      if (videoRef.current) {
        videoRef.current.src = nextVideoUrl;
        videoRef.current.load();
      }
      if (previousVideoUrl) URL.revokeObjectURL(previousVideoUrl);
    } catch (err) {
      if (!hadMovie) setFile(null);
      setSubtitleError(err.message || "Could not load the selected movie.");
    }
  };

  useEffect(
    () => () => {
      if (visibleVideoUrlRef.current) {
        URL.revokeObjectURL(visibleVideoUrlRef.current);
      }
    },
    [],
  );

  const handleSubtitleSelect = async (e) => {
    const subtitleFile = e.target.files?.[0];
    e.target.value = "";
    if (!subtitleFile) return;

    try {
      if (subtitleFile.size > 512 * 1024) {
        throw new Error("Subtitle files must be smaller than 512 KB.");
      }
      if (!/\.(srt|vtt)$/i.test(subtitleFile.name)) {
        throw new Error("Choose a .srt or .vtt subtitle file.");
      }

      const content = convertSubtitleToVtt(
        await subtitleFile.text(),
        subtitleFile.name,
      );
      subtitleContentRef.current = content;
      setSubtitleContent(content);
      setSubtitleError("");
      getSocket().emit("p2p:subtitle", { roomCode, subtitleContent: content });
    } catch (err) {
      setSubtitleError(err.message || "Could not load this subtitle file.");
    }
  };

  useEffect(() => {
    if (!subtitleContent) {
      setSubtitleUrl("");
      return;
    }

    const url = URL.createObjectURL(
      new Blob([subtitleContent], { type: "text/vtt" }),
    );
    setSubtitleUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [subtitleContent]);

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

  const seekTo = useCallback(
    (time) => {
      const socket = getSocket();
      const video = videoRef.current;
      const hidden = hiddenVideoRef.current;
      if (!video || !duration) return;

      const newTime = Math.max(0, Math.min(duration, time));

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

  useEffect(() => {
    const socket = getSocket();
    const onControlRequest = ({ type, currentTime: requestedTime }) => {
      if (type === "seek" && Number.isFinite(requestedTime)) {
        seekTo(requestedTime);
      } else if (type === "play") {
        handlePlay();
      } else if (type === "pause") {
        handlePause();
      }
    };
    const onViewerJoined = ({ viewerSocketId }) => {
      if (subtitleContentRef.current) {
        socket.emit("p2p:subtitle", {
          roomCode,
          subtitleContent: subtitleContentRef.current,
          viewerSocketId,
        });
      }
    };
    const onSubtitleRequest = ({ viewerSocketId }) => {
      onViewerJoined({ viewerSocketId });
    };

    socket.on("p2p:control_request", onControlRequest);
    socket.on("p2p:viewer_joined", onViewerJoined);
    socket.on("p2p:subtitle_request", onSubtitleRequest);
    return () => {
      socket.off("p2p:control_request", onControlRequest);
      socket.off("p2p:viewer_joined", onViewerJoined);
      socket.off("p2p:subtitle_request", onSubtitleRequest);
    };
  }, [handlePause, handlePlay, roomCode, seekTo]);

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
  }, [file]);

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

  const toggleSubtitles = () => {
    const nextEnabled = !subtitlesEnabled;
    for (const track of videoRef.current?.textTracks || []) {
      track.mode = nextEnabled ? "showing" : "hidden";
    }
    setSubtitlesEnabled(nextEnabled);
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

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (isPlaying) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
      ) {
        return;
      }

      const video = videoRef.current;
      if (!file || !video) return;

      switch (event.code) {
        case "ArrowLeft":
        case "ArrowRight": {
          event.preventDefault();
          const direction = event.code === "ArrowRight" ? 1 : -1;
          seekTo(video.currentTime + direction * (event.shiftKey ? 30 : 10));
          break;
        }
        case "Space":
          event.preventDefault();
          if (video.paused) handlePlay();
          else handlePause();
          break;
        case "ArrowUp":
        case "ArrowDown": {
          event.preventDefault();
          const nextVolume = Math.max(
            0,
            Math.min(
              1,
              video.volume + (event.code === "ArrowUp" ? 0.05 : -0.05),
            ),
          );
          video.volume = nextVolume;
          video.muted = nextVolume === 0;
          setVolume(nextVolume);
          setIsMuted(nextVolume === 0);
          break;
        }
        case "KeyM":
          video.muted = !video.muted;
          setIsMuted(video.muted);
          break;
        case "KeyF":
          if (!containerRef.current) break;
          if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
          } else {
            document.exitFullscreen();
            setIsFullscreen(false);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [file, handlePause, handlePlay, seekTo]);

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
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ml-3 flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-white transition hover:bg-gray-700"
          >
            <Upload className="h-3.5 w-3.5" />
            Change movie
          </button>
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
        >
          {subtitleUrl && (
            <track
              key={subtitleUrl}
              kind="subtitles"
              src={subtitleUrl}
              srcLang="en"
              label="Subtitles"
              default={subtitlesEnabled}
              onLoad={(event) => {
                event.currentTarget.track.mode = subtitlesEnabled
                  ? "showing"
                  : "hidden";
              }}
            />
          )}
        </video>

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
          {/* Seek bar */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seekTo(Number(event.target.value))}
            aria-label="Seek movie"
            disabled={!duration}
            className="w-full h-1.5 accent-red-500 cursor-pointer mb-4"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
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
                  aria-label={isMuted ? "Unmute" : "Mute"}
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
                  aria-label="Volume"
                  className="w-20 h-1 accent-red-500 cursor-pointer hidden sm:block"
                />
              </div>

              <span className="text-white text-xs font-mono">
                {formatTime(currentTime)}{" "}
                <span className="text-gray-500">/</span> {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <input
                ref={subtitleInputRef}
                type="file"
                accept=".srt,.vtt,text/vtt,application/x-subrip"
                onChange={handleSubtitleSelect}
                className="hidden"
              />
              <button
                onClick={() => subtitleInputRef.current?.click()}
                className="text-white hover:text-red-400 transition flex items-center gap-1"
                title="Add .srt or .vtt subtitles"
              >
                <Subtitles className="w-4 h-4" />
                <span className="text-xs hidden sm:inline">
                  {subtitleContent ? "Change subtitles" : "Add subtitles"}
                </span>
              </button>
              {subtitleUrl && (
                <button
                  onClick={toggleSubtitles}
                  aria-label={subtitlesEnabled ? "Hide subtitles" : "Show subtitles"}
                  title={subtitlesEnabled ? "Hide subtitles" : "Show subtitles"}
                  className={`transition ${
                    subtitlesEnabled ? "text-red-400" : "text-white"
                  }`}
                >
                  <Subtitles className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={toggleFullscreen}
                aria-label="Toggle fullscreen"
                className="text-white hover:text-red-400 transition"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
          {subtitleError && (
            <p role="alert" className="text-red-400 text-xs mt-2">
              {subtitleError}
            </p>
          )}
          <p className="text-gray-500 text-[11px] mt-2">
            Keys: ←/→ seek 10s (Shift: 30s), Space play/pause, ↑/↓ volume, M
            mute, F fullscreen
          </p>
        </div>
      </div>
    </div>
  );
}
