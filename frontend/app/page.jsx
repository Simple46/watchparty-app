"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import MovieGrid from "../components/MovieGrid";
import api from "../lib/api";
import { Tv, TrendingUp } from "lucide-react";

// Separate component that uses useSearchParams
// This must be wrapped in Suspense in Next.js 14
function HomeContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all movies on load
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/movies");
        setMovies(response.data.movies);
      } catch (err) {
        setError("Failed to load movies. Please try again.");
        console.error("Fetch movies error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Filter movies when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMovies(movies);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = movies.filter(
      (movie) =>
        movie.title.toLowerCase().includes(query) ||
        movie.description?.toLowerCase().includes(query),
    );
    setFilteredMovies(filtered);
  }, [searchQuery, movies]);

  // Count movies with active rooms
  const activeCount = movies.filter((m) => (m._count?.rooms || 0) > 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero section */}
      {!searchQuery && (
        <div className="mb-10">
          <div className="flex items-start gap-4 mb-2">
            <div>
              <h1 className="text-white text-3xl font-bold leading-tight">
                Watch Together, <span className="text-red-400">Anywhere</span>
              </h1>
              <p className="text-gray-400 text-base mt-2">
                Pick a movie, invite your friends, and watch in perfect sync —
                no matter where they are.
              </p>
            </div>
          </div>

          {/* Active stats bar */}
          {activeCount > 0 && (
            <div
              className="flex items-center gap-2 mt-4 bg-green-600/10
                            border border-green-600/20 rounded-lg px-4
                            py-2.5 w-fit"
            >
              <div
                className="w-2 h-2 bg-green-500 rounded-full
                              animate-pulse"
              />
              <TrendingUp className="w-4 h-4 text-green-400" />
              <p className="text-green-400 text-sm font-medium">
                {activeCount} movie{activeCount !== 1 ? "s" : ""} being watched
                right now
              </p>
            </div>
          )}
        </div>
      )}

      {/* Search results header */}
      {searchQuery && (
        <div className="mb-8">
          <h2 className="text-white text-xl font-semibold">
            Results for <span className="text-red-400">{searchQuery}</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {filteredMovies.length} movie
            {filteredMovies.length !== 1 ? "s" : ""} found
          </p>
        </div>
      )}

      {/* Section label */}
      {!searchQuery && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-lg font-semibold">All Movies</h2>
          <p className="text-gray-500 text-sm">
            {movies.length} movie{movies.length !== 1 ? "s" : ""} available
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3
                        lg:grid-cols-4 gap-5"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl overflow-hidden">
              {/* Thumbnail skeleton */}
              <div className="aspect-video bg-gray-800 animate-pulse" />
              {/* Content skeleton */}
              <div className="p-4 space-y-2">
                <div
                  className="h-4 bg-gray-800 rounded
                                w-3/4 animate-pulse"
                />
                <div
                  className="h-3 bg-gray-800 rounded
                                w-full animate-pulse"
                />
                <div
                  className="h-3 bg-gray-800 rounded
                                w-1/2 animate-pulse"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div
          className="flex flex-col items-center justify-center
                        py-24 gap-4"
        >
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white text-sm
                       px-4 py-2 rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Movie grid */}
      {!loading && !error && (
        <MovieGrid movies={filteredMovies} searchQuery={searchQuery} />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div
              className="grid grid-cols-1 sm:grid-cols-2
                            md:grid-cols-3 lg:grid-cols-4 gap-5"
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-video bg-gray-900 rounded-xl
                             animate-pulse"
                />
              ))}
            </div>
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </div>
  );
}
