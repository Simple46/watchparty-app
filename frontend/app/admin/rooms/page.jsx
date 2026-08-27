"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  Users,
  Film,
  Clock,
  CheckCircle,
  XCircle,
  Crown,
  Loader,
  Power,
} from "lucide-react";
import api from "../../../lib/api";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closingId, setClosingId] = useState(null);
  const [activeTab, setActiveTab] = useState("active");
  const [confirmId, setConfirmId] = useState(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/admin/rooms");
      setRooms(res.data.rooms || []);
    } catch (err) {
      setError("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCloseRoom = async (roomId) => {
    setClosingId(roomId);
    try {
      await api.post(`/api/admin/rooms/${roomId}/close`);
      // Update room in local state immediately
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, isActive: false } : r)),
      );
      setConfirmId(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to close room");
    } finally {
      setClosingId(null);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getRoomAge = (createdAt) => {
    const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
    if (mins < 60) return `${mins}m old`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h old`;
    return `${Math.floor(hours / 24)}d old`;
  };

  const isStale = (createdAt) =>
    Date.now() - new Date(createdAt) > 24 * 60 * 60 * 1000;

  const activeRooms = rooms.filter((r) => r.isActive);
  const closedRooms = rooms.filter((r) => !r.isActive);
  const displayRooms = activeTab === "active" ? activeRooms : closedRooms;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-gray-800 rounded w-32 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Rooms</h1>
          <p className="text-gray-400 text-sm mt-1">
            {activeRooms.length} active · {closedRooms.length} closed
          </p>
        </div>
        <button
          onClick={fetchRooms}
          className="flex items-center gap-2 bg-gray-800
                     hover:bg-gray-700 border border-gray-700
                     text-white text-sm px-4 py-2 rounded-lg
                     transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stale rooms warning */}
      {activeRooms.filter((r) => isStale(r.createdAt)).length > 0 && (
        <div
          className="bg-yellow-500/10 border border-yellow-500/20
                        rounded-xl p-4 flex items-start gap-3"
        >
          <Clock className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-400 text-sm font-medium">
              {activeRooms.filter((r) => isStale(r.createdAt)).length} room(s)
              older than 24 hours
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              These will be closed automatically by the scheduler on its next
              hourly run.
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {[
          {
            id: "active",
            label: "Active",
            count: activeRooms.length,
          },
          {
            id: "closed",
            label: "Closed",
            count: closedRooms.length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm
              font-medium border-b-2 transition
              ${
                activeTab === tab.id
                  ? "text-white border-red-500"
                  : "text-gray-500 border-transparent hover:text-gray-400"
              }
            `}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? "bg-gray-700 text-white"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {displayRooms.length === 0 && (
        <div className="text-center py-16">
          <div
            className="w-14 h-14 bg-gray-900 border
                          border-gray-800 rounded-2xl flex
                          items-center justify-center mx-auto mb-4"
          >
            {activeTab === "active" ? (
              <CheckCircle className="w-7 h-7 text-gray-600" />
            ) : (
              <XCircle className="w-7 h-7 text-gray-600" />
            )}
          </div>
          <p className="text-gray-400 text-sm">No {activeTab} rooms</p>
        </div>
      )}

      {/* Rooms list */}
      <div className="space-y-3">
        {displayRooms.map((room) => (
          <div
            key={room.id}
            className={`bg-gray-900 border rounded-xl p-4 transition ${
              isStale(room.createdAt) && room.isActive
                ? "border-yellow-600/30"
                : "border-gray-800"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Room info */}
              <div className="flex-1 min-w-0">
                {/* Room code + status */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-white font-mono font-bold text-sm bg-gray-800 px-2 py-0.5 rounded">
                    {room.roomCode}
                  </span>
                  {room.isActive ? (
                    <span className="flex items-center gap-1 text-green-400 text-xs">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs">Closed</span>
                  )}
                  {isStale(room.createdAt) && room.isActive && (
                    <span className="text-yellow-400 text-xs bg-yellow-500/10 px-2 py-0.5 rounded-full">
                      ⚠ Stale
                    </span>
                  )}
                </div>

                {/* Movie */}
                {room.movie && (
                  <div className="flex items-center gap-2 mb-2">
                    <Film className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <p className="text-gray-300 text-sm truncate">
                      {room.movie.title}
                    </p>
                  </div>
                )}

                {/* Host */}
                {room.host && (
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                    <p className="text-gray-400 text-xs">{room.host.name}</p>
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-gray-500 text-xs">
                      {room._count?.members || 0} member
                      {room._count?.members !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-gray-500 text-xs">
                      {formatDate(room.createdAt)} ·{" "}
                      <span
                        className={
                          isStale(room.createdAt) && room.isActive
                            ? "text-yellow-400"
                            : ""
                        }
                      >
                        {getRoomAge(room.createdAt)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Close button — only for active rooms */}
              {room.isActive && (
                <div className="flex-shrink-0">
                  {confirmId === room.id ? (
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-yellow-400 text-xs">
                        Close this room?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-gray-400 hover:text-white
                                     text-xs px-3 py-1.5 bg-gray-800
                                     rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleCloseRoom(room.id)}
                          disabled={closingId === room.id}
                          className="flex items-center gap-1.5
                                     text-white text-xs px-3 py-1.5
                                     bg-red-600 hover:bg-red-700
                                     disabled:opacity-60 rounded-lg
                                     transition"
                        >
                          {closingId === room.id ? (
                            <Loader className="w-3 h-3 animate-spin" />
                          ) : (
                            <Power className="w-3 h-3" />
                          )}
                          Confirm
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(room.id)}
                      className="flex items-center gap-1.5
                                 text-gray-400 hover:text-red-400
                                 bg-gray-800 hover:bg-red-600/10
                                 border border-gray-700
                                 hover:border-red-600/30
                                 text-xs px-3 py-2 rounded-lg
                                 transition"
                    >
                      <Power className="w-3.5 h-3.5" />
                      Close Room
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
