"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import ProtectedRoute from "../../../../components/ProtectedRoute";
// import api from "../../../../lib/api";

function WatchMatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const streamUrl = searchParams.get("stream");
  const homeTeam = searchParams.get("home") || "Home";
  const awayTeam = searchParams.get("away") || "Away";
  const score = searchParams.get("score") || "0 - 0";
  const league = searchParams.get("league") || "Football";

  const [videoError, setVideoError] = useState(null);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const decodedUrl = decodeURIComponent(streamUrl);
    const video = videoRef.current;

    const loadStream = async () => {
      try {
        // Check if native HLS supported (Safari)
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = decodedUrl;
          return;
        }

        // Use HLS.js for other browsers
        const Hls = (await import("hls.js")).default;

        if (Hls.isSupported()) {
          if (hlsRef.current) hlsRef.current.destroy();

          const hls = new Hls({
            maxBufferLength: 30,
            enableWorker: true,
          });

          hlsRef.current = hls;
          hls.loadSource(decodedUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              console.error("HLS error:", data);
              setVideoError(
                "Stream failed to load. The match may have ended or the stream is unavailable.",
              );
            }
          });
        } else {
          // Direct fallback
          video.src = decodedUrl;
        }
      } catch (err) {
        console.error("Stream load error:", err);
        setVideoError("Failed to load stream.");
      }
    };

    loadStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  if (!streamUrl) {
    return (
      <div
        className="min-h-screen bg-gray-950 flex items-center
                      justify-center"
      >
        <div className="text-center">
          <p className="text-white font-medium mb-3">Stream not available</p>
          <button
            onClick={() => router.push("/football")}
            className="text-red-400 text-sm hover:text-red-300"
          >
            Back to matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div
        className="flex items-center gap-4 px-4 py-3
                      bg-gray-900 border-b border-gray-800"
      >
        <button
          onClick={() => router.push("/football")}
          className="text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">
            {homeTeam} vs {awayTeam}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <div
              className="w-1.5 h-1.5 bg-red-500 rounded-full
                            animate-pulse"
            />
            <span className="text-red-400 text-xs font-medium">LIVE</span>
            <span className="text-gray-600 text-xs">·</span>
            <span
              className="text-white text-xs font-bold
                             tabular-nums"
            >
              {score}
            </span>
            <span className="text-gray-600 text-xs">·</span>
            <span className="text-gray-500 text-xs truncate">{league}</span>
          </div>
        </div>
      </div>

      {/* Video */}
      <div
        className="flex-1 flex items-center justify-center
                      bg-black p-4"
      >
        <div className="w-full max-w-4xl">
          <div
            className="relative bg-black rounded-xl
                          overflow-hidden"
            style={{ aspectRatio: "16/9" }}
          >
            {videoError ? (
              <div
                className="absolute inset-0 flex items-center
                              justify-center"
              >
                <div className="text-center px-6">
                  <p className="text-red-400 font-medium mb-2">
                    Stream Unavailable
                  </p>
                  <p className="text-gray-400 text-sm">{videoError}</p>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full"
                style={{ objectFit: "contain" }}
                controls
                autoPlay
                playsInline
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchMatchPage() {
  return (
    <ProtectedRoute>
      <WatchMatchContent />
    </ProtectedRoute>
  );
}
