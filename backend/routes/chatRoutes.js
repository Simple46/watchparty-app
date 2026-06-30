const express = require("express");
const router = express.Router();
const { safeQuery } = require("../utils/db");
const { protect } = require("../middleware/authMiddleware");
const { isUserOnline } = require("../socket/socketHandler");

// ─────────────────────────────────────────
// GET ALL CONVERSATIONS FOR CURRENT USER
// GET /api/chat/conversations
// ─────────────────────────────────────────
router.get("/conversations", protect, async (req, res) => {
  try {
    const userId = req.user.userId;

    const memberships = await safeQuery((db) =>
      db.conversationMember.findMany({
        where: { userId },
        include: {
          conversation: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true,
                      lastSeenAt: true,
                    },
                  },
                },
              },
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      }),
    );

    const conversations = await Promise.all(
      memberships.map(async (m) => {
        const conv = m.conversation;
        const otherMembers = conv.members
          .filter((mem) => mem.userId !== userId)
          .map((mem) => ({
            id: mem.user.id,
            name: mem.user.name,
            avatar: mem.user.avatar,
            isOnline: isUserOnline(mem.user.id),
            lastSeenAt: mem.user.lastSeenAt,
          }));

        const lastMessage = conv.messages[0] || null;

        const unreadCount = await safeQuery((db) =>
          db.message.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
              createdAt: { gt: m.lastReadAt || new Date(0) },
            },
          }),
        );

        return {
          id: conv.id,
          type: conv.type,
          name:
            conv.type === "group"
              ? conv.name
              : otherMembers[0]?.name || "Unknown",
          avatar:
            conv.type === "group"
              ? conv.avatar
              : otherMembers[0]?.avatar || null,
          members: otherMembers,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount,
        };
      }),
    );

    conversations.sort((a, b) => {
      const at = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt)
        : 0;
      const bt = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt)
        : 0;
      return bt - at;
    });

    res.status(200).json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      message: "Failed to fetch conversations",
    });
  }
});

// ─────────────────────────────────────────
// GET MESSAGE HISTORY
// GET /api/chat/conversations/:id/messages
// ─────────────────────────────────────────
router.get("/conversations/:id/messages", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const member = await safeQuery((db) =>
      db.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: id,
            userId,
          },
        },
      }),
    );

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this conversation",
      });
    }

    const messages = await safeQuery((db) =>
      db.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
    );

    // Mark as read on load
    await safeQuery((db) =>
      db.conversationMember.update({
        where: {
          conversationId_userId: {
            conversationId: id,
            userId,
          },
        },
        data: { lastReadAt: new Date() },
      }),
    );

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      message: "Failed to fetch messages",
    });
  }
});

// ─────────────────────────────────────────
// CREATE OR GET DIRECT CONVERSATION
// POST /api/chat/conversations/direct
// ─────────────────────────────────────────
router.post("/conversations/direct", protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ message: "friendId required" });
    }

    const friendship = await safeQuery((db) =>
      db.friend.findFirst({
        where: {
          status: "accepted",
          OR: [
            { userId, friendId },
            { userId: friendId, friendId: userId },
          ],
        },
      }),
    );

    if (!friendship) {
      return res.status(403).json({
        message: "You can only message friends",
      });
    }

    const existingConversations = await safeQuery((db) =>
      db.conversation.findMany({
        where: {
          type: "direct",
          members: { some: { userId } },
        },
        include: { members: true },
      }),
    );

    const existing = existingConversations.find(
      (conv) =>
        conv.members.length === 2 &&
        conv.members.some((m) => m.userId === friendId),
    );

    if (existing) {
      return res.status(200).json({
        conversationId: existing.id,
      });
    }

    const conversation = await safeQuery((db) =>
      db.conversation.create({
        data: {
          type: "direct",
          members: {
            create: [{ userId }, { userId: friendId }],
          },
        },
      }),
    );

    res.status(201).json({ conversationId: conversation.id });
  } catch (error) {
    console.error("Create direct conversation error:", error);
    res.status(500).json({
      message: "Failed to start conversation",
    });
  }
});

// ─────────────────────────────────────────
// CREATE GROUP CONVERSATION
// POST /api/chat/conversations/group
// ─────────────────────────────────────────
router.post("/conversations/group", protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, memberIds } = req.body;

    if (!name?.trim() || !Array.isArray(memberIds) || memberIds.length < 2) {
      return res.status(400).json({
        message: "Group name and at least 2 other friends are required",
      });
    }

    const friendships = await safeQuery((db) =>
      db.friend.findMany({
        where: {
          status: "accepted",
          OR: [{ userId }, { friendId: userId }],
        },
      }),
    );

    const verifiedFriendIds = new Set(
      friendships.map((f) => (f.userId === userId ? f.friendId : f.userId)),
    );

    const validMemberIds = memberIds.filter((id) => verifiedFriendIds.has(id));

    if (validMemberIds.length < 2) {
      return res.status(400).json({
        message: "You can only add friends to a group",
      });
    }

    const conversation = await safeQuery((db) =>
      db.conversation.create({
        data: {
          type: "group",
          name: name.trim(),
          createdBy: userId,
          members: {
            create: [
              { userId, isAdmin: true },
              ...validMemberIds.map((id) => ({ userId: id })),
            ],
          },
        },
      }),
    );

    res.status(201).json({ conversationId: conversation.id });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ message: "Failed to create group" });
  }
});

// ─────────────────────────────────────────
// GET TOTAL UNREAD COUNT (for navbar badge)
// GET /api/chat/unread-count
// ─────────────────────────────────────────
router.get("/unread-count", protect, async (req, res) => {
  try {
    const userId = req.user.userId;

    const memberships = await safeQuery((db) =>
      db.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true, lastReadAt: true },
      }),
    );

    let totalUnread = 0;
    for (const m of memberships) {
      const count = await safeQuery((db) =>
        db.message.count({
          where: {
            conversationId: m.conversationId,
            senderId: { not: userId },
            createdAt: { gt: m.lastReadAt || new Date(0) },
          },
        }),
      );
      totalUnread += count;
    }

    res.status(200).json({ unreadCount: totalUnread });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch unread count",
    });
  }
});

// ─────────────────────────────────────────
// GET SINGLE CONVERSATION DETAILS
// GET /api/chat/conversations/:id
// ─────────────────────────────────────────
router.get("/conversations/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const member = await safeQuery((db) =>
      db.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: id, userId } },
        include: {
          conversation: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true,
                      lastSeenAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    );

    if (!member) {
      return res.status(403).json({
        message: "Not a member of this conversation",
      });
    }

    const conv = member.conversation;
    const otherMembers = conv.members
      .filter((m) => m.userId !== userId)
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
        isOnline: isUserOnline(m.user.id),
        lastSeenAt: m.user.lastSeenAt,
      }));

    res.status(200).json({
      conversation: {
        id: conv.id,
        type: conv.type,
        name:
          conv.type === "group"
            ? conv.name
            : otherMembers[0]?.name || "Unknown",
        avatar:
          conv.type === "group"
            ? conv.avatar
            : otherMembers[0]?.avatar || null,
        members: otherMembers,
      },
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({
      message: "Failed to fetch conversation",
    });
  }
});

module.exports = router;
