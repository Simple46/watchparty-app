"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
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
  Wifi,
  Users,
  X,
  Film,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Grid3X3,
  LayoutGrid,
  Rows3,
} from "lucide-react";

// ─── ITEMS PER PAGE OPTIONS ───
const PAGE_SIZE_OPTIONS = [12, 24, 48];

// ─── INNER CONTENT ───
function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [movies, setMovies] = useState([]);
  const [activeStreams, setActiveStreams] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

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

  useEffect(() => {
    let isMounted = true;

    const fetchActiveStreams = async () => {
      try {
        const response = await api.get("/api/rooms/active-p2p");
        if (isMounted) {
          setActiveStreams(response.data.rooms || []);
        }
      } catch (err) {
        console.error("Fetch active streams error:", err);
      }
    };

    fetchActiveStreams();
    const interval = setInterval(fetchActiveStreams, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sync search query from navbar URL param
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGenre, sortBy, itemsPerPage]);

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

  // Pagination logic
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMovies = filteredMovies.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGenre("all");
    setSortBy("newest");
    setCurrentPage(1);
    router.push("/");
  };

  const hasActiveFilters =
    searchQuery || selectedGenre !== "all" || sortBy !== "newest";

  const sortOptions = [
    { value: "newest", label: "Newest First", icon: Clock },
    { value: "oldest", label: "Oldest First", icon: Clock },
    { value: "az", label: "A → Z", icon: ArrowUpAZ },
    { value: "za", label: "Z → A", icon: ArrowDownAZ },
    { value: "rating", label: "Top Rated", icon: Star },
    { value: "popular", label: "Most Watched", icon: Flame },
  ];

  // ─── SKELETON LOADING ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-800 rounded-xl aspect-[2/3] mb-3" />
                <div className="bg-gray-800 rounded h-4 w-3/4 mb-2" />
                <div className="bg-gray-800 rounded h-3 w-1/2" />
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
          <div className="mb-8 sm:mb-10">
            <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-black mb-2">
              Watch Together
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Pick a movie, create a room, share the code. Watch in sync with
              your friends.
            </p>
          </div>
        )}

        {activeStreams.length > 0 && (
          <section className="mb-8 sm:mb-10" aria-labelledby="live-streams-title">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <h2
                    id="live-streams-title"
                    className="text-lg font-bold text-white sm:text-xl"
                  >
                    Live streams
                  </h2>
                </div>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  Join someone watching from their device
                </p>
              </div>
              <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300">
                {activeStreams.length} live
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeStreams.map((stream) => (
                <Link
                  key={stream.roomCode}
                  href={`/room/${stream.roomCode}?mode=p2p`}
                  className="group flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 transition hover:-translate-y-0.5 hover:border-red-500/40 hover:bg-gray-900/80 hover:shadow-lg hover:shadow-red-950/20"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-600/10 transition group-hover:bg-red-600/20">
                    <Wifi className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white transition group-hover:text-red-200">
                      {stream.host?.name || "Community stream"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Streaming from their device
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                      <Users className="h-3.5 w-3.5" />
                      {stream._count.members} watching
                    </div>
                  </div>
                  <span className="flex-shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-red-500">
                    Join
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Top row — search + filter toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search movies, genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 text-white placeholder-gray-500 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gray-600 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition flex-shrink-0
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
                <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
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
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
                  Sort By
                </p>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition
                        ${sortBy === option.value ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}
                      `}
                    >
                      <option.icon className="w-3 h-3" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {genres.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
                    Genre
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedGenre("all")}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-medium transition
                        ${selectedGenre === "all" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}
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
                          px-3 py-1.5 rounded-lg text-xs font-medium transition
                          ${selectedGenre === genre ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}
                        `}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-gray-500 hover:text-red-400 text-xs transition"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Quick sort pills */}
          {!showFilters && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0
                    ${sortBy === option.value ? "bg-red-600 text-white" : "bg-gray-900 border border-gray-800 text-gray-500 hover:text-white"}
                  `}
                >
                  <option.icon className="w-3 h-3" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results Summary + Per Page */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
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
                <span className="text-white font-medium">{selectedGenre}</span>
              </span>
            )}
          </p>

          <div className="flex items-center gap-3">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">Show:</span>
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="appearance-none bg-gray-900 border border-gray-800 text-white text-xs rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-gray-600 transition cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-gray-600 hover:text-red-400 text-xs transition flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Movie Grid - 1 col mobile, 2 tablet, 3-4 desktop */}
        {paginatedMovies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {paginatedMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center">
              <Film className="w-8 h-8 text-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg mb-1">
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
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-5 py-2.5 rounded-xl transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {filteredMovies.length > itemsPerPage && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-800">
            {/* Page info */}
            <p className="text-gray-500 text-xs sm:text-sm">
              Showing{" "}
              <span className="text-white font-medium">{startIndex + 1}</span> —{" "}
              <span className="text-white font-medium">
                {Math.min(startIndex + itemsPerPage, filteredMovies.length)}
              </span>{" "}
              of{" "}
              <span className="text-white font-medium">
                {filteredMovies.length}
              </span>{" "}
              movies
            </p>

            {/* Page controls */}
            <div className="flex items-center gap-1.5">
              {/* Previous */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition disabled:opacity-30 disabled:cursor-not-allowed bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first, last, current, and neighbors
                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    );
                  })
                  .reduce((acc, page, idx, arr) => {
                    if (idx > 0 && arr[idx - 1] !== page - 1) {
                      acc.push("...");
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="text-gray-600 text-xs px-2"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => goToPage(item)}
                        className={`
                          w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition
                          ${currentPage === item ? "bg-red-600 text-white" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"}
                        `}
                      >
                        {item}
                      </button>
                    ),
                  )}
              </div>

              {/* Next */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition disabled:opacity-30 disabled:cursor-not-allowed bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function HomePageLoading() {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-800 rounded-xl aspect-[2/3] mb-3" />
              <div className="bg-gray-800 rounded h-4 w-3/4 mb-2" />
              <div className="bg-gray-800 rounded h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main export wrapped in Suspense
export default function HomePage() {
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageContent />
    </Suspense>
  );
}
