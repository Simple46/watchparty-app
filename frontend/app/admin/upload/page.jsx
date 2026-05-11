"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Film, Image, CheckCircle, AlertCircle, X } from "lucide-react";
import api from "../../../lib/api";

export default function UploadMoviePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [uploadState, setUploadState] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 2000) {
      setErrorMessage("File too large. Maximum is 2GB.");
      return;
    }
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

  const removeVideo = () => {
    setVideoFile(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  // ─── Upload file directly to Cloudinary ───
  const uploadToCloudinaryDirect = (
    file,
    signature,
    timestamp,
    folder,
    cloudName,
    apiKey,
    resourceType = "video",
  ) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("folder", folder);
      formData.append("api_key", apiKey);

      // Only add video-specific params for videos
      if (resourceType === "video") {
        formData.append("eager", "c_limit,w_1280,h_720/q_auto/f_mp4");
        formData.append("eager_async", "true");
      }

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);

          if (percent < 30) {
            setProgressMessage(`Uploading... ${percent}%`);
          } else if (percent < 70) {
            setProgressMessage(`Still uploading... ${percent}%`);
          } else if (percent < 100) {
            setProgressMessage(`Almost done... ${percent}%`);
          } else {
            setProgressMessage("Processing on Cloudinary...");
          }
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error?.message || "Upload failed"));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      // Use the correct endpoint based on resource type
      xhr.open(
        "POST",
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      );

      xhr.send(formData);
    });
  };

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
      const {
        signature: videoSig,
        timestamp: videoTs,
        folder: videoFolder,
        cloudName,
        apiKey,
      } = videoSigResponse.data;

      // Step 2 — Upload video directly to Cloudinary
      setProgressMessage("Uploading video to Cloudinary...");
      const videoResult = await uploadToCloudinaryDirect(
        videoFile,
        videoSig,
        videoTs,
        videoFolder,
        cloudName,
        apiKey,
        "video",
      );

      setUploadProgress(100);
      setProgressMessage("Video uploaded successfully!");

      // Step 3 — Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        setProgressMessage("Uploading cover image...");

        // Get a SEPARATE signature specifically for images
        const thumbSigResponse = await api.get(
          "/api/admin/cloudinary-signature?type=image",
        );
        const {
          signature: thumbSig,
          timestamp: thumbTs,
          folder: thumbFolder,
        } = thumbSigResponse.data;

        const thumbnailResult = await uploadToCloudinaryDirect(
          thumbnailFile,
          thumbSig,
          thumbTs,
          thumbFolder,
          cloudName,
          apiKey,
          "image", // ← image not video
        );

        thumbnailUrl = thumbnailResult.secure_url;
        console.log("✅ Thumbnail uploaded:", thumbnailUrl);
      }

      // Step 4 — Save to database
      setProgressMessage("Saving to your library...");
      await api.post("/api/admin/save-movie", {
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoResult.secure_url,
        cloudinaryId: videoResult.public_id,
        thumbnail: thumbnailUrl,
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
        err.message || "Upload failed. Check your connection and try again.",
      );
    }
  };

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
            className="w-16 h-16 bg-green-600/20 border
                          border-green-600/30 rounded-full flex
                          items-center justify-center mx-auto mb-5"
          >
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Movie Uploaded!</h2>
          <p className="text-gray-400 text-sm mb-8">
            <span className="text-white font-medium">{title}</span> has been
            uploaded and saved to your library.
          </p>
          <div className="flex gap-3">
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
            className="w-full px-4 py-3 bg-red-600
                       hover:bg-red-700 text-white text-sm
                       font-medium rounded-lg transition"
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
                            items-center justify-center mx-auto mb-5"
            >
              <Upload
                className="w-7 h-7 text-red-400
                                 animate-bounce"
              />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Uploading...</h2>
            <p className="text-gray-400 text-sm">
              Please keep this tab open until upload finishes
            </p>
          </div>

          <div className="mb-2 flex justify-between items-center">
            <p className="text-gray-400 text-xs">{progressMessage}</p>
            <p className="text-white text-sm font-bold">{uploadProgress}%</p>
          </div>

          <div className="w-full bg-gray-800 rounded-full h-3 mb-6">
            <div
              className="bg-red-600 h-3 rounded-full
                         transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-xs">
              Uploading{" "}
              <span className="text-white font-medium">
                {formatFileSize(videoFile?.size || 0)}
              </span>{" "}
              directly to Cloudinary
            </p>
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
          Videos upload directly to Cloudinary for maximum speed
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            accept="video/mp4,video/mkv,video/avi,video/mov,video/webm"
            onChange={handleVideoSelect}
            className="hidden"
          />
          {videoFile ? (
            <div
              className="flex items-center gap-4 bg-gray-800
                            border border-green-600/40 rounded-lg p-4"
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
                  MP4, MKV, AVI, MOV up to 2GB
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
                            border border-green-600/40 rounded-lg p-4"
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
