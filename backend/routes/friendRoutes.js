const express = require("express");
const router = express.Router();
const { safeQuery } = require("../utils/db");
const { protect } = require("../middleware/authMiddleware");

// ─────────────────────────────────────────
// SEARCH USERS
// GET /api/friends/search?q=name
// Search for users to add as friends
// ─────────────────────────────────────────
router.get("/search", protect, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters",
      });
    }

    const users = await safeQuery((db) =>
      db.user.findMany({
        where: {
          AND: [
            // Don't show the current user in results
            { id: { not: req.user.userId } },
            // Don't show admins
            { role: "user" },
            {
              OR: [
                {
                  name: {
                    contains: q.trim(),
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: q.trim(),
                    mode: "insensitive",
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
        take: 10,
      }),
    );

    res.status(200).json({ users });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ message: "Search failed" });
  }
});

// ─────────────────────────────────────────
// GET MY FRIENDS
// GET /api/friends
// Returns accepted friends + pending requests
// ─────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get accepted friends (both directions)
    const [sentAccepted, receivedAccepted, pendingReceived, pendingSent] =
      await Promise.all([
        // Friends I added that accepted
        safeQuery((db) =>
          db.friend.findMany({
            where: { userId, status: "accepted" },
            include: {
              friend: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          }),
        ),
        // Friends who added me that I accepted
        safeQuery((db) =>
          db.friend.findMany({
            where: { friendId: userId, status: "accepted" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          }),
        ),
        // Pending requests I received
        safeQuery((db) =>
          db.friend.findMany({
            where: { friendId: userId, status: "pending" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          }),
        ),
        // Pending requests I sent
        safeQuery((db) =>
          db.friend.findMany({
            where: { userId, status: "pending" },
            include: {
              friend: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          }),
        ),
      ]);

    // Normalize to consistent format
    const friends = [
      ...sentAccepted.map((f) => ({
        id: f.id,
        user: f.friend,
        status: "accepted",
        direction: "sent",
      })),
      ...receivedAccepted.map((f) => ({
        id: f.id,
        user: f.user,
        status: "accepted",
        direction: "received",
      })),
    ];

    const pendingIncoming = pendingReceived.map((f) => ({
      id: f.id,
      user: f.user,
      status: "pending",
      direction: "received",
    }));

    const pendingOutgoing = pendingSent.map((f) => ({
      id: f.id,
      user: f.friend,
      status: "pending",
      direction: "sent",
    }));

    res.status(200).json({
      friends,
      pendingIncoming,
      pendingOutgoing,
    });
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({ message: "Failed to fetch friends" });
  }
});

// ─────────────────────────────────────────
// SEND FRIEND REQUEST
// POST /api/friends/request/:userId
// ─────────────────────────────────────────
router.post("/request/:userId", protect, async (req, res) => {
  try {
    const fromId = req.user.userId;
    const toId = req.params.userId;

    if (fromId === toId) {
      return res.status(400).json({
        message: "You cannot add yourself",
      });
    }

    // Check if request already exists in either direction
    const existing = await safeQuery((db) =>
      db.friend.findFirst({
        where: {
          OR: [
            { userId: fromId, friendId: toId },
            { userId: toId, friendId: fromId },
          ],
        },
      }),
    );

    if (existing) {
      return res.status(400).json({
        message:
          existing.status === "accepted"
            ? "Already friends"
            : "Friend request already sent",
      });
    }

    const request = await safeQuery((db) =>
      db.friend.create({
        data: {
          userId: fromId,
          friendId: toId,
          status: "pending",
        },
      }),
    );

    res.status(201).json({
      message: "Friend request sent",
      request,
    });
  } catch (error) {
    console.error("Send friend request error:", error);
    res.status(500).json({
      message: "Failed to send friend request",
    });
  }
});

// ─────────────────────────────────────────
// ACCEPT FRIEND REQUEST
// POST /api/friends/accept/:requestId
// ─────────────────────────────────────────
router.post("/accept/:requestId", protect, async (req, res) => {
  try {
    const request = await safeQuery((db) =>
      db.friend.findUnique({
        where: { id: req.params.requestId },
      }),
    );

    if (!request) {
      return res.status(404).json({
        message: "Friend request not found",
      });
    }

    // Only the recipient can accept
    if (request.friendId !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized to accept this request",
      });
    }

    const updated = await safeQuery((db) =>
      db.friend.update({
        where: { id: req.params.requestId },
        data: { status: "accepted" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
    );

    res.status(200).json({
      message: "Friend request accepted",
      friend: updated,
    });
  } catch (error) {
    console.error("Accept friend request error:", error);
    res.status(500).json({ message: "Failed to accept request" });
  }
});

// ─────────────────────────────────────────
// DECLINE OR REMOVE FRIEND
// DELETE /api/friends/:requestId
// Works for both declining requests and removing friends
// ─────────────────────────────────────────
router.delete("/:requestId", protect, async (req, res) => {
  try {
    const request = await safeQuery((db) =>
      db.friend.findUnique({
        where: { id: req.params.requestId },
      }),
    );

    if (!request) {
      return res.status(404).json({
        message: "Not found",
      });
    }

    // Only people involved in the friendship can remove it
    if (
      request.userId !== req.user.userId &&
      request.friendId !== req.user.userId
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    await safeQuery((db) =>
      db.friend.delete({
        where: { id: req.params.requestId },
      }),
    );

    res.status(200).json({ message: "Removed successfully" });
  } catch (error) {
    console.error("Remove friend error:", error);
    res.status(500).json({ message: "Failed to remove" });
  }
});

module.exports = router;
