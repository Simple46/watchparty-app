"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Film, Image, CheckCircle, AlertCircle, X } from "lucide-react";
import api from "../../../lib/api";

export default function UploadMoviePage() {
  const router = useRouter();

  // Form field values
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Selected file objects
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  // Preview URL for the thumbnail image
  // Created from the selected file so admin can see it before uploading
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  // Upload state tracking
  // idle → uploading → success → error
  const [uploadState, setUploadState] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Ref for hidden file inputs — we trigger them programmatically
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  // ─── Handle video file selection ───
  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size — reject anything over 500MB
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 500) {
      setErrorMessage(
        `File too large: ${fileSizeMB.toFixed(0)}MB. Maximum is 500MB.`,
      );
      return;
    }

    setVideoFile(file);
    setErrorMessage("");
  };

  // ─── Handle thumbnail file selection ───
  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setThumbnailFile(file);

    // Create a local preview URL so admin can see the thumbnail
    // URL.createObjectURL creates a temporary browser URL for the file
    const previewUrl = URL.createObjectURL(file);
    setThumbnailPreview(previewUrl);
    setErrorMessage("");
  };

  // ─── Remove selected video ───
  const removeVideo = () => {
    setVideoFile(null);
    // Reset the file input so the same file can be selected again
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  // ─── Remove selected thumbnail ───
  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  // ─── Format file size for display ───
  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  // ─── Handle form submission ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    // Validate required fields
    if (!title.trim()) {
      setErrorMessage("Please enter a movie title");
      return;
    }
    if (!videoFile) {
      setErrorMessage("Please select a video file");
      return;
    }

    // Build FormData — required for file uploads
    // JSON cannot send files, only FormData can
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("video", videoFile);
    if (thumbnailFile) {
      formData.append("thumbnail", thumbnailFile);
    }

    setUploadState("uploading");
    setUploadProgress(0);

    try {
      // Stage 1 — Compression (happens on server, we simulate progress)
      setProgressMessage("Compressing video with FFmpeg...");
      setUploadProgress(10);

      // We use axios directly here so we can track upload progress
      // onUploadProgress fires as the file is being sent to your backend
      const response = await api.post("/api/admin/upload", formData, {
        headers: {
          // Do NOT set Content-Type here — axios sets it automatically
          // for FormData with the correct multipart boundary
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          // This tracks how much of the file has been sent to YOUR backend
          // not the Cloudinary upload — that happens server-side
          const percentSent = Math.round(
            (progressEvent.loaded * 80) / progressEvent.total,
          );
          // We show 10-90% for the transfer phase
          // leaving 90-100% for the server-side Cloudinary upload
          setUploadProgress(10 + percentSent);

          if (percentSent < 30) {
            setProgressMessage("Compressing video...");
          } else if (percentSent < 60) {
            setProgressMessage("Uploading to Cloudinary...");
          } else {
            setProgressMessage("Saving to database...");
          }
        },
      });

      // Upload complete
      setUploadProgress(100);
      setProgressMessage("Upload complete!");
      setUploadState("success");
    } catch (err) {
      setUploadState("error");
      setErrorMessage(
        err.response?.data?.message ||
          "Upload failed. Please check your connection and try again.",
      );
      console.error("Upload error:", err);
    }
  };

  // ─── Reset form after success or error ───
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setVideoFile(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setUploadState("idle");
    setUploadProgress(0);
    setProgressMessage("");
    setErrorMessage("");
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  // ─── SUCCESS STATE ───
  if (uploadState === "success") {
    return (
      <div className="max-w-xl mx-auto">
        <div
          className="bg-gray-900 border border-green-600/30
                        rounded-2xl p-10 text-center"
        >
          <div
            className="w-16 h-16 bg-green-600/20 border border-green-600/30
                          rounded-full flex items-center justify-center
                          mx-auto mb-5"
          >
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Movie Uploaded!</h2>
          <p className="text-gray-400 text-sm mb-8">
            <span className="text-white font-medium">{title}</span> has been
            compressed, uploaded to Cloudinary, and saved to your database.
          </p>
          <div className="flex gap-3">
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700
                         text-white text-sm font-medium rounded-lg
                         transition"
            >
              Upload Another
            </button>
            <button
              onClick={() => router.push("/admin/movies")}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700
                         text-white text-sm font-medium rounded-lg
                         transition"
            >
              View All Movies
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── UPLOADING STATE ───
  if (uploadState === "uploading") {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10">
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 bg-red-600/20 border border-red-600/30
                            rounded-full flex items-center justify-center
                            mx-auto mb-5"
            >
              <Upload className="w-7 h-7 text-red-400 animate-bounce" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">
              Uploading Movie...
            </h2>
            <p className="text-gray-400 text-sm">
              Do not close this page until the upload finishes
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-400 text-xs">{progressMessage}</p>
              <p className="text-white text-xs font-bold">{uploadProgress}%</p>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div
                className="bg-red-600 h-3 rounded-full transition-all
                           duration-500"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>

          {/* Steps indicator */}
          <div className="space-y-3 mt-6">
            {[
              {
                label: "Compressing with FFmpeg",
                done: uploadProgress >= 30,
              },
              {
                label: "Uploading to Cloudinary",
                done: uploadProgress >= 70,
              },
              {
                label: "Saving to database",
                done: uploadProgress >= 95,
              },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center
                    justify-center flex-shrink-0 transition-all duration-300
                    ${
                      step.done
                        ? "border-green-500 bg-green-500"
                        : "border-gray-700"
                    }
                  `}
                >
                  {step.done && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <p
                  className={`text-sm ${
                    step.done ? "text-green-400" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── IDLE / FORM STATE ───
  return (
    <div className="max-w-2xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold">Upload New Movie</h1>
        <p className="text-gray-400 text-sm mt-1">
          Videos are automatically compressed before uploading to save storage
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Banner */}
        {errorMessage && (
          <div
            className="flex items-start gap-3 bg-red-500/10
                          border border-red-500/30 text-red-400
                          px-4 py-3 rounded-lg text-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Movie Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Movie Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Inception, The Dark Knight"
            required
            className="w-full bg-gray-800 text-white placeholder-gray-500
                       border border-gray-700 rounded-lg px-4 py-3 text-sm
                       focus:outline-none focus:border-red-500
                       focus:ring-1 focus:ring-red-500 transition"
          />
        </div>

        {/* Movie Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description{" "}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the movie..."
            rows={3}
            className="w-full bg-gray-800 text-white placeholder-gray-500
                       border border-gray-700 rounded-lg px-4 py-3 text-sm
                       focus:outline-none focus:border-red-500
                       focus:ring-1 focus:ring-red-500 transition resize-none"
          />
        </div>

        {/* Video File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Video File <span className="text-red-500">*</span>
          </label>

          {/* Hidden file input */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/mkv,video/avi,video/mov,video/webm"
            onChange={handleVideoSelect}
            className="hidden"
          />

          {videoFile ? (
            // Show selected file info
            <div
              className="flex items-center gap-4 bg-gray-800
                            border border-green-600/40 rounded-lg p-4"
            >
              <div
                className="w-10 h-10 bg-green-600/20 rounded-lg
                              flex items-center justify-center flex-shrink-0"
              >
                <Film className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {videoFile.name}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatFileSize(videoFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={removeVideo}
                className="text-gray-500 hover:text-red-400 transition
                           flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            // Show upload drop zone
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-700
                         hover:border-red-500/50 rounded-xl p-8
                         flex flex-col items-center gap-3
                         transition cursor-pointer group"
            >
              <div
                className="w-12 h-12 bg-gray-800 group-hover:bg-red-600/10
                              rounded-xl flex items-center justify-center
                              transition"
              >
                <Upload
                  className="w-6 h-6 text-gray-500
                                   group-hover:text-red-400 transition"
                />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-medium">
                  Click to select video
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  MP4, MKV, AVI, MOV, WebM up to 500MB
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cover Image{" "}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>

          {/* Hidden thumbnail input */}
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleThumbnailSelect}
            className="hidden"
          />

          {thumbnailFile ? (
            // Show thumbnail preview
            <div
              className="flex items-center gap-4 bg-gray-800
                            border border-green-600/40 rounded-lg p-4"
            >
              {/* Actual image preview */}
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="w-16 h-10 object-cover rounded-md flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {thumbnailFile.name}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatFileSize(thumbnailFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={removeThumbnail}
                className="text-gray-500 hover:text-red-400
                           transition flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-700
                         hover:border-red-500/50 rounded-xl p-6
                         flex flex-col items-center gap-3
                         transition cursor-pointer group"
            >
              <div
                className="w-10 h-10 bg-gray-800 group-hover:bg-red-600/10
                              rounded-xl flex items-center justify-center
                              transition"
              >
                <Image
                  className="w-5 h-5 text-gray-500
                                  group-hover:text-red-400 transition"
                />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-medium">
                  Click to select cover image
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  JPEG, PNG or WebP up to 5MB
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Info box about compression */}
        <div
          className="bg-blue-600/10 border border-blue-600/20
                        rounded-lg p-4"
        >
          <p className="text-blue-400 text-xs font-medium mb-1">
            ℹ️ About Video Compression
          </p>
          <p className="text-gray-400 text-xs leading-relaxed">
            Your video will be automatically compressed to 720p using FFmpeg
            before uploading to Cloudinary. This saves storage space while
            keeping good quality. Large videos may take several minutes to
            process.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!videoFile || !title.trim()}
          className="w-full bg-red-600 hover:bg-red-700
                     disabled:bg-gray-700 disabled:text-gray-500
                     disabled:cursor-not-allowed text-white font-semibold
                     py-4 rounded-xl transition text-sm"
        >
          Upload Movie
        </button>
      </form>
    </div>
  );
}
