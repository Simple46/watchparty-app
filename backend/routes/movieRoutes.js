const express = require("express");
const router = express.Router();
const db = require("../utils/db");
const { protect } = require("../middleware/authMiddleware");

// ─────────────────────────────────────────
// GET ALL MOVIES (Public)
// GET /api/movies
// Any visitor can browse movies
// No auth required
// ─────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const movies = await db.movie.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        duration: true,
        size: true,
        createdAt: true,
        // Count active rooms watching this movie
        _count: {
          select: {
            rooms: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    res.status(200).json({ movies });
  } catch (error) {
    console.error("Get movies error:", error);
    res.status(500).json({ message: "Failed to fetch movies" });
  }
});

// ─────────────────────────────────────────
// GET SINGLE MOVIE (Public)
// GET /api/movies/:id
// Returns full movie details including video URL
// ─────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const movie = await db.movie.findUnique({
      where: { id: req.params.id },
      include: {
        // Include active rooms for this movie
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
    });

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.status(200).json({ movie });
  } catch (error) {
    console.error("Get movie error:", error);
    res.status(500).json({ message: "Failed to fetch movie" });
  }
});

module.exports = router;
