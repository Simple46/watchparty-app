"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import MovieCard from "../components/MovieCard";
import api from "../lib/api";
import {
  Search,
  SlidersHorizontal,
  Star,
  ArrowUpAZ,
  ArrowDownAZ,
  Clock,
  Flame,
  Users,
  X,
  ChevronDown,
  Film,
} from "lucide-react";

export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch movies on mount
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/movies");
        setMovies(response.data.movies || []);
        setGenres(response.data.genres || []);
      } catch (err) {
        console.error("Fetch movies error:", err);
        setError("Failed to load movies");
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Sync search query from navbar URL param
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

  // Apply all filters and sorting
  const filteredMovies = useMemo(() => {
    let result = [...movies];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (movie) =>
          movie.title.toLowerCase().includes(q) ||
          movie.description?.toLowerCase().includes(q) ||
          movie.genres?.toLowerCase().includes(q) ||
          movie.releaseYear?.toString().includes(q),
      );
    }

    // Genre filter
    if (selectedGenre !== "all") {
      result = result.filter((movie) =>
        movie.genres?.toLowerCase().includes(selectedGenre.toLowerCase()),
      );
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "az":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "za":
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "popular":
        result.sort((a, b) => (b._count?.rooms || 0) - (a._count?.rooms || 0));
        break;
      default:
        break;
    }

    return result;
  }, [movies, searchQuery, selectedGenre, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGenre("all");
    setSortBy("newest");
    router.push("/");
  };

  const hasActiveFilters =
    searchQuery || selectedGenre !== "all" || sortBy !== "newest";

  const sortOptions = [
    { value: "newest", label: "Newest First", icon: Clock },
    { value: "oldest", label: "Oldest First", icon: Clock },
    { value: "az", label: "A → Z", icon: ArrowUpAZ },
    { value: "za", label: "Z → A", icon: ArrowDownAZ },
    {
      value: "rating",
      label: "Top Rated",
      icon: Star,
    },
    {
      value: "popular",
      label: "Most Watched",
      icon: Flame,
    },
  ];

  // ─── SKELETON LOADING ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div
            className="grid grid-cols-2 sm:grid-cols-3
                          md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div
                  className="bg-gray-800 rounded-xl
                                aspect-[2/3] mb-3"
                />
                <div
                  className="bg-gray-800 rounded h-4
                                w-3/4 mb-2"
                />
                <div
                  className="bg-gray-800 rounded h-3
                                w-1/2"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section */}
        {!hasActiveFilters && movies.length > 0 && (
          <div className="mb-10">
            <h1
              className="text-white text-3xl sm:text-4xl
                           font-black mb-2"
            >
              Watch Together
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Pick a movie, create a room, share the code. Watch in sync with
              your friends.
            </p>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Top row — search + filter toggle */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2
                                 -translate-y-1/2 w-4 h-4
                                 text-gray-500"
              />
              <input
                type="text"
                placeholder="Search movies, genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 text-white
                           placeholder-gray-500 border
                           border-gray-800 rounded-xl pl-10
                           pr-4 py-2.5 text-sm
                           focus:outline-none
                           focus:border-gray-600 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2
                             -translate-y-1/2 text-gray-500
                             hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-4 py-2.5
                rounded-xl border text-sm font-medium
                transition flex-shrink-0
                ${
                  showFilters || selectedGenre !== "all" || sortBy !== "newest"
                    ? "bg-red-600 border-red-600 text-white"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
                }
              `}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:block">Filters</span>
              {(selectedGenre !== "all" || sortBy !== "newest") && (
                <span
                  className="bg-white/20 text-white text-xs
                                 px-1.5 py-0.5 rounded-full"
                >
                  {[
                    selectedGenre !== "all" ? 1 : 0,
                    sortBy !== "newest" ? 1 : 0,
                  ].reduce((a, b) => a + b, 0)}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filter Panel */}
          {showFilters && (
            <div
              className="bg-gray-900 border border-gray-800
                            rounded-2xl p-4 space-y-4"
            >
              {/* Sort By */}
              <div>
                <p
                  className="text-gray-400 text-xs font-medium
                               uppercase tracking-wider mb-3"
                >
                  Sort By
                </p>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5
                        rounded-lg text-xs font-medium transition
                        ${
                          sortBy === option.value
                            ? "bg-red-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                        }
                      `}
                    >
                      <option.icon className="w-3 h-3" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre Filter */}
              {genres.length > 0 && (
                <div>
                  <p
                    className="text-gray-400 text-xs
                                 font-medium uppercase
                                 tracking-wider mb-3"
                  >
                    Genre
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedGenre("all")}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs
                        font-medium transition
                        ${
                          selectedGenre === "all"
                            ? "bg-red-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                        }
                      `}
                    >
                      All Genres
                    </button>
                    {genres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() =>
                          setSelectedGenre(
                            selectedGenre === genre ? "all" : genre,
                          )
                        }
                        className={`
                          px-3 py-1.5 rounded-lg text-xs
                          font-medium transition
                          ${
                            selectedGenre === genre
                              ? "bg-red-600 text-white"
                              : "bg-gray-800 text-gray-400 hover:text-white"
                          }
                        `}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-gray-500
                             hover:text-red-400 text-xs transition"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Quick sort pills (visible without opening filters) */}
          {!showFilters && (
            <div
              className="flex items-center gap-2
                            overflow-x-auto pb-1 scrollbar-hide"
            >
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5
                    rounded-lg text-xs font-medium transition
                    flex-shrink-0
                    ${
                      sortBy === option.value
                        ? "bg-red-600 text-white"
                        : "bg-gray-900 border border-gray-800 text-gray-500 hover:text-white"
                    }
                  `}
                >
                  <option.icon className="w-3 h-3" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results Summary */}
        {hasActiveFilters && (
          <div
            className="flex items-center justify-between
                          mb-4"
          >
            <p className="text-gray-500 text-sm">
              {filteredMovies.length === 0
                ? "No movies match your filters"
                : `${filteredMovies.length} movie${filteredMovies.length !== 1 ? "s" : ""}`}
              {searchQuery && (
                <span className="text-gray-400">
                  {" "}
                  for{" "}
                  <span className="text-white font-medium">{searchQuery}</span>
                </span>
              )}
              {selectedGenre !== "all" && (
                <span className="text-gray-400">
                  {" "}
                  in{" "}
                  <span className="text-white font-medium">
                    {selectedGenre}
                  </span>
                </span>
              )}
            </p>

            <button
              onClick={clearFilters}
              className="text-gray-600 hover:text-red-400
                         text-xs transition flex items-center
                         gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>
        )}

        {/* Movie Grid */}
        {filteredMovies.length > 0 ? (
          <div
            className="grid grid-cols-2 sm:grid-cols-3
                          md:grid-cols-4 lg:grid-cols-5
                          xl:grid-cols-6 gap-4"
          >
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center
                          justify-center py-24 gap-4"
          >
            <div
              className="w-16 h-16 bg-gray-900 border
                            border-gray-800 rounded-2xl flex
                            items-center justify-center"
            >
              <Film className="w-8 h-8 text-gray-600" />
            </div>
            <div className="text-center">
              <p
                className="text-white font-semibold text-lg
                             mb-1"
              >
                {hasActiveFilters ? "No movies match" : "No movies yet"}
              </p>
              <p className="text-gray-500 text-sm">
                {hasActiveFilters
                  ? "Try different filters or search terms"
                  : "Ask your admin to add movies from the Browse page"}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="bg-red-600 hover:bg-red-700
                           text-white text-sm px-5 py-2.5
                           rounded-xl transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
