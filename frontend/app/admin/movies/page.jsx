"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Film,
  Upload,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  Search,
} from "lucide-react";
import DeleteModal from "../../../components/admin/DeleteModal";
import StorageBar from "../../../components/admin/StorageBar";
import api from "../../../lib/api";

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    movieId: null,
    movieTitle: "",
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Inline edit state
  // When admin clicks Edit on a movie, that movie goes into edit mode
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [editLoading, setEditLoading] = useState(false);

  // Fetch movies and dashboard stats together
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [moviesRes, statsRes] = await Promise.all([
        api.get("/api/admin/movies"),
        api.get("/api/admin/dashboard"),
      ]);

      setMovies(moviesRes.data.movies);
      setFilteredMovies(moviesRes.data.movies);
      setStats(statsRes.data);
    } catch (err) {
      setError("Failed to load movies. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter movies based on search query
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

  // ─── FORMAT DURATION ───
  const formatDuration = (seconds) => {
    if (!seconds) return "Unknown";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // ─── FORMAT DATE ───
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ─── OPEN DELETE MODAL ───
  const openDeleteModal = (movie) => {
    setDeleteModal({
      isOpen: true,
      movieId: movie.id,
      movieTitle: movie.title,
    });
  };

  // ─── CONFIRM DELETE ───
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/admin/movies/${deleteModal.movieId}`);

      // Remove from local state — no need to refetch from server
      setMovies((prev) => prev.filter((m) => m.id !== deleteModal.movieId));
      setDeleteModal({ isOpen: false, movieId: null, movieTitle: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete. Try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── START EDITING A MOVIE ───
  const startEdit = (movie) => {
    setEditingId(movie.id);
    setEditForm({
      title: movie.title,
      description: movie.description || "",
    });
  };

  // ─── CANCEL EDITING ───
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: "", description: "" });
  };

  // ─── SAVE EDIT ───
  const saveEdit = async (movieId) => {
    if (!editForm.title.trim()) return;

    setEditLoading(true);
    try {
      const response = await api.put(`/api/admin/movies/${movieId}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
      });

      // Update the movie in local state
      setMovies((prev) =>
        prev.map((m) => (m.id === movieId ? response.data.movie : m)),
      );
      setEditingId(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update. Try again.");
    } finally {
      setEditLoading(false);
    }
  };

  // ─── LOADING STATE ───
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-800 rounded w-40 animate-pulse" />
        <div className="h-12 bg-gray-800 rounded-xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // ─── ERROR STATE ───
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center
                      min-h-64 gap-4"
      >
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchData}
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

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Movies</h1>
          <p className="text-gray-400 text-sm mt-1">
            {movies.length} movie{movies.length !== 1 ? "s" : ""} in your
            library
          </p>
        </div>
        <Link href="/admin/upload">
          <button
            className="flex items-center gap-2 bg-red-600
                       hover:bg-red-700 text-white text-sm font-medium
                       px-4 py-2.5 rounded-lg transition"
          >
            <Upload className="w-4 h-4" />
            Upload Movie
          </button>
        </Link>
      </div>

      {/* Storage Bar */}
      {stats && (
        <StorageBar
          usedGB={stats.storage.usedGB}
          limitGB={stats.storage.limitGB}
          percentage={stats.storage.percentage}
        />
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2
                     w-4 h-4 text-gray-500"
        />
        <input
          type="text"
          placeholder="Search movies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-900 text-white placeholder-gray-500
                     border border-gray-700 rounded-xl pl-11 pr-4 py-3
                     text-sm focus:outline-none focus:border-red-500
                     focus:ring-1 focus:ring-red-500 transition"
        />
      </div>

      {/* Empty State */}
      {filteredMovies.length === 0 && (
        <div
          className="flex flex-col items-center justify-center
                        py-20 gap-4"
        >
          <div
            className="w-16 h-16 bg-gray-800 rounded-2xl flex
                          items-center justify-center"
          >
            <Film className="w-8 h-8 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">
              {searchQuery ? "No movies match your search" : "No movies yet"}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {searchQuery
                ? "Try a different search term"
                : "Upload your first movie to get started"}
            </p>
          </div>
          {!searchQuery && (
            <Link href="/admin/upload">
              <button
                className="flex items-center gap-2 bg-red-600
                           hover:bg-red-700 text-white text-sm px-4
                           py-2.5 rounded-lg transition"
              >
                <Upload className="w-4 h-4" />
                Upload First Movie
              </button>
            </Link>
          )}
        </div>
      )}

      {/* Movies List */}
      {filteredMovies.length > 0 && (
        <div className="space-y-3">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              className="bg-gray-900 border border-gray-800
                         hover:border-gray-700 rounded-xl p-4
                         transition"
            >
              {editingId === movie.id ? (
                // ─── EDIT MODE ───
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    className="w-full bg-gray-800 text-white border
                               border-gray-600 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:border-red-500"
                    placeholder="Movie title"
                    autoFocus
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 text-white border
                               border-gray-600 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:border-red-500
                               resize-none"
                    placeholder="Description (optional)"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(movie.id)}
                      disabled={editLoading || !editForm.title.trim()}
                      className="flex items-center gap-1.5 bg-green-600
                                 hover:bg-green-700 disabled:opacity-50
                                 text-white text-xs px-3 py-2 rounded-lg
                                 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {editLoading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={editLoading}
                      className="flex items-center gap-1.5 bg-gray-700
                                 hover:bg-gray-600 text-white text-xs
                                 px-3 py-2 rounded-lg transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // ─── VIEW MODE ───
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div
                    className="w-20 h-12 bg-gray-800 rounded-lg
                                  flex-shrink-0 overflow-hidden"
                  >
                    {movie.thumbnail ? (
                      <img
                        src={movie.thumbnail}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center
                                      justify-center"
                      >
                        <Film className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Movie Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {movie.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-gray-500 text-xs">
                        {formatDate(movie.createdAt)}
                      </span>
                      {movie.size && (
                        <>
                          <span className="text-gray-700">·</span>
                          <span className="text-gray-500 text-xs">
                            {movie.size.toFixed(1)} MB
                          </span>
                        </>
                      )}
                      {movie.duration && (
                        <>
                          <span className="text-gray-700">·</span>
                          <span className="text-gray-500 text-xs">
                            {formatDuration(movie.duration)}
                          </span>
                        </>
                      )}
                      {movie._count?.rooms > 0 && (
                        <>
                          <span className="text-gray-700">·</span>
                          <span
                            className="text-green-400 text-xs
                                         font-medium"
                          >
                            {movie._count.rooms} active room
                            {movie._count.rooms !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(movie)}
                      className="flex items-center gap-1.5 text-gray-400
                                 hover:text-white bg-gray-800
                                 hover:bg-gray-700 text-xs px-3 py-2
                                 rounded-lg transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(movie)}
                      className="flex items-center gap-1.5 text-gray-400
                                 hover:text-red-400 bg-gray-800
                                 hover:bg-red-600/10 text-xs px-3 py-2
                                 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        movieTitle={deleteModal.movieTitle}
        onConfirm={handleDelete}
        onCancel={() =>
          setDeleteModal({ isOpen: false, movieId: null, movieTitle: "" })
        }
        loading={deleteLoading}
      />
    </div>
  );
}
