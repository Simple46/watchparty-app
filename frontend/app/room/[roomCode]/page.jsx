"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute";

import VideoPlayer from "../../../components/room/VideoPlayer";
import ChatPanel from "../../../components/room/ChatPanel";
import MembersList from "../../../components/room/MembersList";

import useRoom from "../../../hooks/useRoom";

import api from "../../../lib/api";
import { disconnectSocket } from "../../../lib/socket";

import P2PHostPlayer from "../../../components/room/P2PHostPlayer";
import P2PViewerPlayer from "../../../components/room/P2PViewerPlayer";
import { useSearchParams } from "next/navigation";

import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  MessageSquare,
  Crown,
  Tv,
  X,
} from "lucide-react";

function WatchRoomContent() {
  const { roomCode } = useParams();
  const router = useRouter();

  const { user } = useAuth();

  // ─────────────────────────────────────
  // ROOM STATE
  // ─────────────────────────────────────
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ─────────────────────────────────────
  // UI STATE
  // ─────────────────────────────────────
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [copiedCode, setCopiedCode] = useState(false);

  const timeoutRef = useRef(null);
  const hasLeftRef = useRef(false);

  const searchParams = useSearchParams();
  const isP2PMode =
    searchParams.get("mode") === "p2p" ||
    (roomData !== null && !roomData.movie);

  // ─────────────────────────────────────
  // FETCH ROOM
  // ─────────────────────────────────────
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/rooms/${roomCode}`);
        setRoomData(response.data.room);
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Room not found. Check the room code and try again.");
        } else if (err.response?.status === 410) {
          setError("This watch party has ended.");
        } else {
          setError("Failed to load room. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (roomCode) {
      fetchRoom();
    }
  }, [roomCode]);

  // ─────────────────────────────────────
  // SOCKET ROOM HOOK
  // ─────────────────────────────────────
  const {
    members,
    hostId,
    isHost,
    isConnected,
    messages,
    syncEvent,
    bufferingUsers,

    emitPlay,
    emitPause,
    emitSeek,

    emitChatMessage,

    emitBuffering,
    emitBufferingDone,

    leaveRoom,
  } = useRoom(roomCode, roomData);

  // ─────────────────────────────────────
  // COPY ROOM CODE
  // ─────────────────────────────────────
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      timeoutRef.current = setTimeout(() => {
        setCopiedCode(false);
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  // ─────────────────────────────────────
  // LEAVE ROOM
  // ─────────────────────────────────────
  const handleLeaveRoom = useCallback(async () => {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;

    try {
      leaveRoom();
      await api.post(`/api/rooms/${roomCode}/leave`).catch(() => {});
      disconnectSocket();
      router.push(
        isP2PMode ? "/" : `/movies/${roomData?.movie?.id || ""}`,
      );
    } catch (err) {
      console.error("Leave room error:", err);
      router.push("/");
    }
  }, [isP2PMode, leaveRoom, roomCode, roomData, router]);

  // ─────────────────────────────────────
  // TAB CLOSE / REFRESH
  // ─────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/${roomCode}/leave`;
      const token = localStorage.getItem("watchparty_token");

      if (navigator.sendBeacon && token) {
        const blob = new Blob([JSON.stringify({})], {
          type: "application/json",
        });
        navigator.sendBeacon(url, blob);
      }

      disconnectSocket();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [roomCode]);

  // ─────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-sm">Loading watch party...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────
  // ERROR
  // ─────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Tv className="w-8 h-8 text-gray-600" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Room Not Available
          </h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <Link href="/">
            <button className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-6 py-3 rounded-xl transition">
              Back to Movies
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────
  // MAIN UI
  // ─────────────────────────────────────
  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* ───────────────── TOP BAR ───────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        {/* LEFT */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleLeaveRoom}
            className="text-gray-400 hover:text-white transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {roomData?.movie?.title || "Watch Party"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-gray-500 text-xs">
                {isConnected ? "Connected" : "Reconnecting..."}
              </span>
              {isHost && (
                <>
                  <span className="text-gray-700">·</span>
                  <div className="flex items-center gap-1 text-yellow-400 text-xs">
                    <Crown className="w-3 h-3" />
                    Host
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            <span className="text-gray-400 text-xs hidden sm:block">Room:</span>
            <span className="text-white text-xs font-mono font-bold tracking-wider">
              {roomCode}
            </span>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>

          <button
            onClick={() => {
              setShowSidebar(true);
              setActiveTab("members");
            }}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-white text-xs font-medium">
              {members.length}
            </span>
          </button>

          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition text-sm font-medium shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:block">Leave Room</span>
          </button>

          <button
            onClick={() => setShowSidebar((prev) => !prev)}
            className="lg:hidden text-gray-400 hover:text-white bg-gray-800 border border-gray-700 p-2 rounded-lg transition"
          >
            {showSidebar ? (
              <X className="w-4 h-4" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ───────────────── MAIN CONTENT ───────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ───────────────── VIDEO AREA ───────────────── */}

        <div
          className={`
            flex-1 items-center justify-center
            bg-black p-2 sm:p-4 min-w-0
            ${showSidebar ? "hidden" : "flex"}
            lg:flex
          `}
        >
          {isP2PMode ? (
            isHost ? (
              <P2PHostPlayer roomCode={roomCode} />
            ) : (
              <P2PViewerPlayer roomCode={roomCode} />
            )
          ) : roomData?.movie?.videoUrl ? (
            <div className="w-full max-w-5xl">
              {roomData.movie.videoUrl.includes("vidsrc") ||
              roomData.movie.videoUrl.includes("embed") ? (
                // VidSrc iframe player
                <div
                  className="relative w-full bg-black rounded-xl overflow-hidden"
                  style={{ aspectRatio: "16/9" }}
                >
                  {/* Non-host warning */}
                  {!isHost && (
                    <div className="absolute top-4 left-4 z-10">
                      <div className="bg-black/60 text-gray-400 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                        Start playing at the same time as others
                      </div>
                    </div>
                  )}

                  {/* Host badge */}
                  {isHost && (
                    <div className="absolute top-4 left-4 z-10">
                      <div className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                        <Crown className="w-3 h-3" />
                        Start the movie when everyone is ready
                      </div>
                    </div>
                  )}
                  <iframe
                    src={roomData.movie.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    style={{ border: "none" }}
                  />
                </div>
              ) : (
                // Direct video player (for uploaded movies)
                <VideoPlayer
                  videoUrl={roomData.movie.videoUrl}
                  subtitleUrl={roomData.movie.subtitleUrl}
                  isHost={isHost}
                  syncEvent={syncEvent}
                  onPlay={emitPlay}
                  onPause={emitPause}
                  onSeek={emitSeek}
                  onBuffering={emitBuffering}
                  onBufferingDone={emitBufferingDone}
                  bufferingUsers={bufferingUsers}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600">No video available</p>
            </div>
          )}
        </div>

        {/* ───────────────── SIDEBAR ───────────────── */}
        <div
          className={`
            ${showSidebar ? "flex" : "hidden"}
            lg:flex
            w-full lg:w-80
            bg-gray-900
            border-l border-gray-800
            flex-col
            flex-shrink-0
          `}
        >
          {/* tabs */}
          <div className="flex border-b border-gray-800 flex-shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`
                flex-1 flex items-center justify-center gap-2
                py-3 text-sm font-medium transition
                ${
                  activeTab === "chat"
                    ? "text-white border-b-2 border-red-500"
                    : "text-gray-500 hover:text-gray-400"
                }
              `}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>

            <button
              onClick={() => setActiveTab("members")}
              className={`
                flex-1 flex items-center justify-center gap-2
                py-3 text-sm font-medium transition
                ${
                  activeTab === "members"
                    ? "text-white border-b-2 border-red-500"
                    : "text-gray-500 hover:text-gray-400"
                }
              `}
            >
              <Users className="w-4 h-4" />
              Members
              {members.length > 0 && (
                <span className="bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {members.length}
                </span>
              )}
            </button>
          </div>

          {/* content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "chat" ? (
              <ChatPanel
                messages={messages}
                onSendMessage={emitChatMessage}
                currentUserId={user?.id}
              />
            ) : (
              <MembersList
                members={members}
                hostId={hostId}
                currentUserId={user?.id}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchRoomPage() {
  return (
    <ProtectedRoute>
      <WatchRoomContent />
    </ProtectedRoute>
  );
}
