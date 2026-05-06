const db = require("../utils/db");
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { deleteFromCloudinary } = require("../utils/cloudinaryDelete");
const { compressVideo } = require("../utils/compressVideo");

// ─────────────────────────────────────────
// GET DASHBOARD STATS
// GET /api/admin/dashboard
// Returns the numbers shown on the admin home page:
// total movies, total users, active rooms, storage used
// ─────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    // Promise.all runs all three database queries at the same time
    // instead of one after another — much faster
    // It waits for all three to finish then gives us all results at once
    const [totalMovies, totalUsers, activeRooms] = await Promise.all([
      db.movie.count(),
      db.user.count(),
      db.room.count({
        where: { isActive: true },
      }),
    ]);

    // Calculate total storage used across all movies
    // We fetch just the size field from every movie
    // then add them all up
    const movies = await db.movie.findMany({
      select: { size: true },
    });

    // reduce() loops through the array and builds a running total
    // sum starts at 0 and we add each movie's size to it
    // movie.size || 0 handles movies where size was not recorded
    const totalStorageMB = movies.reduce((sum, movie) => {
      return sum + (movie.size || 0);
    }, 0);

    // Convert MB to GB for easier reading
    // toFixed(2) gives us 2 decimal places e.g. "1.24"
    const totalStorageGB = (totalStorageMB / 1024).toFixed(2);

    // Calculate what percentage of Cloudinary's 25GB free limit is used
    // Math.min ensures we never show more than 100%
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
        // Cloudinary free tier gives 25GB
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
// UPLOAD MOVIE
// POST /api/admin/upload
// This is the most complex route in the entire backend
// It does four things in sequence:
// 1. Validates the uploaded files and form data
// 2. Compresses the video using FFmpeg
// 3. Uploads compressed video + thumbnail to Cloudinary
// 4. Saves all the details to the database
// ─────────────────────────────────────────
const uploadMovie = async (req, res) => {
  try {
    // Step 1 — Check that a video file was actually uploaded
    // req.files is populated by the uploadMovieFiles multer middleware
    // that runs before this controller function
    // If no file was sent, req.files will be empty or undefined
    if (!req.files || !req.files.video) {
      return res.status(400).json({
        message: "Please select a video file to upload",
      });
    }

    // Step 2 — Extract the uploaded files from the request
    // req.files.video is an array — [0] gets the first (and only) file
    const videoFile = req.files.video[0];

    // Thumbnail is optional — not every upload needs one
    // We use a ternary to safely handle when it is missing
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    // Step 3 — Extract the movie details from the form body
    // These come from the text fields in the upload form
    const { title, description } = req.body;

    // Title is required — reject if missing
    if (!title || title.trim() === "") {
      return res.status(400).json({
        message: "Please provide a title for this movie",
      });
    }

    // Log the upload start so you can track it in your server terminal
    console.log("\n🎬 New movie upload started");
    console.log(`   Title: ${title}`);
    console.log(
      `   Original video size: ${(videoFile.size / (1024 * 1024)).toFixed(
        2,
      )}MB`,
    );
    console.log(`   Original filename: ${videoFile.originalname}`);

    // Step 4 — Compress the video with FFmpeg before uploading
    // This shrinks the file to save your Cloudinary storage quota
    // A 300MB video might become 80MB after compression
    // This step takes the most time — could be 30 seconds to a few minutes
    // depending on video length and your server speed
    console.log("\n⚙️  Starting video compression...");

    const { buffer: compressedBuffer, size: compressedSizeMB } =
      await compressVideo(videoFile.buffer, videoFile.originalname);

    console.log(`✅ Compression complete: ${compressedSizeMB}MB`);

    // Step 5 — Upload the compressed video to Cloudinary
    // We pass the compressed buffer, original filename, and folder name
    // uploadToCloudinary returns the publicId and the CDN URL
    console.log("\n📤 Uploading video to Cloudinary...");

    const { publicId: videoPublicId, cdnUrl: videoUrl } =
      await uploadToCloudinary(
        compressedBuffer,
        videoFile.originalname,
        "watchparty/movies",
        "video",
      );

    // Step 6 — Upload thumbnail to Cloudinary if one was provided
    // Thumbnails are images so we use resource_type "image"
    let thumbnailUrl = null;

    if (thumbnailFile) {
      console.log("\n🖼️  Uploading thumbnail to Cloudinary...");

      const { cdnUrl: thumbUrl } = await uploadToCloudinary(
        thumbnailFile.buffer,
        thumbnailFile.originalname,
        "watchparty/thumbnails",
        "image",
      );

      thumbnailUrl = thumbUrl;
      console.log("✅ Thumbnail uploaded");
    }

    // Step 7 — Save everything to the database
    // We store the Cloudinary publicId so we can delete the file later
    // We store the CDN URL so users can stream the video
    console.log("\n💾 Saving movie to database...");

    const movie = await db.movie.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        videoUrl: videoUrl,
        thumbnail: thumbnailUrl,
        // cloudinaryId is the publicId from Cloudinary
        // We MUST save this — without it we cannot delete the file later
        cloudinaryId: videoPublicId,
        size: compressedSizeMB,
      },
    });

    console.log(`✅ Movie saved to database: "${movie.title}"`);
    console.log(`   Movie ID: ${movie.id}`);

    // Step 8 — Return success response with the created movie
    res.status(201).json({
      message: "Movie uploaded successfully",
      movie: movie,
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
// Returns all movies sorted by newest first
// Also includes how many active rooms are
// currently watching each movie
// ─────────────────────────────────────────
const getAllMovies = async (req, res) => {
  try {
    const movies = await db.movie.findMany({
      // orderBy sorts the results — "desc" means newest first
      orderBy: { createdAt: "desc" },

      // include lets us fetch related data in the same query
      // _count gives us the count of related records
      // without fetching all the room records themselves
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    });

    res.status(200).json({ movies });
  } catch (error) {
    console.error("Get all movies error:", error);
    res.status(500).json({
      message: "Failed to fetch movies",
    });
  }
};

// ─────────────────────────────────────────
// GET SINGLE MOVIE
// GET /api/admin/movies/:id
// Returns one specific movie by its ID
// The :id part comes from the URL
// e.g. /api/admin/movies/abc-123-def
// req.params.id would be "abc-123-def"
// ─────────────────────────────────────────
const getMovieById = async (req, res) => {
  try {
    const movie = await db.movie.findUnique({
      where: { id: req.params.id },
    });

    // If no movie with this ID exists return a 404
    if (!movie) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }

    res.status(200).json({ movie });
  } catch (error) {
    console.error("Get movie by ID error:", error);
    res.status(500).json({
      message: "Failed to fetch movie",
    });
  }
};

// ─────────────────────────────────────────
// UPDATE MOVIE
// PUT /api/admin/movies/:id
// Updates a movie's title and/or description
// Does NOT re-upload the video — just text fields
// ─────────────────────────────────────────
const updateMovie = async (req, res) => {
  try {
    const { title, description } = req.body;

    // First check the movie actually exists
    // No point trying to update something that isn't there
    const existingMovie = await db.movie.findUnique({
      where: { id: req.params.id },
    });

    if (!existingMovie) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }

    // Update only the fields that were actually provided
    // If admin only sends a new title, keep the old description
    // If admin only sends a new description, keep the old title
    // The || operator handles this — if title is empty use existingMovie.title
    const updatedMovie = await db.movie.update({
      where: { id: req.params.id },
      data: {
        title: title ? title.trim() : existingMovie.title,
        // description can be intentionally set to empty string
        // so we use !== undefined check instead of just truthy check
        description:
          description !== undefined
            ? description.trim()
            : existingMovie.description,
      },
    });

    res.status(200).json({
      message: "Movie updated successfully",
      movie: updatedMovie,
    });
  } catch (error) {
    console.error("Update movie error:", error);
    res.status(500).json({
      message: "Failed to update movie",
    });
  }
};

// ─────────────────────────────────────────
// DELETE MOVIE
// DELETE /api/admin/movies/:id
// This does THREE things in order:
// 1. Closes any active watch rooms using this movie
// 2. Deletes the video file from Cloudinary (frees storage)
// 3. Deletes the movie record from the database
// All three must happen — skipping any one causes problems
// ─────────────────────────────────────────
const deleteMovie = async (req, res) => {
  try {
    // Step 1 — Find the movie first
    // We need the cloudinaryId to delete from Cloudinary
    const movie = await db.movie.findUnique({
      where: { id: req.params.id },
    });

    // If movie does not exist return 404
    if (!movie) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }

    console.log(`\n Deleting movie: "${movie.title}"`);

    // Step 2 — Close all active rooms watching this movie
    // We do NOT delete the rooms — they stay as history
    // but we mark them inactive so no new users can join them
    // updateMany updates multiple records at once that match the condition
    const closedRooms = await db.room.updateMany({
      where: {
        movieId: movie.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    if (closedRooms.count > 0) {
      console.log(`   Closed ${closedRooms.count} active room(s)`);
    }

    // Step 3 — Delete the video file from Cloudinary
    // This is critical — if we skip this the file stays in
    // Cloudinary forever eating your 25GB free storage limit
    console.log("   Deleting from Cloudinary...");

    await deleteFromCloudinary(movie.cloudinaryId, "video");

    // Also delete thumbnail from Cloudinary if it exists
    // Thumbnails are stored as images so we pass "image" as resource type
    if (movie.thumbnail && movie.thumbnail.includes("cloudinary")) {
      // Extract the public ID from the thumbnail URL
      // Cloudinary URLs look like:
      // https://res.cloudinary.com/cloud/image/upload/v123/watchparty/thumbnails/xyz
      // The public ID is the part after /upload/v123/
      // We need to extract it to delete the thumbnail
      try {
        const urlParts = movie.thumbnail.split("/upload/");
        if (urlParts.length > 1) {
          // Remove the version number (v1234567890/) and file extension
          const publicIdWithExtension = urlParts[1]
            .replace(/^v\d+\//, "") // remove version prefix
            .replace(/\.[^/.]+$/, ""); // remove file extension
          await deleteFromCloudinary(publicIdWithExtension, "image");
        }
      } catch (thumbError) {
        // Log but don't fail the whole delete if thumbnail deletion fails
        console.warn("   Thumbnail deletion warning:", thumbError.message);
      }
    }

    // Step 4 — Delete the movie record from the database
    // Do this last — after files are deleted from Cloudinary
    // If we delete from DB first and Cloudinary fails,
    // we lose the cloudinaryId and can never clean up the file
    await db.movie.delete({
      where: { id: req.params.id },
    });

    console.log(`✅ Movie "${movie.title}" deleted successfully`);

    res.status(200).json({
      message: "Movie deleted successfully",
    });
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
// Returns all watch party rooms with full details
// including which movie is being watched and who the host is
// ─────────────────────────────────────────
const getAllRooms = async (req, res) => {
  try {
    const rooms = await db.room.findMany({
      orderBy: { createdAt: "desc" },

      // include fetches related data for each room in one query
      include: {
        // Which movie is this room watching
        movie: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            duration: true,
          },
        },
        // Who created and is hosting this room
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        // How many members are in each room
        // _count gives us the number without fetching all member records
        _count: {
          select: { members: true },
        },
      },
    });

    res.status(200).json({ rooms });
  } catch (error) {
    console.error("Get all rooms error:", error);
    res.status(500).json({
      message: "Failed to fetch rooms",
    });
  }
};

// Export all controller functions so the routes file can use them
module.exports = {
  getDashboardStats,
  uploadMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
  getAllRooms,
};
