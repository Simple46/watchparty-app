"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Film,
  Image,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Info,
} from "lucide-react";
import api from "../../../lib/api";

// Cloudinary chunk size — 6MB per chunk
// This is within Cloudinary's recommended range
const CHUNK_SIZE = 6 * 1024 * 1024;

export default function UploadMoviePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [subtitleFile, setSubtitleFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  const [uploadState, setUploadState] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const subtitleInputRef = useRef(null);

  // ─── File handlers ───
  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setErrorMessage("");
  };

  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setErrorMessage("");
  };

  const handleSubtitleSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate subtitle file format
    const name = file.name.toLowerCase();
    if (!name.endsWith(".srt") && !name.endsWith(".vtt")) {
      setErrorMessage("Only .srt and .vtt subtitle files are supported");
      return;
    }
    setSubtitleFile(file);
    setErrorMessage("");
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const removeSubtitle = () => {
    setSubtitleFile(null);
    if (subtitleInputRef.current) subtitleInputRef.current.value = "";
  };

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  // ─────────────────────────────────────────
  // CHUNKED VIDEO UPLOAD
  // Splits the file into 6MB chunks and uploads
  // each one separately to Cloudinary
  // This bypasses the 100MB free tier limit
  // ─────────────────────────────────────────
  const uploadVideoInChunks = async (
    file,
    signature,
    timestamp,
    folder,
    cloudName,
    apiKey,
  ) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedBytes = 0;

    // Cloudinary needs a unique ID to track chunked uploads
    // We generate one from the filename and timestamp
    const uniqueUploadId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, "_")}`;

    let lastResponse = null;

    console.log(
      `📦 Starting chunked upload: ${totalChunks} chunks of ${(CHUNK_SIZE / (1024 * 1024)).toFixed(0)}MB each`,
    );

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      // Content-Range header tells Cloudinary where this
      // chunk fits in the full file
      // Format: bytes START-END/TOTAL
      const contentRange = `bytes ${start}-${end - 1}/${file.size}`;

      const formData = new FormData();
      formData.append("file", chunk);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", folder);

      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track progress for this individual chunk
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const chunkUploaded = uploadedBytes + event.loaded;
            const percent = Math.round((chunkUploaded / file.size) * 100);
            setUploadProgress(Math.min(percent, 99));
            setProgressMessage(
              `Uploading chunk ${chunkIndex + 1} of ${totalChunks}... ${percent}%`,
            );
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 200 || xhr.status === 206) {
            // 206 means chunk received, more expected
            // 200 means all chunks received, upload complete
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({});
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(
                new Error(
                  error.error?.message || `Chunk ${chunkIndex + 1} failed`,
                ),
              );
            } catch {
              reject(
                new Error(`Chunk upload failed with status ${xhr.status}`),
              );
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error(`Network error on chunk ${chunkIndex + 1}`));
        });

        xhr.open(
          "POST",
          `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        );

        // These headers tell Cloudinary this is a chunked upload
        xhr.setRequestHeader("X-Unique-Upload-Id", uniqueUploadId);
        xhr.setRequestHeader("Content-Range", contentRange);

        xhr.send(formData);
      });

      uploadedBytes += end - start;
      lastResponse = response;

      console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploaded`);
    }

    return lastResponse;
  };

  // ─── Upload image to Cloudinary (thumbnail) ───
  const uploadImageDirect = async (file, cloudName, apiKey) => {
    const sigResponse = await api.get(
      "/api/admin/cloudinary-signature?type=image",
    );
    const { signature, timestamp, folder } = sigResponse.data;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Thumbnail upload failed");
    }

    return await response.json();
  };

  // ─── Upload subtitle file ───
  // Subtitles are uploaded as raw files to Cloudinary
  const uploadSubtitleDirect = async (file, cloudName, apiKey) => {
    const sigResponse = await api.get(
      "/api/admin/cloudinary-signature?type=raw",
    );
    const { signature, timestamp, folder } = sigResponse.data;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
      { method: "POST", body: formData },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Subtitle upload failed");
    }

    return await response.json();
  };

  // ─── Main submit handler ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage("Please enter a movie title");
      return;
    }
    if (!videoFile) {
      setErrorMessage("Please select a video file");
      return;
    }

    setUploadState("uploading");
    setUploadProgress(0);

    try {
      // Step 1 — Get video upload signature
      setProgressMessage("Preparing secure upload...");
      const videoSigResponse = await api.get(
        "/api/admin/cloudinary-signature?type=video",
      );

      const { signature, timestamp, folder, cloudName, apiKey } =
        videoSigResponse.data;

      // Step 2 — Upload video using chunked upload
      // This works for files of ANY size including >100MB
      setProgressMessage("Starting video upload...");

      const videoResult = await uploadVideoInChunks(
        videoFile,
        signature,
        timestamp,
        folder,
        cloudName,
        apiKey,
      );

      console.log("Video upload complete:", videoResult);

      const publicId = videoResult.public_id;
      if (!publicId) {
        throw new Error(
          "Upload succeeded but no public_id returned from Cloudinary",
        );
      }

      setUploadProgress(100);
      setProgressMessage("Video uploaded successfully!");

      // Step 3 — Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        setProgressMessage("Uploading cover image...");
        const thumbResult = await uploadImageDirect(
          thumbnailFile,
          cloudName,
          apiKey,
        );
        thumbnailUrl = thumbResult.secure_url;
        console.log("Thumbnail uploaded:", thumbnailUrl);
      }

      // Step 4 — Upload subtitle if provided
      let subtitleUrl = null;
      let subtitlePublicId = null;
      if (subtitleFile) {
        setProgressMessage("Uploading subtitle file...");
        const subResult = await uploadSubtitleDirect(
          subtitleFile,
          cloudName,
          apiKey,
        );
        subtitleUrl = subResult.secure_url;
        subtitlePublicId = subResult.public_id;
        console.log("Subtitle uploaded:", subtitleUrl);
      }

      // Step 5 — Save everything to database
      setProgressMessage("Saving to your library...");

      await api.post("/api/admin/save-movie", {
        title: title.trim(),
        description: description.trim(),
        cloudinaryId: publicId,
        thumbnail: thumbnailUrl,
        subtitleUrl: subtitleUrl,
        subtitleCloudinaryId: subtitlePublicId,
        size: parseFloat((videoFile.size / (1024 * 1024)).toFixed(2)),
        duration: videoResult.duration
          ? Math.round(videoResult.duration)
          : null,
      });

      setUploadState("success");
    } catch (err) {
      console.error("Upload error:", err);
      setUploadState("error");
      setErrorMessage(
        err.message ||
          "Upload failed. Please check your connection and try again.",
      );
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setVideoFile(null);
    setThumbnailFile(null);
    setSubtitleFile(null);
    setThumbnailPreview(null);
    setUploadState("idle");
    setUploadProgress(0);
    setProgressMessage("");
    setErrorMessage("");
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    if (subtitleInputRef.current) subtitleInputRef.current.value = "";
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
            className="w-16 h-16 bg-green-600/20 border
                          border-green-600/30 rounded-full flex
                          items-center justify-center mx-auto mb-5"
          >
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Movie Uploaded!</h2>
          <p className="text-gray-400 text-sm mb-2">
            <span className="text-white font-medium">{title}</span> has been
            saved to your library.
          </p>
          {subtitleFile && (
            <p className="text-green-400 text-xs mb-6">
              ✓ Subtitle file uploaded successfully
            </p>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-3 bg-gray-800
                         hover:bg-gray-700 text-white text-sm
                         font-medium rounded-lg transition"
            >
              Upload Another
            </button>
            <button
              onClick={() => router.push("/admin/movies")}
              className="flex-1 px-4 py-3 bg-red-600
                         hover:bg-red-700 text-white text-sm
                         font-medium rounded-lg transition"
            >
              View All Movies
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ERROR STATE ───
  if (uploadState === "error") {
    return (
      <div className="max-w-xl mx-auto">
        <div
          className="bg-gray-900 border border-red-600/30
                        rounded-2xl p-10 text-center"
        >
          <div
            className="w-16 h-16 bg-red-600/20 border
                          border-red-600/30 rounded-full flex
                          items-center justify-center mx-auto mb-5"
          >
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Upload Failed</h2>
          <p className="text-red-400 text-sm mb-8">{errorMessage}</p>
          <button
            onClick={resetForm}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700
                       text-white text-sm font-medium rounded-lg
                       transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── UPLOADING STATE ───
  if (uploadState === "uploading") {
    return (
      <div className="max-w-xl mx-auto">
        <div
          className="bg-gray-900 border border-gray-800
                        rounded-2xl p-10"
        >
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 bg-red-600/20 border
                            border-red-600/30 rounded-full flex
                            items-center justify-center
                            mx-auto mb-5"
            >
              <Upload
                className="w-7 h-7 text-red-400
                                 animate-bounce"
              />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Uploading...</h2>
            <p className="text-gray-400 text-sm">
              Please keep this tab open until the upload finishes
            </p>
          </div>

          <div
            className="mb-2 flex justify-between
                          items-center"
          >
            <p className="text-gray-400 text-xs flex-1 mr-4">
              {progressMessage}
            </p>
            <p
              className="text-white text-sm font-bold
                          flex-shrink-0"
            >
              {uploadProgress}%
            </p>
          </div>

          <div
            className="w-full bg-gray-800 rounded-full
                          h-3 mb-4"
          >
            <div
              className="bg-red-600 h-3 rounded-full
                         transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div
              className="flex items-center justify-between
                            text-xs"
            >
              <span className="text-gray-400">File size:</span>
              <span className="text-white font-medium">
                {formatFileSize(videoFile?.size || 0)}
              </span>
            </div>
            <div
              className="flex items-center justify-between
                            text-xs mt-1"
            >
              <span className="text-gray-400">Method:</span>
              <span className="text-green-400 font-medium">
                Chunked upload (no size limit)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── FORM STATE ───
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold">Upload New Movie</h1>
        <p className="text-gray-400 text-sm mt-1">
          Large files supported — videos upload in chunks directly to Cloudinary
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div
            className="flex items-start gap-3 bg-red-500/10
                          border border-red-500/30 text-red-400
                          px-4 py-3 rounded-lg text-sm"
          >
            <AlertCircle
              className="w-4 h-4 mt-0.5
                                    flex-shrink-0"
            />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Title */}
        <div>
          <label
            className="block text-sm font-medium
                             text-gray-300 mb-2"
          >
            Movie Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Inception, The Dark Knight"
            required
            className="w-full bg-gray-800 text-white
                       placeholder-gray-500 border border-gray-700
                       rounded-lg px-4 py-3 text-sm
                       focus:outline-none focus:border-red-500
                       transition"
          />
        </div>

        {/* Description */}
        <div>
          <label
            className="block text-sm font-medium
                             text-gray-300 mb-2"
          >
            Description{" "}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the movie..."
            rows={3}
            className="w-full bg-gray-800 text-white
                       placeholder-gray-500 border border-gray-700
                       rounded-lg px-4 py-3 text-sm
                       focus:outline-none focus:border-red-500
                       transition resize-none"
          />
        </div>

        {/* Video File */}
        <div>
          <label
            className="block text-sm font-medium
                             text-gray-300 mb-2"
          >
            Video File <span className="text-red-500">*</span>
          </label>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/mkv,video/avi,video/mov,
                    video/webm,video/x-matroska"
            onChange={handleVideoSelect}
            className="hidden"
          />
          {videoFile ? (
            <div
              className="flex items-center gap-4 bg-gray-800
                            border border-green-600/40 rounded-lg
                            p-4"
            >
              <div
                className="w-10 h-10 bg-green-600/20 rounded-lg
                              flex items-center justify-center
                              flex-shrink-0"
              >
                <Film className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-white text-sm font-medium
                               truncate"
                >
                  {videoFile.name}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatFileSize(videoFile.size)}
                  {videoFile.size > 100 * 1024 * 1024 && (
                    <span className="text-blue-400 ml-2">
                      — will use chunked upload
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={removeVideo}
                className="text-gray-500 hover:text-red-400
                           transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="w-full border-2 border-dashed
                         border-gray-700 hover:border-red-500/50
                         rounded-xl p-8 flex flex-col items-center
                         gap-3 transition group"
            >
              <div
                className="w-12 h-12 bg-gray-800
                              group-hover:bg-red-600/10 rounded-xl
                              flex items-center justify-center
                              transition"
              >
                <Upload
                  className="w-6 h-6 text-gray-500
                                   group-hover:text-red-400
                                   transition"
                />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-medium">
                  Click to select video
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  MP4, MKV, AVI, MOV — any size supported
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Thumbnail */}
        <div>
          <label
            className="block text-sm font-medium
                             text-gray-300 mb-2"
          >
            Cover Image{" "}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleThumbnailSelect}
            className="hidden"
          />
          {thumbnailFile ? (
            <div
              className="flex items-center gap-4 bg-gray-800
                            border border-green-600/40 rounded-lg
                            p-4"
            >
              <img
                src={thumbnailPreview}
                alt="preview"
                className="w-20 h-12 object-cover rounded-md
                           flex-shrink-0 border border-gray-700"
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-white text-sm font-medium
                               truncate"
                >
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
                           transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              className="w-full border-2 border-dashed
                         border-gray-700 hover:border-red-500/50
                         rounded-xl p-6 flex flex-col items-center
                         gap-3 transition group"
            >
              <div
                className="w-10 h-10 bg-gray-800
                              group-hover:bg-red-600/10 rounded-xl
                              flex items-center justify-center
                              transition"
              >
                <Image
                  className="w-5 h-5 text-gray-500
                                  group-hover:text-red-400
                                  transition"
                />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-medium">
                  Click to select cover image
                </p>
                <p className="text-gray-500 text-xs mt-1">JPEG, PNG or WebP</p>
              </div>
            </button>
          )}
        </div>

        {/* Subtitle File */}
        <div>
          <label
            className="block text-sm font-medium
                             text-gray-300 mb-2"
          >
            Subtitle File{" "}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            ref={subtitleInputRef}
            type="file"
            accept=".srt,.vtt"
            onChange={handleSubtitleSelect}
            className="hidden"
          />
          {subtitleFile ? (
            <div
              className="flex items-center gap-4 bg-gray-800
                            border border-green-600/40 rounded-lg
                            p-4"
            >
              <div
                className="w-10 h-10 bg-blue-600/20 rounded-lg
                              flex items-center justify-center
                              flex-shrink-0"
              >
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-white text-sm font-medium
                               truncate"
                >
                  {subtitleFile.name}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatFileSize(subtitleFile.size)} ·{" "}
                  {subtitleFile.name.endsWith(".srt")
                    ? "SubRip Subtitle"
                    : "WebVTT Subtitle"}
                </p>
              </div>
              <button
                type="button"
                onClick={removeSubtitle}
                className="text-gray-500 hover:text-red-400
                           transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => subtitleInputRef.current?.click()}
              className="w-full border-2 border-dashed
                         border-gray-700 hover:border-blue-500/50
                         rounded-xl p-6 flex flex-col items-center
                         gap-3 transition group"
            >
              <div
                className="w-10 h-10 bg-gray-800
                              group-hover:bg-blue-600/10 rounded-xl
                              flex items-center justify-center
                              transition"
              >
                <FileText
                  className="w-5 h-5 text-gray-500
                                     group-hover:text-blue-400
                                     transition"
                />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-medium">
                  Click to select subtitle file
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  .srt or .vtt format
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Info box */}
        <div
          className="bg-blue-600/10 border border-blue-600/20
                        rounded-lg p-4 flex gap-3"
        >
          <Info
            className="w-4 h-4 text-blue-400 flex-shrink-0
                           mt-0.5"
          />
          <div className="space-y-1">
            <p className="text-blue-400 text-xs font-medium">
              Upload Information
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Videos upload directly to Cloudinary using chunked upload — no
              file size limit. Large files are split into 6MB pieces
              automatically. Subtitles will be available to users in the watch
              room.
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!videoFile || !title.trim()}
          className="w-full bg-red-600 hover:bg-red-700
                     disabled:bg-gray-700 disabled:text-gray-500
                     disabled:cursor-not-allowed text-white
                     font-semibold py-4 rounded-xl transition
                     text-sm"
        >
          Upload Movie
        </button>
      </form>
    </div>
  );
}
