"use client";

import { useState, useEffect, useRef } from "react";
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
  Image,
  ArrowUpAZ,
  ArrowDownAZ,
  Clock,
  HardDrive,
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

  // Sorting state
  const [sortBy, setSortBy] = useState("newest");
  // Options: newest, oldest, az, za, largest, smallest

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    movieId: null,
    movieTitle: "",
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
  });
  const [editLoading, setEditLoading] = useState(false);

  // Thumbnail edit state
  const [newThumbnailFile, setNewThumbnailFile] = useState(null);
  const [newThumbnailPreview, setNewThumbnailPreview] = useState(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbnailInputRef = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [moviesRes, statsRes] = await Promise.all([
        api.get("/api/admin/movies"),
        api.get("/api/admin/dashboard"),
      ]);
      setMovies(moviesRes.data.movies);
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

  // Filter and sort movies
  useEffect(() => {
    let result = [...movies];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (movie) =>
          movie.title.toLowerCase().includes(query) ||
          movie.description?.toLowerCase().includes(query),
      );
    }

    // Apply sort
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
      case "largest":
        result.sort((a, b) => (b.size || 0) - (a.size || 0));
        break;
      case "smallest":
        result.sort((a, b) => (a.size || 0) - (b.size || 0));
        break;
      default:
        break;
    }

    setFilteredMovies(result);
  }, [searchQuery, movies, sortBy]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const openDeleteModal = (movie) => {
    setDeleteModal({
      isOpen: true,
      movieId: movie.id,
      movieTitle: movie.title,
    });
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/admin/movies/${deleteModal.movieId}`);
      setMovies((prev) => prev.filter((m) => m.id !== deleteModal.movieId));
      setDeleteModal({
        isOpen: false,
        movieId: null,
        movieTitle: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete. Try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const startEdit = (movie) => {
    setEditingId(movie.id);
    setEditForm({
      title: movie.title,
      description: movie.description || "",
    });
    setNewThumbnailFile(null);
    setNewThumbnailPreview(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: "", description: "" });
    setNewThumbnailFile(null);
    setNewThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  // Handle new thumbnail selection during edit
  const handleNewThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewThumbnailFile(file);
    setNewThumbnailPreview(URL.createObjectURL(file));
  };

  // Upload new thumbnail to Cloudinary
  const uploadNewThumbnail = async () => {
    if (!newThumbnailFile) return null;

    setThumbnailUploading(true);
    try {
      // Get signature for image upload
      const sigResponse = await api.get(
        "/api/admin/cloudinary-signature?type=image",
      );
      const { signature, timestamp, folder, cloudName, apiKey } =
        sigResponse.data;

      const formData = new FormData();
      formData.append("file", newThumbnailFile);
      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("folder", folder);
      formData.append("api_key", apiKey);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Thumbnail upload failed");
      }

      return result.secure_url;
    } finally {
      setThumbnailUploading(false);
    }
  };

  const saveEdit = async (movieId) => {
    if (!editForm.title.trim()) return;

    setEditLoading(true);
    try {
      // Upload new thumbnail first if one was selected
      let thumbnailUrl = undefined;
      if (newThumbnailFile) {
        thumbnailUrl = await uploadNewThumbnail();
      }

      // Build update payload
      const updateData = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
      };

      // Only include thumbnail if a new one was uploaded
      if (thumbnailUrl !== undefined) {
        updateData.thumbnail = thumbnailUrl;
      }

      const response = await api.put(
        `/api/admin/movies/${movieId}`,
        updateData,
      );

      setMovies((prev) =>
        prev.map((m) => (m.id === movieId ? response.data.movie : m)),
      );

      setEditingId(null);
      setNewThumbnailFile(null);
      setNewThumbnailPreview(null);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to update. Try again.",
      );
    } finally {
      setEditLoading(false);
    }
  };

  // Sort button config
  const sortOptions = [
    {
      value: "newest",
      label: "Newest",
      icon: Clock,
    },
    {
      value: "oldest",
      label: "Oldest",
      icon: Clock,
    },
    {
      value: "az",
      label: "A → Z",
      icon: ArrowUpAZ,
    },
    {
      value: "za",
      label: "Z → A",
      icon: ArrowDownAZ,
    },
    {
      value: "largest",
      label: "Largest",
      icon: HardDrive,
    },
    {
      value: "smallest",
      label: "Smallest",
      icon: HardDrive,
    },
  ];

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Movies</h1>
          <p className="text-gray-400 text-sm mt-1">
            {movies.length} movie
            {movies.length !== 1 ? "s" : ""} in your library
          </p>
        </div>
        <Link href="/admin/upload">
          <button
            className="flex items-center gap-2 bg-red-600
                             hover:bg-red-700 text-white text-sm
                             font-medium px-4 py-2.5 rounded-lg
                             transition"
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

      {/* Search + Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2
                             -translate-y-1/2 w-4 h-4
                             text-gray-500"
          />
          <input
            type="text"
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 text-white
                       placeholder-gray-500 border border-gray-700
                       rounded-xl pl-11 pr-4 py-3 text-sm
                       focus:outline-none focus:border-red-500
                       transition"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none bg-gray-900 text-white
                       border border-gray-700 rounded-xl px-4
                       py-3 text-sm focus:outline-none
                       focus:border-red-500 transition
                       cursor-pointer pr-10 min-w-36"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2
                          pointer-events-none"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Results count when filtering */}
      {(searchQuery || sortBy !== "newest") && (
        <p className="text-gray-500 text-xs">
          Showing {filteredMovies.length} of {movies.length} movies
          {searchQuery && ` matching "${searchQuery}"`} · Sorted by{" "}
          {sortOptions.find((o) => o.value === sortBy)?.label}
        </p>
      )}

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
                className="flex items-center gap-2
                                 bg-red-600 hover:bg-red-700
                                 text-white text-sm px-4 py-2.5
                                 rounded-lg transition"
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
                <div className="space-y-4">
                  {/* Title input */}
                  <div>
                    <label
                      className="text-gray-400 text-xs
                                      mb-1 block"
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          title: e.target.value,
                        })
                      }
                      className="w-full bg-gray-800 text-white
                                 border border-gray-600 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none
                                 focus:border-red-500"
                      placeholder="Movie title"
                      autoFocus
                    />
                  </div>

                  {/* Description input */}
                  <div>
                    <label
                      className="text-gray-400 text-xs
                                      mb-1 block"
                    >
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full bg-gray-800 text-white
                                 border border-gray-600 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none
                                 focus:border-red-500 resize-none"
                      placeholder="Description (optional)"
                      rows={2}
                    />
                  </div>

                  {/* Thumbnail edit */}
                  <div>
                    <label
                      className="text-gray-400 text-xs
                                      mb-2 block"
                    >
                      Cover Image
                    </label>

                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleNewThumbnailSelect}
                      className="hidden"
                    />

                    <div className="flex items-center gap-4">
                      {/* Current thumbnail preview */}
                      <div
                        className="w-24 h-14 bg-gray-800
                                      rounded-lg overflow-hidden
                                      border border-gray-700
                                      flex-shrink-0"
                      >
                        {newThumbnailPreview ? (
                          // Show newly selected thumbnail
                          <img
                            src={newThumbnailPreview}
                            alt="New thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : movie.thumbnail ? (
                          // Show existing thumbnail
                          <img
                            src={movie.thumbnail}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex
                                          items-center justify-center"
                          >
                            <Film className="w-6 h-6 text-gray-600" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {/* Change thumbnail button */}
                        <button
                          type="button"
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="flex items-center gap-2
                                     bg-gray-700 hover:bg-gray-600
                                     text-white text-xs px-3 py-2
                                     rounded-lg transition"
                        >
                          <Image className="w-3.5 h-3.5" />
                          {newThumbnailFile ? "Change Image" : "Update Cover"}
                        </button>

                        {/* Remove new selection */}
                        {newThumbnailFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewThumbnailFile(null);
                              setNewThumbnailPreview(null);
                              if (thumbnailInputRef.current)
                                thumbnailInputRef.current.value = "";
                            }}
                            className="text-gray-500
                                       hover:text-red-400 text-xs
                                       transition text-left"
                          >
                            Cancel new image
                          </button>
                        )}

                        {newThumbnailFile && (
                          <p className="text-green-400 text-xs">
                            ✓ New image selected
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Save/Cancel buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => saveEdit(movie.id)}
                      disabled={
                        editLoading ||
                        thumbnailUploading ||
                        !editForm.title.trim()
                      }
                      className="flex items-center gap-1.5
                                 bg-green-600 hover:bg-green-700
                                 disabled:opacity-50 text-white
                                 text-xs px-4 py-2 rounded-lg
                                 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {thumbnailUploading
                        ? "Uploading image..."
                        : editLoading
                          ? "Saving..."
                          : "Save Changes"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={editLoading || thumbnailUploading}
                      className="flex items-center gap-1.5
                                 bg-gray-700 hover:bg-gray-600
                                 text-white text-xs px-4 py-2
                                 rounded-lg transition"
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
                                  flex-shrink-0 overflow-hidden
                                  border border-gray-700"
                  >
                    {movie.thumbnail ? (
                      <img
                        src={movie.thumbnail}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex
                                      items-center justify-center"
                      >
                        <Film className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Movie Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-white font-medium text-sm
                                  truncate"
                    >
                      {movie.title}
                    </p>
                    <div
                      className="flex items-center gap-3 mt-1
                                    flex-wrap"
                    >
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
                  <div
                    className="flex items-center gap-2
                                  flex-shrink-0"
                  >
                    <button
                      onClick={() => startEdit(movie)}
                      className="flex items-center gap-1.5
                                 text-gray-400 hover:text-white
                                 bg-gray-800 hover:bg-gray-700
                                 text-xs px-3 py-2 rounded-lg
                                 transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(movie)}
                      className="flex items-center gap-1.5
                                 text-gray-400 hover:text-red-400
                                 bg-gray-800 hover:bg-red-600/10
                                 text-xs px-3 py-2 rounded-lg
                                 transition"
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

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        movieTitle={deleteModal.movieTitle}
        onConfirm={handleDelete}
        onCancel={() =>
          setDeleteModal({
            isOpen: false,
            movieId: null,
            movieTitle: "",
          })
        }
        loading={deleteLoading}
      />
    </div>
  );
}
