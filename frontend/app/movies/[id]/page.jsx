"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { useAuth } from "../../../context/AuthContext";
import {
  Play,
  Users,
  Clock,
  Calendar,
  Film,
  ArrowLeft,
  Copy,
  Check,
  LogIn,
} from "lucide-react";
import api from "../../../lib/api";

export default function MovieDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Join room state
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);

  // Copy room code state
  const [copiedCode, setCopiedCode] = useState(null);

  // Creating room loading state
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Fetch movie details
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/movies/${id}`);
        setMovie(response.data.movie);
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Movie not found");
        } else {
          setError("Failed to load movie");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return "Unknown duration";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Copy room code to clipboard
  const copyRoomCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Create a new watch room
  const handleCreateRoom = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      setCreatingRoom(true);
      const response = await api.post("/api/rooms/create", {
        movieId: movie.id,
      });
      // Redirect to the watch room
      router.push(`/room/${response.data.room.roomCode}`);
    } catch (err) {
      console.error("Create room error:", err);
      alert(err.response?.data?.message || "Failed to create room");
    } finally {
      setCreatingRoom(false);
    }
  };

  // Join an existing room by code
  const handleJoinRoom = (e) => {
    e.preventDefault();
    setJoinError("");

    if (!joinCode.trim()) {
      setJoinError("Please enter a room code");
      return;
    }

    if (!user) {
      router.push("/auth/login");
      return;
    }

    router.push(`/room/${joinCode.trim().toUpperCase()}`);
  };

  // ─── LOADING STATE ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div
            className="h-6 bg-gray-800 rounded w-24
                          animate-pulse mb-8"
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div
                className="aspect-video bg-gray-800 rounded-2xl
                              animate-pulse"
              />
              <div className="mt-6 space-y-3">
                <div
                  className="h-8 bg-gray-800 rounded
                                w-3/4 animate-pulse"
                />
                <div
                  className="h-4 bg-gray-800 rounded
                                w-full animate-pulse"
                />
                <div
                  className="h-4 bg-gray-800 rounded
                                w-2/3 animate-pulse"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div
                className="h-48 bg-gray-800 rounded-2xl
                              animate-pulse"
              />
              <div
                className="h-32 bg-gray-800 rounded-2xl
                              animate-pulse"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── ERROR STATE ───
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div
          className="flex flex-col items-center justify-center
                        min-h-96 gap-4"
        >
          <Film className="w-12 h-12 text-gray-700" />
          <p className="text-white font-semibold">{error}</p>
          <Link href="/">
            <button
              className="flex items-center gap-2 bg-red-600
                               hover:bg-red-700 text-white text-sm
                               px-4 py-2 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Movies
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const activeRooms = movie?.rooms?.filter((r) => r.isActive) || [];

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <Link href="/">
          <button
            className="flex items-center gap-2 text-gray-400
                             hover:text-white text-sm transition mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Movies
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── LEFT COLUMN — Movie info ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Thumbnail */}
            <div
              className="aspect-video bg-gray-900 rounded-2xl
                            overflow-hidden border border-gray-800"
            >
              {movie.thumbnail ? (
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center
                                justify-center"
                >
                  <Film className="w-16 h-16 text-gray-700" />
                </div>
              )}
            </div>

            {/* Title and meta */}
            <div>
              <h1
                className="text-white text-2xl sm:text-3xl
                             font-bold leading-tight"
              >
                {movie.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 mt-3">
                {movie.duration && (
                  <div
                    className="flex items-center gap-1.5
                                  text-gray-400 text-sm"
                  >
                    <Clock className="w-4 h-4" />
                    {formatDuration(movie.duration)}
                  </div>
                )}
                <div
                  className="flex items-center gap-1.5
                                text-gray-400 text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  Added {formatDate(movie.createdAt)}
                </div>
                {movie.size && (
                  <div className="text-gray-400 text-sm">
                    {movie.size.toFixed(1)} MB
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {movie.description && (
              <div
                className="bg-gray-900 border border-gray-800
                              rounded-xl p-5"
              >
                <h3 className="text-white font-semibold text-sm mb-2">
                  About this movie
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {movie.description}
                </p>
              </div>
            )}

            {/* Active rooms section */}
            {activeRooms.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-2 h-2 bg-green-500 rounded-full
                                  animate-pulse"
                  />
                  <h3 className="text-white font-semibold text-sm">
                    Active Watch Rooms ({activeRooms.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {activeRooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-gray-900 border border-gray-800
                                 hover:border-green-600/40 rounded-xl
                                 p-4 transition"
                    >
                      <div
                        className="flex items-center
                                      justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="bg-gray-800 text-white
                                             text-xs font-mono px-2.5
                                             py-1 rounded-md"
                            >
                              {room.roomCode}
                            </span>
                            <span className="text-gray-500 text-xs">
                              hosted by {room.host?.name}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-1.5
                                          mt-1.5 text-gray-400 text-xs"
                          >
                            <Users className="w-3.5 h-3.5" />
                            {room._count?.members || 0} member
                            {room._count?.members !== 1 ? "s" : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Copy code button */}
                          <button
                            onClick={() => copyRoomCode(room.roomCode)}
                            className="flex items-center gap-1.5
                                       text-gray-400 hover:text-white
                                       bg-gray-800 hover:bg-gray-700
                                       text-xs px-3 py-2 rounded-lg
                                       transition"
                          >
                            {copiedCode === room.roomCode ? (
                              <>
                                <Check
                                  className="w-3.5 h-3.5
                                                  text-green-400"
                                />
                                <span className="text-green-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                              </>
                            )}
                          </button>

                          {/* Join button */}
                          <button
                            onClick={() =>
                              router.push(`/room/${room.roomCode}`)
                            }
                            className="flex items-center gap-1.5
                                       bg-green-600 hover:bg-green-700
                                       text-white text-xs font-medium
                                       px-3 py-2 rounded-lg transition"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            Join
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT COLUMN — Actions ─── */}
          <div className="space-y-4">
            {/* Create room card */}
            <div
              className="bg-gray-900 border border-gray-800
                            rounded-2xl p-6"
            >
              <h3 className="text-white font-bold text-base mb-1">
                Start a Watch Party
              </h3>
              <p className="text-gray-500 text-xs mb-5 leading-relaxed">
                Create a room and invite your friends to watch together in real
                time
              </p>

              {user ? (
                <button
                  onClick={handleCreateRoom}
                  disabled={creatingRoom}
                  className="w-full flex items-center justify-center
                             gap-2 bg-red-600 hover:bg-red-700
                             disabled:bg-red-900 disabled:cursor-not-allowed
                             text-white font-semibold py-3.5 rounded-xl
                             transition text-sm"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {creatingRoom ? "Creating room..." : "Create Watch Room"}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-yellow-400 text-xs text-center">
                    Sign in to create a watch party
                  </p>
                  <Link href="/auth/login">
                    <button
                      className="w-full bg-red-600 hover:bg-red-700
                                       text-white font-semibold py-3.5
                                       rounded-xl transition text-sm"
                    >
                      Sign In to Watch
                    </button>
                  </Link>
                </div>
              )}
            </div>

            {/* Join room card */}
            <div
              className="bg-gray-900 border border-gray-800
                            rounded-2xl p-6"
            >
              <h3 className="text-white font-bold text-base mb-1">
                Join a Room
              </h3>
              <p className="text-gray-500 text-xs mb-5 leading-relaxed">
                Have a room code? Enter it below to join your friends
              </p>

              {showJoinInput ? (
                <form onSubmit={handleJoinRoom} className="space-y-3">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code e.g. ABC123"
                    maxLength={6}
                    autoFocus
                    className="w-full bg-gray-800 text-white
                               placeholder-gray-500 border border-gray-700
                               rounded-lg px-4 py-3 text-sm
                               font-mono tracking-widest text-center
                               focus:outline-none focus:border-red-500
                               transition uppercase"
                  />
                  {joinError && (
                    <p className="text-red-400 text-xs text-center">
                      {joinError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-gray-700 hover:bg-gray-600
                               text-white font-semibold py-3 rounded-xl
                               transition text-sm"
                  >
                    Join Room
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinInput(false);
                      setJoinCode("");
                      setJoinError("");
                    }}
                    className="w-full text-gray-500 hover:text-white
                               text-xs transition py-1"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowJoinInput(true)}
                  className="w-full flex items-center justify-center
                             gap-2 border border-gray-700
                             hover:border-gray-600 text-white
                             font-semibold py-3.5 rounded-xl
                             transition text-sm hover:bg-gray-800"
                >
                  <LogIn className="w-4 h-4" />
                  Enter Room Code
                </button>
              )}
            </div>

            {/* Stats card */}
            <div
              className="bg-gray-900 border border-gray-800
                            rounded-2xl p-5"
            >
              <h3 className="text-white font-semibold text-sm mb-4">
                Movie Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Active rooms</span>
                  <span className="text-white text-xs font-medium">
                    {activeRooms.length}
                  </span>
                </div>
                {movie.duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Duration</span>
                    <span className="text-white text-xs font-medium">
                      {formatDuration(movie.duration)}
                    </span>
                  </div>
                )}
                {movie.size && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">File size</span>
                    <span className="text-white text-xs font-medium">
                      {movie.size.toFixed(1)} MB
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Added on</span>
                  <span className="text-white text-xs font-medium">
                    {formatDate(movie.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
