"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "../../../../components/ProtectedRoute";
import api from "../../../../lib/api";
import {
  ArrowLeft,
  Users,
  Play,
  Wifi,
  Shield,
  MapPin,
  User,
  TrendingUp,
  BarChart2,
  Clock,
  Loader,
  CheckCircle,
  ChevronRight,
} from "lucide-react";

function MatchDetailContent() {
  const { matchId } = useParams();
  const router = useRouter();

  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStream, setActiveStream] = useState(0);
  const [activeTab, setActiveTab] = useState("streams");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomCreated, setRoomCreated] = useState(null);

  const fetchMatch = useCallback(async () => {
    try {
      setError("");
      const res = await api.get(`/api/football/match/${matchId}`);
      setMatchData(res.data);
    } catch (err) {
      console.error("Match detail error:", err);
      setError(err.response?.data?.message || "Failed to load match details.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatch();

    // Refresh every 60s if live
    const interval = setInterval(() => {
      if (matchData?.matchInfo?.match_status === "live") {
        fetchMatch();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchMatch, matchData?.matchInfo?.match_status]);

  const createRoom = async () => {
    if (!matchData) return;
    const { matchInfo, streams } = matchData;
    const bestStream = streams.find((s) => s.isHD) || streams[0];

    try {
      setCreatingRoom(true);
      const res = await api.post("/api/football/create-room", {
        matchId: matchId,
        homeTeam: matchInfo.home_team_name,
        awayTeam: matchInfo.away_team_name,
        league: matchInfo.league_name || "Football",
        streamUrl: bestStream?.embedUrl || "",
        thumbnail: matchInfo.home_team_logo || matchInfo.away_team_logo,
        score: `${matchInfo.homeTeamScore} - ${matchInfo.awayTeamScore}`,
      });
      setRoomCreated(res.data.roomCode);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create room");
    } finally {
      setCreatingRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-red-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading match...</p>
        </div>
      </div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white font-semibold mb-2">Match not found</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push("/football")}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-5 py-2.5 rounded-xl transition"
          >
            Back to matches
          </button>
        </div>
      </div>
    );
  }

  const {
    matchInfo,
    streams,
    venue,
    referee,
    managers,
    stats,
    lineups,
    h2h,
    events,
  } = matchData;

  const isLive = matchInfo.match_status === "live";
  const isFinished = matchInfo.match_status === "finished";

  const tabs = [
    { id: "streams", label: "Watch", show: streams?.length > 0 },
    { id: "stats", label: "Stats", show: !!stats },
    { id: "lineups", label: "Lineups", show: !!lineups },
    { id: "h2h", label: "H2H", show: !!h2h },
    { id: "info", label: "Info", show: !!(venue || referee) },
  ].filter((t) => t.show);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/football")}
            className="text-gray-400 hover:text-white transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {matchInfo.league_logo && (
                <img
                  src={matchInfo.league_logo}
                  alt=""
                  className="w-4 h-4 object-contain"
                  onError={(e) => (e.target.style.display = "none")}
                />
              )}
              <p className="text-gray-400 text-xs truncate">
                {matchInfo.league_name}
              </p>
            </div>
          </div>

          {isLive && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-xs font-bold">LIVE</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Score Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
          {/* Status */}
          <div className="text-center mb-5">
            {isLive ? (
              <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-600/30 px-3 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                <span className="text-red-400 text-xs font-bold">LIVE</span>
              </div>
            ) : isFinished ? (
              <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                Full Time
              </span>
            ) : (
              <span className="text-gray-400 text-xs">
                {matchInfo.match_time
                  ? new Date(
                      typeof matchInfo.match_time === "string"
                        ? parseInt(matchInfo.match_time) * 1000
                        : matchInfo.match_time * 1000,
                    ).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Upcoming"}
              </span>
            )}
          </div>

          {/* Teams and Score */}
          <div className="flex items-center justify-between gap-4">
            {/* Home */}
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="w-16 h-16 flex items-center justify-center">
                {matchInfo.home_team_logo ? (
                  <img
                    src={matchInfo.home_team_logo}
                    alt={matchInfo.home_team_name}
                    className="w-full h-full object-contain"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-700 rounded-full" />
                )}
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-sm leading-tight">
                  {matchInfo.home_team_name}
                </p>
              </div>
            </div>

            {/* Score */}
            <div className="flex-shrink-0 text-center">
              {isLive || isFinished ? (
                <div>
                  <p className="text-white font-black text-5xl tabular-nums">
                    {matchInfo.homeTeamScore} - {matchInfo.awayTeamScore}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 font-bold text-2xl">VS</p>
              )}
            </div>

            {/* Away */}
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="w-16 h-16 flex items-center justify-center">
                {matchInfo.away_team_logo ? (
                  <img
                    src={matchInfo.away_team_logo}
                    alt={matchInfo.away_team_name}
                    className="w-full h-full object-contain"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-700 rounded-full" />
                )}
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-sm leading-tight">
                  {matchInfo.away_team_name}
                </p>
              </div>
            </div>
          </div>

          {/* Watch Together Button */}
          {(isLive || isFinished) && streams?.length > 0 && (
            <div className="mt-6">
              {roomCreated ? (
                <div className="bg-green-600/20 border border-green-600/30 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="text-green-400 font-semibold text-sm">
                      Watch Party Created!
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/room/${roomCreated}`)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-lg transition"
                    >
                      Enter Room — {roomCreated}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(roomCreated);
                      }}
                      className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2.5 rounded-lg transition"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={createRoom}
                  disabled={creatingRoom}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
                >
                  {creatingRoom ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                  {creatingRoom ? "Creating Room..." : "Watch Together"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        {tabs.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-red-600 text-white"
                    : "bg-gray-900 text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}

        {/* STREAMS TAB */}
        {activeTab === "streams" && streams?.length > 0 && (
          <div className="space-y-4">
            {/* Stream Selector */}
            {streams.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {streams.map((stream, i) => (
                  <button
                    key={stream.id}
                    onClick={() => setActiveStream(i)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      activeStream === i
                        ? "bg-red-600 text-white"
                        : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Wifi className="w-3 h-3" />
                    {stream.source}
                    {stream.isHD && (
                      <span className="bg-yellow-500/20 text-yellow-400 text-xs px-1 rounded">
                        HD
                      </span>
                    )}
                    {stream.language && (
                      <span className="text-xs opacity-70">
                        {stream.language}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Active Stream Player */}
            <div
              className="relative bg-black rounded-xl overflow-hidden"
              style={{ aspectRatio: "16/9" }}
            >
              {streams[activeStream]?.embedUrl ? (
                <iframe
                  key={activeStream}
                  src={streams[activeStream].embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture"
                  style={{ border: "none" }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Stream unavailable</p>
                </div>
              )}
            </div>

            <p className="text-gray-600 text-xs text-center">
              If one stream does not load, try another above
            </p>
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === "stats" && stats && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">
              Match Statistics
            </h3>
            <div className="space-y-3">
              {Object.entries(stats).map(([key, value]) => {
                const homeVal = typeof value === "object" ? value.home : null;
                const awayVal = typeof value === "object" ? value.away : null;

                if (homeVal === null) return null;

                const label = key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());

                const total = homeVal + awayVal || 1;
                const homePercent = (homeVal / total) * 100;

                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium tabular-nums">
                        {homeVal}
                      </span>
                      <span className="text-gray-500 text-xs">{label}</span>
                      <span className="text-white text-sm font-medium tabular-nums">
                        {awayVal}
                      </span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
                      <div
                        className="bg-blue-500 h-full rounded-l-full transition-all"
                        style={{ width: `${homePercent}%` }}
                      />
                      <div className="bg-red-500 h-full rounded-r-full flex-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LINEUPS TAB */}
        {activeTab === "lineups" && lineups && (
          <div className="grid grid-cols-2 gap-4">
            {["home", "away"].map((side) => {
              const team = lineups[side];
              const teamInfo =
                side === "home"
                  ? {
                      name: matchInfo.home_team_name,
                      badge: matchInfo.home_team_logo,
                    }
                  : {
                      name: matchInfo.away_team_name,
                      badge: matchInfo.away_team_logo,
                    };

              return (
                <div
                  key={side}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    {teamInfo.badge && (
                      <img
                        src={teamInfo.badge}
                        alt=""
                        className="w-5 h-5 object-contain"
                      />
                    )}
                    <p className="text-white text-xs font-bold truncate">
                      {teamInfo.name}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {(team?.starting || team?.players || []).map(
                      (player, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-gray-600 text-xs w-5 text-right flex-shrink-0">
                            {player.number || player.shirt_number || ""}
                          </span>
                          <p className="text-white text-xs truncate">
                            {player.name}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* H2H TAB */}
        {activeTab === "h2h" && h2h && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">
              Head to Head
            </h3>
            <div className="space-y-3">
              {(h2h.matches || h2h).slice(0, 5).map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <p className="text-gray-400 text-xs w-16 flex-shrink-0">
                    {m.date
                      ? new Date(m.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "2-digit",
                        })
                      : ""}
                  </p>
                  <p className="text-white text-xs flex-1 text-center">
                    {m.home_team || m.homeTeam}{" "}
                    <span className="font-bold">
                      {m.score || m.result || ""}
                    </span>{" "}
                    {m.away_team || m.awayTeam}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INFO TAB */}
        {activeTab === "info" && (
          <div className="space-y-4">
            {/* Venue */}
            {venue && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <h3 className="text-white font-semibold text-sm">Venue</h3>
                </div>

                <div className="flex gap-4">
                  {venue.image && (
                    <img
                      src={venue.image}
                      alt={venue.stadium}
                      className="w-24 h-16 object-cover rounded-lg flex-shrink-0 border border-gray-700"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  )}
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">
                      {venue.stadium}
                    </p>
                    <p className="text-gray-400 text-xs mb-1">
                      {venue.city}, {venue.country}
                    </p>
                    {venue.capacity && (
                      <p className="text-gray-500 text-xs">
                        Capacity: {venue.capacity.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Referee */}
            {referee && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-white font-semibold text-sm">Referee</h3>
                </div>

                <div className="flex items-center gap-4">
                  {referee.photo && (
                    <img
                      src={referee.photo}
                      alt={referee.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-700"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm mb-1">
                      {referee.name}
                    </p>
                    <p className="text-gray-400 text-xs mb-2">
                      {referee.country}
                    </p>
                    {referee.games_recorded && (
                      <div className="flex gap-4 text-xs">
                        <div>
                          <p className="text-gray-500">Games</p>
                          <p className="text-white font-semibold">
                            {referee.games_recorded}
                          </p>
                        </div>
                        <div>
                          <p className="text-yellow-500">Yellows</p>
                          <p className="text-white font-semibold">
                            {referee.yellow_cards}
                          </p>
                        </div>
                        <div>
                          <p className="text-red-500">Reds</p>
                          <p className="text-white font-semibold">
                            {referee.red_cards}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Managers */}
            {managers && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-blue-400" />
                  <h3 className="text-white font-semibold text-sm">Managers</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {["home", "away"].map((side) => {
                    const mgr = managers[side];
                    const team =
                      side === "home"
                        ? { name: matchInfo.home_team_name }
                        : { name: matchInfo.away_team_name };
                    if (!mgr) return null;

                    return (
                      <div key={side} className="text-center">
                        {mgr.photo && (
                          <img
                            src={mgr.photo}
                            alt={mgr.name}
                            className="w-12 h-12 rounded-full object-cover border border-gray-700 mx-auto mb-2"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        )}
                        <p className="text-white text-xs font-semibold">
                          {mgr.name}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {team.name}
                        </p>
                        {mgr.country && (
                          <p className="text-gray-600 text-xs">{mgr.country}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatchDetailPage() {
  return (
    <ProtectedRoute>
      <MatchDetailContent />
    </ProtectedRoute>
  );
}
