"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import ProtectedRoute from "../../components/ProtectedRoute";
import api from "../../lib/api";
import {
  Radio,
  Clock,
  Play,
  Users,
  RefreshCw,
  Trophy,
  Loader,
  Tv,
  ChevronRight,
} from "lucide-react";

function FootballContent() {
  const router = useRouter();

  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("live");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Track which match is loading its stream
  const [loadingStream, setLoadingStream] = useState(null);
  const [creatingRoom, setCreatingRoom] = useState(null);

  const fetchMatches = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/api/football/all");
      setLiveMatches(response.data.live || []);
      setUpcomingMatches(response.data.upcoming || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load matches. Check your API key.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  // ─── Get stream URL then watch solo ───
  const watchSolo = async (match) => {
    try {
      setLoadingStream(match.id);

      const response = await api.get(`/api/football/stream-url/${match.id}`, {
        params: {
          home: match.homeTeam,
          away: match.awayTeam,
        },
      });

      const { streamUrl } = response.data;

      if (!streamUrl) {
        alert("No stream available for this match right now.");
        return;
      }

      // Build proxied URL through our backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const proxiedUrl = `${backendUrl}/api/football/proxy?url=${encodeURIComponent(streamUrl)}`;

      router.push(
        `/football/watch/${match.id}` +
          `?stream=${encodeURIComponent(proxiedUrl)}` +
          `&home=${encodeURIComponent(match.homeTeam)}` +
          `&away=${encodeURIComponent(match.awayTeam)}` +
          `&score=${encodeURIComponent(match.score)}` +
          `&league=${encodeURIComponent(match.league)}`,
      );
    } catch (err) {
      console.error("Watch solo error:", err);
      alert(
        err.response?.data?.message ||
          "Stream not available for this match yet.",
      );
    } finally {
      setLoadingStream(null);
    }
  };

  // ─── Get stream URL then create room ───
  const watchWithFriends = async (match) => {
    try {
      setCreatingRoom(match.id);

      // First get the stream URL
      let streamUrl = null;
      try {
        const streamResponse = await api.get(
          `/api/football/stream-url/${match.id}`,
          {
            params: {
              home: match.homeTeam,
              away: match.awayTeam,
            },
          },
        );
        streamUrl = streamResponse.data.streamUrl;
      } catch {
        // Stream might not be available yet — create room anyway
        console.warn("Stream not available, creating room without stream");
      }

      const roomResponse = await api.post("/api/football/create-room", {
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.league,
        score: match.score,
        streamUrl,
        thumbnail: match.homeTeamLogo || match.awayTeamLogo || null,
      });

      router.push(`/room/${roomResponse.data.roomCode}`);
    } catch (err) {
      console.error("Watch together error:", err);
      alert(
        err.response?.data?.message ||
          "Failed to create watch party. Try again.",
      );
    } finally {
      setCreatingRoom(null);
    }
  };

  // Format kickoff time for display
  const formatKickoff = (kickoff, time) => {
    if (kickoff) {
      try {
        return new Date(kickoff).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } catch {
        return time || "TBD";
      }
    }
    return time || "TBD";
  };

  // ─── MATCH CARD ───
  const MatchCard = ({ match }) => {
    const isStreaming = loadingStream === match.id || creatingRoom === match.id;

    return (
      <div
        className="bg-gray-900 border border-gray-800
                       hover:border-gray-700 rounded-xl p-4
                       transition"
      >
        {/* League + Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy
              className="w-3.5 h-3.5 text-yellow-400
                               flex-shrink-0"
            />
            <span className="text-gray-400 text-xs truncate">
              {match.league}
            </span>
          </div>

          {match.isLive ? (
            <div
              className="flex items-center gap-1.5
                            flex-shrink-0"
            >
              <div
                className="w-1.5 h-1.5 bg-red-500
                              rounded-full animate-pulse"
              />
              <span className="text-red-400 text-xs font-bold">
                LIVE
                {match.currentMinutes && ` ${match.currentMinutes}'`}
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5
                            flex-shrink-0"
            >
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500 text-xs">
                {formatKickoff(match.kickoff, match.time)}
              </span>
            </div>
          )}
        </div>

        {/* Teams + Score */}
        <div
          className="flex items-center justify-between
                        gap-3 mb-4"
        >
          {/* Home Team */}
          <div
            className="flex-1 flex flex-col items-center
                          gap-2"
          >
            {match.homeTeamLogo ? (
              <img
                src={match.homeTeamLogo}
                alt={match.homeTeam}
                className="w-10 h-10 object-contain"
                onError={(e) => (e.target.style.display = "none")}
              />
            ) : (
              <div
                className="w-10 h-10 bg-gray-800
                              rounded-full flex items-center
                              justify-center text-white
                              text-sm font-bold"
              >
                {match.homeTeam.charAt(0)}
              </div>
            )}
            <p
              className="text-white font-semibold text-xs
                           text-center leading-tight"
            >
              {match.homeTeam}
            </p>
          </div>

          {/* Score / VS */}
          <div className="flex-shrink-0 text-center">
            {match.isLive ? (
              <div
                className="bg-gray-800 px-4 py-2
                              rounded-xl"
              >
                <p
                  className="text-white font-black text-xl
                               tabular-nums"
                >
                  {match.homeScore} — {match.awayScore}
                </p>
              </div>
            ) : (
              <p className="text-gray-600 font-black text-xl">VS</p>
            )}
          </div>

          {/* Away Team */}
          <div
            className="flex-1 flex flex-col items-center
                          gap-2"
          >
            {match.awayTeamLogo ? (
              <img
                src={match.awayTeamLogo}
                alt={match.awayTeam}
                className="w-10 h-10 object-contain"
                onError={(e) => (e.target.style.display = "none")}
              />
            ) : (
              <div
                className="w-10 h-10 bg-gray-800
                              rounded-full flex items-center
                              justify-center text-white
                              text-sm font-bold"
              >
                {match.awayTeam.charAt(0)}
              </div>
            )}
            <p
              className="text-white font-semibold text-xs
                           text-center leading-tight"
            >
              {match.awayTeam}
            </p>
          </div>
        </div>

        {/* Buttons — only for live matches */}
        {match.isLive && (
          <div className="flex gap-2">
            <button
              onClick={() => watchSolo(match)}
              disabled={isStreaming}
              className="flex-1 flex items-center justify-center
                         gap-2 bg-red-600 hover:bg-red-700
                         disabled:opacity-60
                         disabled:cursor-not-allowed text-white
                         text-xs font-medium py-2.5 rounded-lg
                         transition"
            >
              {loadingStream === match.id ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              Watch Now
            </button>

            <button
              onClick={() => watchWithFriends(match)}
              disabled={isStreaming}
              className="flex-1 flex items-center justify-center
                         gap-2 bg-gray-800 hover:bg-gray-700
                         border border-gray-700
                         disabled:opacity-60
                         disabled:cursor-not-allowed text-white
                         text-xs font-medium py-2.5 rounded-lg
                         transition"
            >
              {creatingRoom === match.id ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Users className="w-3.5 h-3.5" />
              )}
              Watch Together
            </button>
          </div>
        )}

        {/* Upcoming — no buttons but show kickoff */}
        {!match.isLive && (
          <div className="text-center py-1">
            <p className="text-gray-600 text-xs">
              Kicks off at {formatKickoff(match.kickoff, match.time)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 bg-red-600/20 rounded-xl
                              flex items-center justify-center"
              >
                <Radio className="w-5 h-5 text-red-400" />
              </div>
              <h1 className="text-white text-2xl font-bold">Live Football</h1>
            </div>
            {lastUpdated && !loading && (
              <p className="text-gray-600 text-xs ml-12">
                Updated{" "}
                {lastUpdated.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · auto-refreshes every 60s
              </p>
            )}
          </div>

          <button
            onClick={() => {
              setLoading(true);
              fetchMatches();
            }}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-800
                       hover:bg-gray-700 border border-gray-700
                       text-white text-sm px-4 py-2 rounded-lg
                       transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 bg-gray-900 p-1 rounded-xl
                        border border-gray-800 mb-6 w-fit"
        >
          <button
            onClick={() => setActiveTab("live")}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-lg
              text-sm font-medium transition
              ${
                activeTab === "live"
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full
              ${
                activeTab === "live" ? "bg-white animate-pulse" : "bg-gray-600"
              }`}
            />
            Live
            {liveMatches.length > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5
                                rounded-full font-bold
                ${
                  activeTab === "live"
                    ? "bg-white/20"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {liveMatches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("upcoming")}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-lg
              text-sm font-medium transition
              ${
                activeTab === "upcoming"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            <Clock className="w-3.5 h-3.5" />
            Upcoming
            {upcomingMatches.length > 0 && (
              <span
                className="text-xs bg-gray-700
                               text-gray-400 px-1.5 py-0.5
                               rounded-full"
              >
                {upcomingMatches.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div
            className="flex flex-col items-center
                          justify-center py-20 gap-3"
          >
            <Loader
              className="w-8 h-8 text-red-500
                               animate-spin"
            />
            <p className="text-gray-400 text-sm">Loading matches...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-16">
            <div
              className="w-14 h-14 bg-gray-900 border
                            border-gray-800 rounded-2xl flex
                            items-center justify-center
                            mx-auto mb-4"
            >
              <Tv className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-white font-medium mb-1">Failed to load</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <button
              onClick={fetchMatches}
              className="bg-red-600 hover:bg-red-700
                         text-white text-sm px-5 py-2.5
                         rounded-xl transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Live Tab */}
        {!loading && !error && activeTab === "live" && (
          <div>
            {liveMatches.length === 0 ? (
              <div className="text-center py-16">
                <div
                  className="w-14 h-14 bg-gray-900 border
                                border-gray-800 rounded-2xl flex
                                items-center justify-center
                                mx-auto mb-4"
                >
                  <Radio className="w-7 h-7 text-gray-600" />
                </div>
                <p className="text-white font-medium mb-1">
                  No live matches right now
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  Check upcoming tab for scheduled matches
                </p>
                <button
                  onClick={() => setActiveTab("upcoming")}
                  className="flex items-center gap-2 mx-auto
                             text-red-400 hover:text-red-300
                             text-sm transition"
                >
                  See upcoming matches
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2
                              lg:grid-cols-3 gap-4"
              >
                {liveMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Tab */}
        {!loading && !error && activeTab === "upcoming" && (
          <div>
            {upcomingMatches.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-white font-medium mb-1">
                  No upcoming matches
                </p>
                <p className="text-gray-500 text-sm">Check back later</p>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2
                              lg:grid-cols-3 gap-4"
              >
                {upcomingMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FootballPage() {
  return (
    <ProtectedRoute>
      <FootballContent />
    </ProtectedRoute>
  );
}
