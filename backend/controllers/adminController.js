const { db, safeQuery } = require("../utils/db");
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { deleteFromCloudinary } = require("../utils/cloudinaryDelete");
const { compressVideo } = require("../utils/compressVideo");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─────────────────────────────────────────
// GET CLOUDINARY SIGNATURE
// GET /api/admin/cloudinary-signature
// ─────────────────────────────────────────
const getCloudinarySignature = (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const type = req.query.type || "video";

    // Determine folder based on file type
    const folderMap = {
      video: "watchparty/movies",
      image: "watchparty/thumbnails",
      raw: "watchparty/subtitles",
    };

    const folder = folderMap[type] || "watchparty/movies";

    // Sign with only folder and timestamp
    // Simple and impossible to mismatch
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET,
    );

    res.status(200).json({
      signature,
      timestamp,
      folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error("Signature error:", error);
    res.status(500).json({
      message: "Failed to generate upload signature",
    });
  }
};

//────────────────────────────────────────
// SAVE MOVIE AFTER DIRECT UPLOAD
// POST /api/admin/save-movie
// ─────────────────────────────────────────
const saveMovie = async (req, res) => {
  try {
    const {
      title,
      description,
      cloudinaryId,
      thumbnail,
      subtitleUrl,
      subtitleCloudinaryId,
      size,
      duration,
    } = req.body;

    if (!title || !cloudinaryId) {
      return res.status(400).json({
        message: "Title and cloudinaryId are required",
      });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    // vc_auto works for both H.264 and HEVC videos
    // ac_aac ensures compatible audio
    // q_auto optimizes quality automatically
    // Add fl_progressive to move moov atom to beginning
    // This is what enables seeking on chunked uploads
    const videoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/vc_auto,ac_aac,q_auto,fl_progressive/${cloudinaryId}.mp4`;

    console.log(`\n💾 Saving movie: "${title}"`);
    console.log(`   Cloudinary ID: ${cloudinaryId}`);
    console.log(`   Video URL: ${videoUrl}`);
    console.log(`   Subtitle URL: ${subtitleUrl || "none"}`);

    const movie = await safeQuery((db) =>
      db.movie.create({
        data: {
          title: title.trim(),
          description: description ? description.trim() : null,
          videoUrl,
          thumbnail: thumbnail || null,
          cloudinaryId,
          subtitleUrl: subtitleUrl || null,
          subtitleCloudinaryId: subtitleCloudinaryId || null,
          size: size || null,
          duration: duration ? Math.round(duration) : null,
        },
      }),
    );

    console.log(`✅ Movie saved: "${movie.title}"`);

    res.status(201).json({
      message: "Movie saved successfully",
      movie,
    });
  } catch (error) {
    console.error("Save movie error:", error);
    console.error("Error details:", error.message);
    res.status(500).json({
      message: "Failed to save movie: " + error.message,
    });
  }
};
// ─────────────────────────────────────────
// GET DASHBOARD STATS
// GET /api/admin/dashboard
// ─────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const [totalMovies, totalUsers, activeRooms] = await Promise.all([
      safeQuery((db) => db.movie.count()),
      safeQuery((db) => db.user.count()),
      safeQuery((db) => db.room.count({ where: { isActive: true } })),
    ]);

    const movies = await safeQuery((db) =>
      db.movie.findMany({ select: { size: true } }),
    );

    const totalStorageMB = movies.reduce(
      (sum, movie) => sum + (movie.size || 0),
      0,
    );
    const totalStorageGB = (totalStorageMB / 1024).toFixed(2);
    const storagePercentage = Math.min(
      Math.round((totalStorageMB / (25 * 1024)) * 100),
      100,
    );

    res.status(200).json({
      totalMovies,
      totalUsers,
      activeRooms,
      storage: {
        usedMB: Math.round(totalStorageMB),
        usedGB: totalStorageGB,
        limitGB: 25,
        percentage: storagePercentage,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      message: "Failed to fetch dashboard stats",
    });
  }
};

// ─────────────────────────────────────────
// UPLOAD MOVIE (legacy - through backend)
// POST /api/admin/upload
// ─────────────────────────────────────────
const uploadMovie = async (req, res) => {
  try {
    if (!req.files || !req.files.video) {
      return res.status(400).json({
        message: "Please select a video file to upload",
      });
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;
    const { title, description } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({
        message: "Please provide a title for this movie",
      });
    }

    console.log(`\n🎬 Upload started: "${title}"`);
    console.log(`   Size: ${(videoFile.size / (1024 * 1024)).toFixed(2)}MB`);

    console.log("\n⚙️  Compressing video...");
    const { buffer: compressedBuffer, size: compressedSizeMB } =
      await compressVideo(videoFile.buffer, videoFile.originalname);
    console.log(`✅ Compressed: ${compressedSizeMB}MB`);

    console.log("\n📤 Uploading to Cloudinary...");
    const { publicId: videoPublicId, cdnUrl: videoUrl } =
      await uploadToCloudinary(
        compressedBuffer,
        videoFile.originalname,
        "watchparty/movies",
        "video",
      );

    let thumbnailUrl = null;
    if (thumbnailFile) {
      const { cdnUrl: thumbUrl } = await uploadToCloudinary(
        thumbnailFile.buffer,
        thumbnailFile.originalname,
        "watchparty/thumbnails",
        "image",
      );
      thumbnailUrl = thumbUrl;
    }

    const movie = await safeQuery((db) =>
      db.movie.create({
        data: {
          title: title.trim(),
          description: description ? description.trim() : null,
          videoUrl,
          thumbnail: thumbnailUrl,
          cloudinaryId: videoPublicId,
          size: compressedSizeMB,
        },
      }),
    );

    console.log(`✅ Movie saved: "${movie.title}"`);

    res.status(201).json({
      message: "Movie uploaded successfully",
      movie,
    });
  } catch (error) {
    console.error("Upload movie error:", error);
    res.status(500).json({
      message: "Failed to upload movie: " + error.message,
    });
  }
};

// ─────────────────────────────────────────
// GET ALL MOVIES
// GET /api/admin/movies
// ─────────────────────────────────────────
const getAllMovies = async (req, res) => {
  try {
    const movies = await safeQuery((db) =>
      db.movie.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { rooms: true } },
        },
      }),
    );
    res.status(200).json({ movies });
  } catch (error) {
    console.error("Get movies error:", error);
    res.status(500).json({ message: "Failed to fetch movies" });
  }
};

// ─────────────────────────────────────────
// GET SINGLE MOVIE
// GET /api/admin/movies/:id
// ─────────────────────────────────────────
const getMovieById = async (req, res) => {
  try {
    const movie = await safeQuery((db) =>
      db.movie.findUnique({
        where: { id: req.params.id },
      }),
    );

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.status(200).json({ movie });
  } catch (error) {
    console.error("Get movie error:", error);
    res.status(500).json({ message: "Failed to fetch movie" });
  }
};

// ─────────────────────────────────────────
// UPDATE MOVIE
// PUT /api/admin/movies/:id
// ─────────────────────────────────────────
const updateMovie = async (req, res) => {
  try {
    const { title, description, thumbnail } = req.body;

    const existingMovie = await safeQuery((db) =>
      db.movie.findUnique({ where: { id: req.params.id } }),
    );

    if (!existingMovie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const updatedMovie = await safeQuery((db) =>
      db.movie.update({
        where: { id: req.params.id },
        data: {
          title: title ? title.trim() : existingMovie.title,
          description:
            description !== undefined
              ? description.trim()
              : existingMovie.description,
          // Only update thumbnail if a new one was provided
          ...(thumbnail && { thumbnail }),
        },
      }),
    );

    res.status(200).json({
      message: "Movie updated successfully",
      movie: updatedMovie,
    });
  } catch (error) {
    console.error("Update movie error:", error);
    res.status(500).json({ message: "Failed to update movie" });
  }
};

// ─────────────────────────────────────────
// DELETE MOVIE
// DELETE /api/admin/movies/:id
// ─────────────────────────────────────────
const deleteMovie = async (req, res) => {
  try {
    const movie = await safeQuery((db) =>
      db.movie.findUnique({ where: { id: req.params.id } }),
    );

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    console.log(`\n🗑️  Deleting: "${movie.title}"`);

    // Close active rooms
    await safeQuery((db) =>
      db.room.updateMany({
        where: { movieId: movie.id, isActive: true },
        data: { isActive: false },
      }),
    );

    // Delete video from Cloudinary
    await deleteFromCloudinary(movie.cloudinaryId, "video");

    // Delete thumbnail from Cloudinary if exists
    if (movie.thumbnail && movie.thumbnail.includes("cloudinary")) {
      try {
        const urlParts = movie.thumbnail.split("/upload/");
        if (urlParts.length > 1) {
          const publicId = urlParts[1]
            .replace(/^v\d+\//, "")
            .replace(/\.[^/.]+$/, "");
          await deleteFromCloudinary(publicId, "image");
        }
      } catch (thumbError) {
        console.warn("Thumbnail delete warning:", thumbError.message);
      }
    }

    // Delete subtitle from Cloudinary if exists
    if (movie.subtitleCloudinaryId) {
      try {
        await deleteFromCloudinary(movie.subtitleCloudinaryId, "raw");
        console.log("✅ Subtitle deleted from Cloudinary");
      } catch (subError) {
        console.warn("Subtitle delete warning:", subError.message);
      }
    }

    // Delete from database
    await safeQuery((db) => db.movie.delete({ where: { id: req.params.id } }));

    console.log(`✅ Movie deleted: "${movie.title}"`);

    res.status(200).json({ message: "Movie deleted successfully" });
  } catch (error) {
    console.error("Delete movie error:", error);
    res.status(500).json({
      message: "Failed to delete movie: " + error.message,
    });
  }
};

// ─────────────────────────────────────────
// GET ALL ROOMS
// GET /api/admin/rooms
// ─────────────────────────────────────────
const getAllRooms = async (req, res) => {
  try {
    const rooms = await safeQuery((db) =>
      db.room.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              duration: true,
            },
          },
          host: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: { select: { members: true } },
        },
      }),
    );

    res.status(200).json({ rooms });
  } catch (error) {
    console.error("Get rooms error:", error);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
};

module.exports = {
  getCloudinarySignature,
  saveMovie,
  getDashboardStats,
  uploadMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
  getAllRooms,
};
