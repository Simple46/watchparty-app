"use client";

import { AlertTriangle } from "lucide-react";

// Confirmation modal before deleting a movie
// Shows the movie title so admin is 100% sure what they are deleting
export default function DeleteModal({
  isOpen,
  movieTitle,
  onConfirm,
  onCancel,
  loading,
}) {
  // Do not render anything if modal is closed
  if (!isOpen) return null;

  return (
    // Full screen overlay
    <div
      className="fixed inset-0 bg-black/70 z-50 flex
                    items-center justify-center px-4"
    >
      {/* Modal box */}
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl
                      p-6 w-full max-w-md shadow-2xl"
      >
        {/* Warning icon */}
        <div
          className="flex items-center justify-center w-14 h-14
                        bg-red-600/15 border border-red-600/30 rounded-full
                        mx-auto mb-5"
        >
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>

        {/* Title */}
        <h3 className="text-white text-xl font-bold text-center mb-2">
          Delete Movie?
        </h3>

        {/* Message */}
        <p className="text-gray-400 text-sm text-center mb-1">
          You are about to permanently delete:
        </p>
        <p className="text-white font-semibold text-center text-base mb-4">
          {movieTitle}
        </p>

        {/* Warning details */}
        <div
          className="bg-red-600/10 border border-red-600/20
                        rounded-lg p-4 mb-6 space-y-1"
        >
          <p className="text-red-400 text-xs">
            ⚠️ This will permanently delete the video from Cloudinary
          </p>
          <p className="text-red-400 text-xs">
            ⚠️ All active watch rooms using this movie will be closed
          </p>
          <p className="text-red-400 text-xs">
            ⚠️ This action cannot be undone
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {/* Cancel — safe option */}
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700
                       text-white text-sm font-medium rounded-lg
                       transition disabled:opacity-50"
          >
            Cancel
          </button>

          {/* Confirm delete — dangerous action */}
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700
                       disabled:bg-red-900 disabled:cursor-not-allowed
                       text-white text-sm font-medium rounded-lg
                       transition"
          >
            {loading ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
