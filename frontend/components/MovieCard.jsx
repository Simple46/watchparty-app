"use client";

import Link from "next/link";
import { Play, Star, Clock, Film, Users } from "lucide-react";

export default function MovieCard({ movie }) {
  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const activeRooms = movie._count?.rooms || 0;

  return (
    <Link href={`/movies/${movie.id}`} className="block">
      <div className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-red-600/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-600/10 cursor-pointer">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-800 overflow-hidden">
          {movie.thumbnail ? (
            <img
              src={movie.thumbnail}
              alt={movie.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <Film className="w-12 h-12 text-gray-700" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />

          {/* Play button on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>

          {/* Watching badge */}
          {activeRooms > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-green-600/90 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              {activeRooms} watching
            </div>
          )}

          {/* Duration badge */}
          {movie.duration && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
              <Clock className="w-3 h-3" />
              {formatDuration(movie.duration)}
            </div>
          )}
        </div>

        {/* Info — always visible */}
        <div className="p-3">
          <h3 className="text-white font-semibold text-sm truncate group-hover:text-red-400 transition-colors">
            {movie.title}
          </h3>

          <div className="flex items-center gap-2 mt-1.5">
            {movie.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 text-xs font-medium">
                  {movie.rating.toFixed(1)}
                </span>
              </div>
            )}

            {movie.releaseYear && (
              <span className="text-gray-500 text-xs">{movie.releaseYear}</span>
            )}

            {movie.genres && (
              <span className="text-gray-600 text-xs truncate">
                {movie.genres.split(",")[0]}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            {activeRooms > 0 ? (
              <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                <Users className="w-3.5 h-3.5" />
                {activeRooms} active room{activeRooms !== 1 ? "s" : ""}
              </div>
            ) : (
              <span className="text-gray-600 text-xs">No active rooms</span>
            )}

            <div className="text-red-400 text-xs font-medium group-hover:text-red-300 transition flex items-center gap-1">
              Watch
              <Play className="w-3 h-3 fill-current" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
