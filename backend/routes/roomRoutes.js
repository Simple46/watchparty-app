const express = require("express");
const router = express.Router();
const { db, safeQuery } = require("../utils/db");
const { protect } = require("../middleware/authMiddleware");

// ─── GENERATE ROOM CODE ───
// Creates a random 6-character uppercase code like "ABC123"
// This is what users share with friends to join
const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ─────────────────────────────────────────
// CREATE ROOM
// POST /api/rooms/create
// Creates a new watch party room for a movie
// Only logged in users can create rooms
// ─────────────────────────────────────────
router.post("/create", protect, async (req, res) => {
  try {
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({
        message: "Please provide a movieId",
      });
    }

    // Check the movie actually exists
    const movie = await safeQuery((db) =>
      db.movie.findUnique({ where: { id: movieId } }),
    );

    if (!movie) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }

    // Generate a unique room code
    // Keep trying until we get one that is not already in use
    let roomCode;
    let isUnique = false;

    while (!isUnique) {
      roomCode = generateRoomCode();
      const existing = await safeQuery((db) =>
        db.room.findUnique({ where: { roomCode } }),
      );
      if (!existing) isUnique = true;
    }

    // Create the room in the database
    const room = await safeQuery((db) =>
      db.room.create({
        data: {
          roomCode,
          movieId: movie.id,
          hostId: req.user.userId,
          isActive: true,
        },
      }),
    );

    // Add the host as the first member of the room
    await safeQuery((db) =>
      db.roomMember.create({
        data: {
          roomId: room.id,
          userId: req.user.userId,
        },
      }),
    );

    console.log(`✅ Room created: ${roomCode} for movie "${movie.title}"`);

    res.status(201).json({
      message: "Room created successfully",
      room: {
        id: room.id,
        roomCode: room.roomCode,
        movieId: room.movieId,
        hostId: room.hostId,
        movie: {
          id: movie.id,
          title: movie.title,
          videoUrl: movie.videoUrl,
          thumbnail: movie.thumbnail,
          duration: movie.duration,
        },
      },
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({
      message: "Failed to create room: " + error.message,
    });
  }
});

// ─────────────────────────────────────────
// GET ROOM BY CODE
// GET /api/rooms/:roomCode
// Returns room details for a given room code
// Used when a user joins a room to get movie info
// ─────────────────────────────────────────
router.get("/:roomCode", protect, async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await safeQuery((db) =>
      db.room.findUnique({
        where: { roomCode: roomCode.toUpperCase() },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              videoUrl: true,
              thumbnail: true,
              duration: true,
            },
          },
          host: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      }),
    );

    if (!room) {
      return res.status(404).json({
        message: "Room not found. Check the room code and try again.",
      });
    }

    if (!room.isActive) {
      return res.status(410).json({
        message: "This room has ended.",
      });
    }

    // Add this user as a member if they are not already
    const isMember = room.members.some((m) => m.userId === req.user.userId);

    if (!isMember) {
      await safeQuery((db) =>
        db.roomMember.create({
          data: {
            roomId: room.id,
            userId: req.user.userId,
          },
        }),
      );
    }

    res.status(200).json({ room });
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({
      message: "Failed to get room: " + error.message,
    });
  }
});

// ─────────────────────────────────────────
// CLOSE ROOM
// POST /api/rooms/:roomCode/close
// Only the host can close a room
// ─────────────────────────────────────────
router.post("/:roomCode/close", protect, async (req, res) => {
  try {
    const room = await safeQuery((db) =>
      db.room.findUnique({
        where: { roomCode: req.params.roomCode.toUpperCase() },
      }),
    );

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Only the host can close the room
    if (room.hostId !== req.user.userId) {
      return res.status(403).json({
        message: "Only the host can close this room",
      });
    }

    await safeQuery((db) =>
      db.room.update({
        where: { id: room.id },
        data: { isActive: false },
      }),
    );

    res.status(200).json({ message: "Room closed successfully" });
  } catch (error) {
    console.error("Close room error:", error);
    res.status(500).json({ message: "Failed to close room" });
  }
});

module.exports = router;
