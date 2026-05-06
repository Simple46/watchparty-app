"use client";

import { useState, useEffect } from "react";
import { Users, Tv, Clock, RefreshCw } from "lucide-react";
import api from "../../../lib/api";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/admin/rooms");
      setRooms(response.data.rooms);
    } catch (err) {
      setError("Failed to load rooms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Format date nicely
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Separate active and inactive rooms
  const activeRooms = rooms.filter((r) => r.isActive);
  const inactiveRooms = rooms.filter((r) => !r.isActive);

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-800 rounded w-40 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // ─── ERROR ───
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center
                      min-h-64 gap-4"
      >
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchRooms}
          className="flex items-center gap-2 px-4 py-2 bg-red-600
                     hover:bg-red-700 text-white text-sm rounded-lg
                     transition"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // ─── ROOM CARD ───
  const RoomCard = ({ room }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Left — movie thumbnail and info */}
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-10 bg-gray-800 rounded-lg
                          flex-shrink-0 overflow-hidden"
          >
            {room.movie?.thumbnail ? (
              <img
                src={room.movie.thumbnail}
                alt={room.movie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center
                              justify-center"
              >
                <Tv className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-medium text-sm">
              {room.movie?.title || "Unknown Movie"}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {/* Room code */}
              <span
                className="bg-gray-800 text-gray-300 text-xs
                               px-2 py-0.5 rounded font-mono"
              >
                {room.roomCode}
              </span>
              {/* Member count */}
              <span
                className="flex items-center gap-1 text-gray-500
                               text-xs"
              >
                <Users className="w-3 h-3" />
                {room._count?.members ?? 0} member
                {room._count?.members !== 1 ? "s" : ""}
              </span>
              {/* Created at */}
              <span
                className="flex items-center gap-1 text-gray-500
                               text-xs"
              >
                <Clock className="w-3 h-3" />
                {formatDate(room.createdAt)}
              </span>
            </div>
            {/* Host info */}
            <p className="text-gray-500 text-xs mt-1">
              Host:{" "}
              <span className="text-gray-400">
                {room.host?.name || "Unknown"}
              </span>
            </p>
          </div>
        </div>

        {/* Right — active/inactive badge */}
        <div className="flex-shrink-0">
          <span
            className={`
              text-xs font-medium px-2.5 py-1 rounded-full
              ${
                room.isActive
                  ? "bg-green-600/20 text-green-400 border border-green-600/30"
                  : "bg-gray-700 text-gray-400"
              }
            `}
          >
            {room.isActive ? "● Active" : "Ended"}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Watch Rooms</h1>
          <p className="text-gray-400 text-sm mt-1">
            {activeRooms.length} active · {inactiveRooms.length} ended
          </p>
        </div>
        <button
          onClick={fetchRooms}
          className="flex items-center gap-2 text-gray-400
                     hover:text-white text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Empty State */}
      {rooms.length === 0 && (
        <div
          className="flex flex-col items-center justify-center
                        py-20 gap-4"
        >
          <div
            className="w-16 h-16 bg-gray-800 rounded-2xl flex
                          items-center justify-center"
          >
            <Tv className="w-8 h-8 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">No rooms yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Rooms will appear here when users start watch parties
            </p>
          </div>
        </div>
      )}

      {/* Active Rooms */}
      {activeRooms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-2 h-2 bg-green-500 rounded-full
                            animate-pulse"
            />
            <h2 className="text-white font-semibold text-sm">
              Active Right Now ({activeRooms.length})
            </h2>
          </div>
          <div className="space-y-3">
            {activeRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </div>
      )}

      {/* Past Rooms */}
      {inactiveRooms.length > 0 && (
        <div>
          <h2 className="text-gray-400 font-semibold text-sm mb-4">
            Past Rooms ({inactiveRooms.length})
          </h2>
          <div className="space-y-3">
            {inactiveRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
