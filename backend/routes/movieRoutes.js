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

router.get("/:id", async (req, res) => {
  try {
    const movie = await safeQuery((db) =>
      db.movie.findUnique({
        where: { id: req.params.id },
        include: {
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
              // Count actual members in each room
              _count: {
                select: { members: true },
              },
            },
          },
        },
      }),
    );

    if (!movie) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }

    res.status(200).json({ movie });
  } catch (error) {
    console.error("Get movie error:", error);
    res.status(500).json({
      message: "Failed to fetch movie",
    });
  }
});

module.exports = router;
