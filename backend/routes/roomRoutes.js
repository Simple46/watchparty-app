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

// GET /api/rooms/ice-config
// Returns STUN + TURN server config for WebRTC
router.get("/ice-config", protect, (req, res) => {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  for (const urls of [
    process.env.METERED_TURN_URL,
    process.env.METERED_TURNS_URL,
  ]) {
    if (
      urls &&
      process.env.METERED_TURN_USERNAME &&
      process.env.METERED_TURN_CREDENTIAL
    ) {
      iceServers.push({
        urls,
        username: process.env.METERED_TURN_USERNAME,
        credential: process.env.METERED_TURN_CREDENTIAL,
      });
    }
  }

  res.status(200).json({ iceServers });
});

// GET /api/rooms/active-p2p
// Lists active peer-to-peer rooms so viewers can join a live stream.
router.get("/active-p2p", async (_req, res) => {
  try {
    const rooms = await safeQuery((db) =>
      db.room.findMany({
        where: {
          isActive: true,
          movieId: null,
          streamTitle: { not: null },
          members: { some: {} },
        },
        orderBy: { createdAt: "desc" },
        select: {
          roomCode: true,
          streamTitle: true,
          createdAt: true,
          host: { select: { name: true } },
          _count: { select: { members: true } },
        },
      }),
    );

    res.status(200).json({ rooms });
  } catch (error) {
    console.error("Get active P2P rooms error:", error);
    res.status(500).json({ message: "Failed to fetch active streams" });
  }
});

// PATCH /api/rooms/:roomCode/stream-title
// Updates the title shown in the public live-stream list.
router.patch("/:roomCode/stream-title", protect, async (req, res) => {
  try {
    const streamTitle =
      typeof req.body.title === "string" ? req.body.title.trim() : "";

    if (!streamTitle || streamTitle.length > 120) {
      return res.status(400).json({
        message: "Stream title must be between 1 and 120 characters",
      });
    }

    const room = await safeQuery((db) =>
      db.room.findUnique({
        where: { roomCode: req.params.roomCode.toUpperCase() },
        select: { id: true, hostId: true, isActive: true, movieId: true },
      }),
    );

    if (!room || !room.isActive || room.movieId) {
      return res.status(404).json({ message: "Active stream not found" });
    }

    if (room.hostId !== req.user.userId) {
      return res.status(403).json({
        message: "Only the stream host can update its title",
      });
    }

    await safeQuery((db) =>
      db.room.update({
        where: { id: room.id },
        data: { streamTitle },
      }),
    );

    res.status(200).json({ message: "Stream title updated", streamTitle });
  } catch (error) {
    console.error("Update P2P stream title error:", error);
    res.status(500).json({ message: "Failed to update stream title" });
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
              source: true,
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
        data: { isActive: false, streamTitle: null },
      }),
    );

    if (!room.movieId) {
      await safeQuery((db) =>
        db.roomMember.deleteMany({
          where: { roomId: room.id },
        }),
      );
    }

    res.status(200).json({ message: "Room closed successfully" });
  } catch (error) {
    console.error("Close room error:", error);
    res.status(500).json({ message: "Failed to close room" });
  }
});

// ─────────────────────────────────────────
// LEAVE ROOM
// POST /api/rooms/:roomCode/leave
// Marks user as inactive in the room
// If last member, closes the room entirely
// ─────────────────────────────────────────
router.post("/:roomCode/leave", protect, async (req, res) => {
  try {
    const room = await safeQuery((db) =>
      db.room.findUnique({
        where: {
          roomCode: req.params.roomCode.toUpperCase(),
        },
      }),
    );

    if (!room) {
      return res.status(200).json({ message: "Room not found" });
    }

    // Remove this user from room members
    await safeQuery((db) => {
      return db.roomMember.deleteMany({
        where: {
          roomId: room.id,
          userId: req.user.userId,
        },
      });
    });

    const isP2PHostLeaving = !room.movieId && room.hostId === req.user.userId;

    if (isP2PHostLeaving) {
      await safeQuery((db) =>
        db.room.update({
          where: { id: room.id },
          data: { isActive: false, streamTitle: null },
        }),
      );
      await safeQuery((db) =>
        db.roomMember.deleteMany({
          where: { roomId: room.id },
        }),
      );

      return res.status(200).json({
        message: "P2P stream ended",
        remainingMembers: 0,
      });
    }

    // Count remaining members AFTER deletion
    const remainingMembers = await safeQuery((db) =>
      db.roomMember.count({
        where: { roomId: room.id },
      }),
    );

    console.log(
      `Room ${room.roomCode}: ${remainingMembers} members remaining after ${req.user.userId} left`,
    );

    // Only close the room if truly nobody is left
    if (remainingMembers === 0) {
      await safeQuery((db) =>
        db.room.update({
          where: { id: room.id },
          data: { isActive: false },
        }),
      );
      console.log(`Room ${room.roomCode} closed — no members left`);
    }

    res.status(200).json({
      message: "Left room successfully",
      remainingMembers,
    });
  } catch (error) {
    console.error("Leave room error:", error);
    res.status(500).json({ message: "Failed to leave room" });
  }
});

// POST /api/rooms/create-p2p
// Creates a P2P streaming room with no movie attached
router.post("/create-p2p", protect, async (req, res) => {
  try {
    const generateRoomCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let roomCode;
    let isUnique = false;

    while (!isUnique) {
      roomCode = generateRoomCode();
      const existing = await safeQuery((db) =>
        db.room.findUnique({ where: { roomCode } }),
      );

      if (!existing) {
        isUnique = true;
      }
    }

    const room = await safeQuery((db) =>
      db.room.create({
        data: {
          roomCode,
          movieId: null,
          hostId: req.user.userId,
          isActive: true,
        },
      }),
    );

    await safeQuery((db) =>
      db.roomMember.create({
        data: {
          roomId: room.id,
          userId: req.user.userId,
        },
      }),
    );

    res.status(201).json({
      message: "P2P room created",
      roomCode: room.roomCode,
    });
  } catch (error) {
    console.error("Create P2P room error:", error);
    res.status(500).json({
      message: "Failed to create room: " + error.message,
    });
  }
});

module.exports = router;
