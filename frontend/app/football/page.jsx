"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "../../components/Navbar";
import ProtectedRoute from "../../components/ProtectedRoute";
import api from "../../lib/api";
import {
  Radio,
  Clock,
  Trophy,
  Loader,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Search,
  X,
} from "lucide-react";

function FootballContent() {
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [finishedMatches, setFinishedMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("live");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [clubSearch, setClubSearch] = useState("");

  const fetchMatches = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/api/football/matches");
      setLiveMatches(response.data.live || []);
      setUpcomingMatches(response.data.upcoming || []);
      setFinishedMatches(response.data.finished || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.response?.data?.message || "Failed to load matches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

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

  const formatDate = (dateStr, timeStr) => {
    if (!dateStr) return "TBD";
    try {
      const date = new Date(`${dateStr}T${timeStr || "00:00:00"}`);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const parseScore = (scoreStr) => {
    if (!scoreStr || scoreStr === "0 - 0") return { home: 0, away: 0 };
    const parts = scoreStr.split(" - ");
    return {
      home: parseInt(parts[0]) || 0,
      away: parseInt(parts[1]) || 0,
    };
  };

  const MatchCard = ({ match }) => {
    const score = parseScore(match.score);

    return (
      <div className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-3 sm:p-4 transition">
        {/* League + Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            <span className="text-gray-400 text-[10px] sm:text-xs truncate">
              {match.league}
            </span>
          </div>

          {match.status === "Live" ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-[10px] sm:text-xs font-bold">
                LIVE
                {match.currentMinutes && ` ${match.currentMinutes}'`}
              </span>
            </div>
          ) : match.status === "Finished" ? (
            <span className="text-gray-500 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
              FT
            </span>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500 text-[10px] sm:text-xs">
                {formatKickoff(match.kickoff, match.time)}
              </span>
            </div>
          )}
        </div>

        {/* Teams + Score */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3">
          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            {match.home_flag ? (
              <img
                src={match.home_flag}
                alt={match.home_name}
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                onError={(e) => (e.target.style.display = "none")}
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {match.home_name?.charAt(0) || "H"}
              </div>
            )}
            <p className="text-white font-semibold text-[10px] sm:text-xs text-center leading-tight">
              {match.home_name}
            </p>
          </div>

          {/* Score / VS */}
          <div className="flex-shrink-0 text-center">
            {match.status === "Live" || match.status === "Finished" ? (
              <div className="bg-gray-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl">
                <p className="text-white font-black text-lg sm:text-xl tabular-nums">
                  {score.home} — {score.away}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 font-black text-lg sm:text-xl">
                  VS
                </p>
                <p className="text-gray-600 text-[10px] sm:text-xs mt-0.5">
                  {formatDate(match.date, match.time)}
                </p>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            {match.away_flag ? (
              <img
                src={match.away_flag}
                alt={match.away_name}
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                onError={(e) => (e.target.style.display = "none")}
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {match.away_name?.charAt(0) || "A"}
              </div>
            )}
            <p className="text-white font-semibold text-[10px] sm:text-xs text-center leading-tight">
              {match.away_name}
            </p>
          </div>
        </div>

        {/* Match Info Footer */}
        <div className="border-t border-gray-800 pt-2">
          <div className="flex items-center justify-between text-[10px] sm:text-xs">
            <div className="flex items-center gap-2 sm:gap-3 text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {match.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {match.time}
              </span>
            </div>
            {match.kickoff && (
              <span className="text-gray-600 text-[10px] sm:text-xs">
                {new Date(match.kickoff).toLocaleString("en-US", {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    {
      id: "live",
      label: "Live",
      count: liveMatches.length,
      icon: Radio,
      color: "red",
    },
    {
      id: "upcoming",
      label: "Upcoming",
      count: upcomingMatches.length,
      icon: Clock,
      color: "gray",
    },
    {
      id: "finished",
      label: "Finished",
      count: finishedMatches.length,
      icon: Trophy,
      color: "gray",
    },
  ];

  const activeMatches =
    activeTab === "live"
      ? liveMatches
      : activeTab === "upcoming"
        ? upcomingMatches
        : finishedMatches;
  const searchTerm = clubSearch.trim().toLocaleLowerCase();
  const filteredMatches = searchTerm
    ? activeMatches.filter((match) =>
        [match.home_name, match.away_name].some((club) =>
          club?.toLocaleLowerCase().includes(searchTerm),
        ),
      )
    : activeMatches;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            {/* a back button that will take us to homepage */}

            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="flex mb-4 items-center gap-1.5 sm:gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-600/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              </div>
              <h1 className="text-white text-xl sm:text-2xl font-bold">
                Football Matches
              </h1>
            </div>
            {lastUpdated && !loading && (
              <p className="text-gray-600 text-[10px] sm:text-xs ml-10 sm:ml-12">
                Updated{" "}
                {lastUpdated.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          <button
            onClick={() => {
              setLoading(true);
              fetchMatches();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 sm:gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Tabs - Scrollable on mobile, centered on desktop */}
        <div className="mb-4 sm:mb-6 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800 w-fit min-w-full sm:min-w-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap flex-1 sm:flex-none justify-center ${
                    isActive
                      ? tab.color === "red"
                        ? "bg-red-600 text-white"
                        : "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-white/20" : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search by either club in the selected match category */}
        <div className="relative mb-4 sm:mb-6">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={clubSearch}
            onChange={(event) => setClubSearch(event.target.value)}
            placeholder="Search clubs in these matches..."
            aria-label="Search clubs"
            className="w-full rounded-xl border border-gray-800 bg-gray-900 py-3 pl-10 pr-10 text-sm text-white placeholder:text-gray-500 transition focus:border-red-500 focus:outline-none"
          />
          {clubSearch && (
            <button
              type="button"
              onClick={() => setClubSearch("")}
              aria-label="Clear club search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 transition hover:bg-gray-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 gap-3">
            <Loader className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 animate-spin" />
            <p className="text-gray-400 text-xs sm:text-sm">
              Loading matches...
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12 sm:py-16">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-gray-600" />
            </div>
            <p className="text-white font-medium text-sm sm:text-base mb-1">
              Failed to load
            </p>
            <p className="text-gray-500 text-xs sm:text-sm mb-4">{error}</p>
            <button
              onClick={fetchMatches}
              className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Matches Grid */}
        {!loading && !error && (
          <div>
            {filteredMatches.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-gray-600" />
                </div>
                <p className="text-white font-medium text-sm sm:text-base mb-1">
                  {searchTerm ? "No matching clubs" : `No ${activeTab} matches`}
                </p>
                <p className="text-gray-500 text-xs sm:text-sm mb-4">
                  {searchTerm
                    ? `No ${activeTab} matches include "${clubSearch.trim()}". Try another club name.`
                    : activeTab === "live"
                      ? "Check upcoming tab for scheduled matches"
                      : "Check back later"}
                </p>
                {!searchTerm &&
                  activeTab === "live" &&
                  upcomingMatches.length > 0 && (
                    <button
                      onClick={() => setActiveTab("upcoming")}
                      className="flex items-center gap-2 mx-auto text-red-400 hover:text-red-300 text-xs sm:text-sm transition"
                    >
                      See upcoming matches
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredMatches.map((match) => (
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