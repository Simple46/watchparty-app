const jwt = require("jsonwebtoken");
const { safeQuery } = require("../utils/db");

// ─────────────────────────────────────────
// EXISTING ROOM STATE (unchanged from before)
// ─────────────────────────────────────────
const activeRooms = {};

// ─────────────────────────────────────────
// NEW — GLOBAL PRESENCE STATE
// Maps userId -> Set of socketIds
// A user can have multiple devices/tabs open
// so we only mark them "offline" when ALL
// their sockets disconnect
// ─────────────────────────────────────────
const onlineUsers = new Map();

const socketHandler = (io) => {
  // ─────────────────────────────────────────
  // AUTHENTICATE EVERY CONNECTING SOCKET
  // If a valid JWT is provided, attach userId
  // to the socket so we know who's online
  // ─────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // allow unauthenticated (legacy room flow)

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
    } catch (err) {
      // Invalid/expired token — let them connect anonymously
      // rather than blocking the whole socket connection
    }
    next();
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── PRESENCE: mark this user online ───
    if (socket.userId) {
      handleUserConnect(io, socket);

      // Join every conversation this user is part of
      // so messages/typing broadcast correctly
      joinUserConversations(socket);
    }

    // ═══════════════════════════════════════
    // EXISTING WATCH PARTY ROOM EVENTS
    // (unchanged — copy exactly as before)
    // ═══════════════════════════════════════

    socket.on("create_room", ({ roomCode, movieId, hostId, user }) => {
      console.log(`🎬 Room created: ${roomCode} by ${user.name}`);
      activeRooms[roomCode] = {
        movieId,
        hostId,
        hostSocketId: socket.id,
        isPlaying: false,
        currentTime: 0,
        members: {
          [socket.id]: {
            userId: hostId,
            name: user.name,
            avatar: user.avatar || null,
            isBuffering: false,
          },
        },
      };
      socket.join(roomCode);
      socket.emit("room_created", {
        roomCode,
        members: getMembersList(roomCode),
      });
    });

    socket.on("join_room", ({ roomCode, user }) => {
      const room = activeRooms[roomCode];
      if (!room) {
        socket.emit("room_error", {
          message: "Room not found. Ask the host to refresh.",
        });
        return;
      }
      console.log(`👤 ${user.name} joined room: ${roomCode}`);
      room.members[socket.id] = {
        userId: user.id,
        name: user.name,
        avatar: user.avatar || null,
        isBuffering: false,
      };
      socket.join(roomCode);
      socket.emit("room_state", {
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        hostId: room.hostId,
        members: getMembersList(roomCode),
      });
      socket.to(roomCode).emit("user_joined", {
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar || null,
          socketId: socket.id,
        },
        members: getMembersList(roomCode),
      });
    });

    socket.on("play", ({ roomCode, currentTime }) => {
      const room = activeRooms[roomCode];
      if (!room || room.hostSocketId !== socket.id) return;
      room.isPlaying = true;
      room.currentTime = currentTime;
      socket.to(roomCode).emit("play", {
        currentTime,
        serverTimestamp: Date.now(),
      });
    });

    socket.on("pause", ({ roomCode, currentTime }) => {
      const room = activeRooms[roomCode];
      if (!room || room.hostSocketId !== socket.id) return;
      room.isPlaying = false;
      room.currentTime = currentTime;
      socket.to(roomCode).emit("pause", { currentTime });
    });

    socket.on("seek", ({ roomCode, currentTime }) => {
      const room = activeRooms[roomCode];
      if (!room || room.hostSocketId !== socket.id) return;
      room.currentTime = currentTime;
      socket.to(roomCode).emit("seek", {
        currentTime,
        serverTimestamp: Date.now(),
      });
    });

    socket.on("sync_request", ({ roomCode }) => {
      const room = activeRooms[roomCode];
      if (!room) return;
      socket.emit("sync_response", {
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        serverTimestamp: Date.now(),
      });
    });

    socket.on("buffering", ({ roomCode }) => {
      const room = activeRooms[roomCode];
      const member = room?.members[socket.id];
      if (!member) return;
      member.isBuffering = true;
      socket.to(roomCode).emit("user_buffering", {
        userId: member.userId,
        name: member.name,
      });
    });

    socket.on("buffering_done", ({ roomCode }) => {
      const room = activeRooms[roomCode];
      const member = room?.members[socket.id];
      if (!member) return;
      member.isBuffering = false;
      socket.to(roomCode).emit("user_buffering_done", {
        userId: member.userId,
        name: member.name,
      });
    });

    socket.on("chat_message", ({ roomCode, message }) => {
      const room = activeRooms[roomCode];
      const member = room?.members[socket.id];
      if (!member) return;
      const cleanMessage = message
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .trim();
      if (!cleanMessage || cleanMessage.length > 500) return;
      io.to(roomCode).emit("chat_message", {
        userId: member.userId,
        name: member.name,
        avatar: member.avatar,
        message: cleanMessage,
        timestamp: Date.now(),
        socketId: socket.id,
      });
    });

    socket.on("leave_room", ({ roomCode }) => {
      handleRoomLeave(socket, roomCode, io);
    });

    // ═══════════════════════════════════════
    // NEW — DIRECT / GROUP CHAT EVENTS
    // ═══════════════════════════════════════

    // Join newly created conversation rooms without reconnecting
    socket.on("join_conversation", ({ conversationId }) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("send_message", async ({ conversationId, content }) => {
      if (!socket.userId || !content?.trim()) return;

      try {
        // Verify sender is actually a member of this conversation
        const member = await safeQuery((db) =>
          db.conversationMember.findUnique({
            where: {
              conversationId_userId: {
                conversationId,
                userId: socket.userId,
              },
            },
          }),
        );
        if (!member) return;

        const cleanContent = content
          .trim()
          .slice(0, 2000)
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        const message = await safeQuery((db) =>
          db.message.create({
            data: {
              conversationId,
              senderId: socket.userId,
              content: cleanContent,
            },
            include: {
              sender: {
                select: { id: true, name: true, avatar: true },
              },
            },
          }),
        );

        io.to(`conversation:${conversationId}`).emit("new_message", message);
      } catch (err) {
        console.error("send_message error:", err.message);
      }
    });

    socket.on("typing_start", ({ conversationId }) => {
      if (!socket.userId) return;
      socket.to(`conversation:${conversationId}`).emit("user_typing", {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on("typing_stop", ({ conversationId }) => {
      if (!socket.userId) return;
      socket.to(`conversation:${conversationId}`).emit("user_stop_typing", {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on("mark_read", async ({ conversationId }) => {
      if (!socket.userId) return;
      try {
        await safeQuery((db) =>
          db.conversationMember.update({
            where: {
              conversationId_userId: {
                conversationId,
                userId: socket.userId,
              },
            },
            data: { lastReadAt: new Date() },
          }),
        );
        socket.to(`conversation:${conversationId}`).emit("messages_read", {
          conversationId,
          userId: socket.userId,
        });
      } catch (err) {
        console.error("mark_read error:", err.message);
      }
    });

    // ─── DISCONNECT — handles BOTH room and presence cleanup ───
    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);

      // Clean up any room this socket was in
      for (const roomCode of Object.keys(activeRooms)) {
        if (activeRooms[roomCode].members[socket.id]) {
          handleRoomLeave(socket, roomCode, io);
          break;
        }
      }

      // Clean up presence
      if (socket.userId) {
        handleUserDisconnect(io, socket);
      }
    });
  });
};

// ─────────────────────────────────────────
// PRESENCE HELPERS
// ─────────────────────────────────────────

const handleUserConnect = async (io, socket) => {
  const userId = socket.userId;

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Personal room — lets us push events to a specific
  // user across all their devices/tabs at once
  socket.join(`user:${userId}`);

  // Only broadcast "came online" on their FIRST connection
  // (avoids spamming friends if user has multiple tabs open)
  if (onlineUsers.get(userId).size === 1) {
    const friendIds = await getFriendIds(userId);
    friendIds.forEach((fid) => {
      io.to(`user:${fid}`).emit("friend_online", { userId });
    });
  }
};

const handleUserDisconnect = async (io, socket) => {
  const userId = socket.userId;
  const set = onlineUsers.get(userId);
  if (!set) return;

  set.delete(socket.id);

  // Only mark offline when ALL their sockets are gone
  if (set.size === 0) {
    onlineUsers.delete(userId);

    const lastSeenAt = new Date();
    try {
      await safeQuery((db) =>
        db.user.update({
          where: { id: userId },
          data: { lastSeenAt },
        }),
      );
    } catch (err) {
      console.error("Failed to save lastSeenAt:", err.message);
    }

    const friendIds = await getFriendIds(userId);
    friendIds.forEach((fid) => {
      io.to(`user:${fid}`).emit("friend_offline", {
        userId,
        lastSeenAt,
      });
    });
  }
};

const getFriendIds = async (userId) => {
  try {
    const friends = await safeQuery((db) =>
      db.friend.findMany({
        where: {
          status: "accepted",
          OR: [{ userId }, { friendId: userId }],
        },
      }),
    );
    return friends.map((f) => (f.userId === userId ? f.friendId : f.userId));
  } catch {
    return [];
  }
};

const joinUserConversations = async (socket) => {
  try {
    const memberships = await safeQuery((db) =>
      db.conversationMember.findMany({
        where: { userId: socket.userId },
        select: { conversationId: true },
      }),
    );
    memberships.forEach((m) => {
      socket.join(`conversation:${m.conversationId}`);
    });
  } catch (err) {
    console.error("joinUserConversations error:", err.message);
  }
};

// Exported so REST routes can check "is this user online right now"
const isUserOnline = (userId) => onlineUsers.has(userId);

// ─────────────────────────────────────────
// ROOM HELPERS (unchanged from before)
// ─────────────────────────────────────────

const handleRoomLeave = (socket, roomCode, io) => {
  const room = activeRooms[roomCode];
  if (!room) return;
  const member = room.members[socket.id];
  if (!member) return;

  const wasHost = room.hostSocketId === socket.id;
  delete room.members[socket.id];
  socket.leave(roomCode);

  const remainingMembers = getMembersList(roomCode);

  if (remainingMembers.length === 0) {
    delete activeRooms[roomCode];
    return;
  }

  if (wasHost) {
    const newHostSocketId = Object.keys(room.members)[0];
    const newHost = room.members[newHostSocketId];
    room.hostSocketId = newHostSocketId;
    room.hostId = newHost.userId;
    io.to(roomCode).emit("host_changed", {
      newHostId: newHost.userId,
      newHostName: newHost.name,
      newHostSocketId,
      members: remainingMembers,
    });
  } else {
    io.to(roomCode).emit("user_left", {
      userId: member.userId,
      name: member.name,
      members: remainingMembers,
    });
  }
};

const getMembersList = (roomCode) => {
  const room = activeRooms[roomCode];
  if (!room) return [];
  return Object.entries(room.members).map(([socketId, member]) => ({
    socketId,
    userId: member.userId,
    name: member.name,
    avatar: member.avatar,
    isBuffering: member.isBuffering,
    isHost: socketId === room.hostSocketId,
  }));
};

module.exports = { socketHandler, isUserOnline };
