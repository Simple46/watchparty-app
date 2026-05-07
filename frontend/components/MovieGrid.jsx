"use client";

import MovieCard from "./MovieCard";
import { Film, Search } from "lucide-react";

export default function MovieGrid({ movies, searchQuery }) {
  // Empty state when no movies exist at all
  if (movies.length === 0 && !searchQuery) {
    return (
      <div
        className="flex flex-col items-center justify-center
                      py-24 gap-4"
      >
        <div
          className="w-20 h-20 bg-gray-900 border border-gray-800
                        rounded-2xl flex items-center justify-center"
        >
          <Film className="w-10 h-10 text-gray-700" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">No movies yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Check back soon — new movies are being added
          </p>
        </div>
      </div>
    );
  }

  // Empty state when search returns no results
  if (movies.length === 0 && searchQuery) {
    return (
      <div
        className="flex flex-col items-center justify-center
                      py-24 gap-4"
      >
        <div
          className="w-20 h-20 bg-gray-900 border border-gray-800
                        rounded-2xl flex items-center justify-center"
        >
          <Search className="w-10 h-10 text-gray-700" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">
            No results for {searchQuery}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Try searching for a different title
          </p>
        </div>
      </div>
    );
  }

  return (
    // Responsive grid
    // 1 column on mobile
    // 2 columns on small screens
    // 3 columns on medium screens
    // 4 columns on large screens
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3
                    lg:grid-cols-4 gap-5"
    >
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
