"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Maximize,
  Loader,
  WifiOff,
  Subtitles,
  Play,
  Pause,
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [subtitleUrl, setSubtitleUrl] = useState("");
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const subtitleUrlRef = useRef("");

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
    const onSubtitle = ({ subtitleContent: content }) => {
      if (!content) {
        if (subtitleUrlRef.current) {
          URL.revokeObjectURL(subtitleUrlRef.current);
          subtitleUrlRef.current = "";
        }
        setSubtitleUrl("");
        setSubtitlesEnabled(false);
        return;
      }
      const url = URL.createObjectURL(
        new Blob([content], { type: "text/vtt" }),
      );
      if (subtitleUrlRef.current) {
        URL.revokeObjectURL(subtitleUrlRef.current);
      }
      subtitleUrlRef.current = url;
      setSubtitleUrl(url);
      setSubtitlesEnabled(true);
    };

    const onPlay = ({ currentTime: t }) => {
      const video = videoRef.current;
      if (!video) return;
      if (Math.abs(video.currentTime - t) > 1) {
        video.currentTime = t;
      }
      video.play().catch(() => {});
      setIsPlaying(true);
    };

    const onPause = ({ currentTime: t }) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = t;
      video.pause();
      setIsPlaying(false);
    };

    const onSeek = ({ currentTime: t }) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = t;
    };

    socket.on("p2p:play", onPlay);
    socket.on("p2p:pause", onPause);
    socket.on("p2p:seek", onSeek);
    socket.on("p2p:subtitle", onSubtitle);
    socket.emit("p2p:subtitle_request", { roomCode });

    return () => {
      socket.off("p2p:play", onPlay);
      socket.off("p2p:pause", onPause);
      socket.off("p2p:seek", onSeek);
      socket.off("p2p:subtitle", onSubtitle);
    };
  }, [roomCode]);

  useEffect(
    () => () => {
      if (subtitleUrlRef.current) {
        URL.revokeObjectURL(subtitleUrlRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration || 0);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onDuration);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onDuration);
    };
  }, [connectionState]);

  const toggleSubtitles = () => {
    setSubtitlesEnabled((enabled) => !enabled);
  };

  const requestPlaybackControl = useCallback(
    (type, requestedTime) => {
      const socket = getSocket();
      const video = videoRef.current;
      if (type === "seek" && video && Number.isFinite(requestedTime)) {
        video.currentTime = Math.max(0, Math.min(duration, requestedTime));
      }
      socket.emit("p2p:control_request", {
        roomCode,
        type,
        currentTime: requestedTime,
      });
    },
    [duration, roomCode],
  );

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
      if (!video) return;

      switch (event.code) {
        case "ArrowLeft":
        case "ArrowRight": {
          event.preventDefault();
          const direction = event.code === "ArrowRight" ? 1 : -1;
          requestPlaybackControl(
            "seek",
            video.currentTime + direction * (event.shiftKey ? 30 : 10),
          );
          break;
        }
        case "Space":
          event.preventDefault();
          requestPlaybackControl(video.paused ? "play" : "pause");
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
          } else {
            document.exitFullscreen();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestPlaybackControl]);

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
        >
          {subtitleUrl && (
            <track
              key={`${subtitleUrl}-${subtitlesEnabled}`}
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

        {/* Viewer badge */}
        <div className="absolute top-4 left-4">
          <div
            className="bg-black/60 text-gray-400 text-xs
                          px-3 py-1.5 rounded-full backdrop-blur-sm"
          >
            Playback controls are shared with everyone
          </div>
        </div>

        {/* Playback requests are applied by the host and synced to everyone. */}
        <div
          className={`
            absolute bottom-0 left-0 right-0
            bg-gradient-to-t from-black/90 to-transparent
            px-4 pb-4 pt-12 transition-opacity duration-300
            ${showControls ? "opacity-100" : "opacity-0"}
          `}
        >
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) =>
              requestPlaybackControl("seek", Number(event.target.value))
            }
            aria-label="Seek movie"
            disabled={!duration}
            className="w-full h-1.5 accent-red-500 cursor-pointer mb-4"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  requestPlaybackControl(isPlaying ? "pause" : "play")
                }
                aria-label={isPlaying ? "Pause movie for everyone" : "Play movie for everyone"}
                className="text-white hover:text-red-400 transition"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
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
          <p className="text-gray-500 text-[11px] mt-2">
            Keys: ←/→ seek 10s (Shift: 30s), Space play/pause, ↑/↓ volume, M
            mute, F fullscreen
          </p>
        </div>
      </div>
    </div>
  );
}
