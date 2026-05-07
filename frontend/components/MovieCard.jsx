"use client";

import Link from "next/link";
import { Play, Users, Clock, Film } from "lucide-react";

export default function MovieCard({ movie }) {
  // Convert seconds to hours and minutes display
  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Number of active rooms watching this movie right now
  const activeRooms = movie._count?.rooms || 0;

  return (
    <Link href={`/movies/${movie.id}`}>
      <div
        className="group bg-gray-900 border border-gray-800
                      hover:border-red-600/40 rounded-xl overflow-hidden
                      transition-all duration-300 cursor-pointer
                      hover:-translate-y-1 hover:shadow-2xl
                      hover:shadow-red-600/10"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-800 overflow-hidden">
          {movie.thumbnail ? (
            <img
              src={movie.thumbnail}
              alt={movie.title}
              className="w-full h-full object-cover group-hover:scale-105
                         transition-transform duration-500"
            />
          ) : (
            // Placeholder when no thumbnail
            <div
              className="w-full h-full flex items-center
                            justify-center bg-gray-800"
            >
              <Film className="w-12 h-12 text-gray-700" />
            </div>
          )}

          {/* Dark overlay on hover */}
          <div
            className="absolute inset-0 bg-black/0 group-hover:bg-black/40
                          transition-all duration-300"
          />

          {/* Play button that appears on hover */}
          <div
            className="absolute inset-0 flex items-center
                          justify-center opacity-0 group-hover:opacity-100
                          transition-all duration-300"
          >
            <div
              className="w-14 h-14 bg-red-600 rounded-full flex
                            items-center justify-center shadow-lg
                            transform scale-75 group-hover:scale-100
                            transition-transform duration-300"
            >
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>

          {/* Active rooms badge */}
          {activeRooms > 0 && (
            <div
              className="absolute top-2 left-2 flex items-center
                            gap-1.5 bg-green-600/90 backdrop-blur-sm
                            text-white text-xs font-medium px-2 py-1
                            rounded-full"
            >
              <div
                className="w-1.5 h-1.5 bg-white rounded-full
                              animate-pulse"
              />
              {activeRooms} watching
            </div>
          )}

          {/* Duration badge */}
          {movie.duration && (
            <div
              className="absolute bottom-2 right-2 flex items-center
                            gap-1 bg-black/70 backdrop-blur-sm text-white
                            text-xs px-2 py-1 rounded-md"
            >
              <Clock className="w-3 h-3" />
              {formatDuration(movie.duration)}
            </div>
          )}
        </div>

        {/* Card content */}
        <div className="p-4">
          <h3
            className="text-white font-semibold text-sm leading-snug
                         line-clamp-1 group-hover:text-red-400 transition"
          >
            {movie.title}
          </h3>

          {movie.description && (
            <p
              className="text-gray-500 text-xs mt-1 line-clamp-2
                          leading-relaxed"
            >
              {movie.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-3">
            {/* Rooms info */}
            {activeRooms > 0 ? (
              <div
                className="flex items-center gap-1.5 text-green-400
                              text-xs font-medium"
              >
                <Users className="w-3.5 h-3.5" />
                {activeRooms} active room{activeRooms !== 1 ? "s" : ""}
              </div>
            ) : (
              <span className="text-gray-600 text-xs">No active rooms</span>
            )}

            {/* Watch button */}
            <div
              className="text-red-400 text-xs font-medium
                            group-hover:text-red-300 transition flex
                            items-center gap-1"
            >
              Watch
              <Play className="w-3 h-3 fill-current" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
