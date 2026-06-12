"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Check,
  Star,
  Loader,
  TrendingUp,
  Film,
  AlertCircle,
} from "lucide-react";
import api from "../../../lib/api";

export default function BrowseMoviesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("trending");

  // Fetch popular and trending on load
  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const res = await api.get("/api/tmdb/popular");
        setPopularMovies(res.data.popular || []);
        setTrendingMovies(res.data.trending || []);

        // Pre-mark already added movies
        const alreadyAdded = new Set([
          ...res.data.popular
            .filter((m) => m.alreadyAdded)
            .map((m) => m.tmdbId),
          ...res.data.trending
            .filter((m) => m.alreadyAdded)
            .map((m) => m.tmdbId),
        ]);
        setAddedIds(alreadyAdded);
      } catch (err) {
        console.error("Popular fetch error:", err);
      } finally {
        setLoadingPopular(false);
      }
    };

    fetchPopular();
  }, []);

  // Search TMDB
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

    try {
      setSearching(true);
      setSearchResults([]);

      const res = await api.get(
        `/api/tmdb/search?q=${encodeURIComponent(searchQuery)}`,
      );

      setSearchResults(res.data.movies || []);

      // Mark already added
      const alreadyAdded = new Set(
        res.data.movies.filter((m) => m.alreadyAdded).map((m) => m.tmdbId),
      );
      setAddedIds((prev) => new Set([...prev, ...alreadyAdded]));
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  // Add movie to library
  const addMovie = async (movie) => {
    try {
      setAddingId(movie.tmdbId);

      await api.post("/api/tmdb/add", { tmdbId: movie.tmdbId });

      setAddedIds((prev) => new Set([...prev, movie.tmdbId]));
      showToast(`"${movie.title}" added to library!`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add movie", "error");
    } finally {
      setAddingId(null);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Movie card component
  const MovieCard = ({ movie }) => {
    const isAdded = addedIds.has(movie.tmdbId);
    const isAdding = addingId === movie.tmdbId;

    return (
      <div
        className="bg-gray-900 border border-gray-800
                       hover:border-gray-700 rounded-xl overflow-hidden
                       transition group"
      >
        {/* Poster */}
        <div className="relative aspect-[2/3] bg-gray-800 overflow-hidden">
          {movie.thumbnail ? (
            <img
              src={movie.thumbnail}
              alt={movie.title}
              className="w-full h-full object-cover
                         group-hover:scale-105 transition
                         duration-300"
            />
          ) : (
            <div
              className="w-full h-full flex items-center
                            justify-center"
            >
              <Film className="w-10 h-10 text-gray-600" />
            </div>
          )}

          {/* Rating badge */}
          {movie.rating && (
            <div
              className="absolute top-2 right-2 bg-black/70
                            backdrop-blur-sm flex items-center
                            gap-1 px-2 py-1 rounded-lg"
            >
              <Star
                className="w-3 h-3 text-yellow-400
                               fill-yellow-400"
              />
              <span className="text-white text-xs font-bold">
                {movie.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p
            className="text-white text-sm font-semibold
                         line-clamp-1 mb-1"
          >
            {movie.title}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">
              {movie.releaseYear || "—"}
            </span>

            <button
              onClick={() => !isAdded && addMovie(movie)}
              disabled={isAdded || isAdding}
              className={`
                flex items-center gap-1.5 text-xs font-medium
                px-3 py-1.5 rounded-lg transition
                ${
                  isAdded
                    ? "bg-green-600/20 text-green-400 cursor-default"
                    : isAdding
                      ? "bg-gray-700 text-gray-400 cursor-wait"
                      : "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                }
              `}
            >
              {isAdding ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : isAdded ? (
                <Check className="w-3 h-3" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              {isAdded ? "Added" : isAdding ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const displayMovies =
    searchResults.length > 0
      ? searchResults
      : activeTab === "trending"
        ? trendingMovies
        : popularMovies;

  return (
    <div className="max-w-5xl">
      {/* Toast */}
      {toast && (
        <div
          className={`
            fixed top-4 right-4 z-50 px-4 py-3 rounded-xl
            text-white text-sm font-medium shadow-xl
            flex items-center gap-2 transition
            ${toast.type === "error" ? "bg-red-600" : "bg-green-600"}
          `}
        >
          {toast.type === "error" ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Browse Movies</h1>
        <p className="text-gray-400 text-sm mt-1">
          Search TMDB and add movies to your library instantly
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2
                             -translate-y-1/2 w-4 h-4
                             text-gray-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) {
                setSearchResults([]);
              }
            }}
            placeholder="Search any movie title..."
            className="w-full bg-gray-900 text-white
                       placeholder-gray-500 border border-gray-700
                       rounded-xl pl-11 pr-4 py-3 text-sm
                       focus:outline-none focus:border-red-500
                       transition"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="bg-red-600 hover:bg-red-700
                     disabled:bg-gray-700 text-white
                     font-medium px-6 py-3 rounded-xl
                     transition text-sm flex-shrink-0"
        >
          {searching ? <Loader className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {/* Tabs (only when not searching) */}
      {searchResults.length === 0 && !searching && (
        <div
          className="flex gap-1 bg-gray-900 p-1 rounded-xl
                        border border-gray-800 mb-6 w-fit"
        >
          <button
            onClick={() => setActiveTab("trending")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg
              text-sm font-medium transition
              ${
                activeTab === "trending"
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            <TrendingUp className="w-4 h-4" />
            Trending
          </button>
          <button
            onClick={() => setActiveTab("popular")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg
              text-sm font-medium transition
              ${
                activeTab === "popular"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            <Star className="w-4 h-4" />
            Popular
          </button>
        </div>
      )}

      {/* Search results label */}
      {searchResults.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-400 text-sm">
            {searchResults.length} results for{" "}
            <span className="text-white font-medium">{searchQuery}</span>
          </p>
          <button
            onClick={() => {
              setSearchResults([]);
              setSearchQuery("");
            }}
            className="text-gray-500 hover:text-white text-xs
                       transition"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Grid */}
      {loadingPopular && searchResults.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-6 h-6 text-red-500 animate-spin" />
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3
                        md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
          {displayMovies.map((movie) => (
            <MovieCard key={movie.tmdbId} movie={movie} />
          ))}
        </div>
      )}

      {/* Empty search result */}
      {!searching && searchResults.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <p className="text-white font-medium">No results found</p>
          <p className="text-gray-500 text-sm mt-1">
            Try a different search term
          </p>
        </div>
      )}
    </div>
  );
}
