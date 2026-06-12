const express = require("express");
const router = express.Router();
const { db, safeQuery } = require("../utils/db"); // ← update import

router.get("/", async (req, res) => {
  try {
    const movies = await safeQuery((db) =>
      db.movie.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnail: true,
          duration: true,
          size: true,
          createdAt: true,
          _count: {
            select: {
              // Only count active rooms
              rooms: true,
            },
          },
        },
      }),
    );

    // Filter the count to only include active rooms
    // since Prisma _count doesn't support where on
    // scalar aggregates in all versions
    const moviesWithActiveRooms = await Promise.all(
      movies.map(async (movie) => {
        const activeRoomCount = await safeQuery((db) =>
          db.room.count({
            where: {
              movieId: movie.id,
              isActive: true,
            },
          }),
        );
        return {
          ...movie,
          _count: { rooms: activeRoomCount },
        };
      }),
    );

    res.status(200).json({ movies: moviesWithActiveRooms });
  } catch (error) {
    console.error("Get movies error:", error);
    res.status(500).json({ message: "Failed to fetch movies" });
  }
});

// ─────────────────────────────────────────
// PROXY SUBTITLE FILE
// GET /api/movies/subtitle?url=...
// Fetches subtitle from Cloudinary and returns it
// This avoids CORS issues on the frontend
// ─────────────────────────────────────────
router.get("/subtitle", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        message: "No URL provided",
      });
    }

    // Only allow Cloudinary URLs for security
    if (!url.includes("cloudinary.com")) {
      return res.status(403).json({
        message: "Only Cloudinary URLs are allowed",
      });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to fetch subtitle",
      });
    }

    const text = await response.text();

    // Set correct content type for subtitle files
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(text);
  } catch (error) {
    console.error("Subtitle proxy error:", error);
    res.status(500).json({
      message: "Failed to proxy subtitle",
    });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const movie = await safeQuery((db) =>
      db.movie.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          title: true,
          thumbnail: true,
          duration: true,
          rating: true,
          releaseYear: true,
          genres: true,
          description: true,
          // Add any other fields you need EXCEPT cloudinaryName
          rooms: {
            where: { isActive: true },
            include: {
              host: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
              _count: {
                select: { members: true },
              },
            },
          },
        },
      }),
    );

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.status(200).json({ movie });
  } catch (error) {
    console.error("Get movie error:", error);
    res.status(500).json({
      message: "Failed to fetch movie",
      error: error.message, // Send actual error in dev
    });
  }
});



module.exports = router;
