// ─────────────────────────────────────────
// SOCKET HANDLER
// Manages all real-time WebSocket events
// for the WatchParty sync system
// ─────────────────────────────────────────

// In-memory store of active rooms
// This lives on the server and tracks the current
// state of every active watch party room
// Structure:
// {
//   "ABC123": {
//     movieId: "uuid",
//     hostId: "uuid",
//     hostSocketId: "socket-id",
//     isPlaying: false,
//     currentTime: 0,
//     members: {
//       "socket-id": {
//         userId: "uuid",
//         name: "Hissa",
//         avatar: null,
//         isBuffering: false,
//       }
//     }
//   }
// }
const activeRooms = {};

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─────────────────────────────────────────
    // CREATE ROOM
    // Fired when the host first opens the watch room page
    // ─────────────────────────────────────────
    socket.on("create_room", ({ roomCode, movieId, hostId, user }) => {
      console.log(`🎬 Room created: ${roomCode} by ${user.name}`);

      // Create the room in memory
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

      // Join the Socket.io room
      // This is a Socket.io concept — a "room" is a channel
      // where you can broadcast to all members at once
      socket.join(roomCode);

      // Tell the host their room is ready
      socket.emit("room_created", {
        roomCode,
        members: getMembersList(roomCode),
      });
    });

    // ─────────────────────────────────────────
    // JOIN ROOM
    // Fired when a user enters an existing room
    // ─────────────────────────────────────────
    socket.on("join_room", ({ roomCode, user }) => {
      const room = activeRooms[roomCode];

      if (!room) {
        // Room not found in memory — might have just been created
        // or server restarted. Create a minimal entry.
        socket.emit("room_error", {
          message: "Room not found. Ask the host to refresh.",
        });
        return;
      }

      console.log(`👤 ${user.name} joined room: ${roomCode}`);

      // Add this user to the room's member list
      room.members[socket.id] = {
        userId: user.id,
        name: user.name,
        avatar: user.avatar || null,
        isBuffering: false,
      };

      // Join the Socket.io channel
      socket.join(roomCode);

      // Tell the new user the current state of the room
      // So their video jumps to the right timestamp immediately
      socket.emit("room_state", {
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        hostId: room.hostId,
        members: getMembersList(roomCode),
      });

      // Tell everyone else in the room someone new joined
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

    // ─────────────────────────────────────────
    // PLAY
    // Fired when the host presses play
    // ─────────────────────────────────────────
    socket.on("play", ({ roomCode, currentTime }) => {
      const room = activeRooms[roomCode];
      if (!room) return;

      // Only the host can control playback
      // Ignore play events from non-hosts
      if (room.hostSocketId !== socket.id) return;

      // Update room state in memory
      room.isPlaying = true;
      room.currentTime = currentTime;

      console.log(`▶️  Play in ${roomCode} at ${formatTime(currentTime)}`);

      // Broadcast play event to everyone EXCEPT the host
      // The host's video is already playing
      socket.to(roomCode).emit("play", {
        currentTime,
        // Include server timestamp for latency compensation
        // Clients use this to calculate how much time has passed
        // since the event was sent and adjust their playback
        serverTimestamp: Date.now(),
      });
    });

    // ─────────────────────────────────────────
    // PAUSE
    // Fired when the host presses pause
    // ─────────────────────────────────────────
    socket.on("pause", ({ roomCode, currentTime }) => {
      const room = activeRooms[roomCode];
      if (!room) return;

      if (room.hostSocketId !== socket.id) return;

      room.isPlaying = false;
      room.currentTime = currentTime;

      console.log(`⏸️  Pause in ${roomCode} at ${formatTime(currentTime)}`);

      socket.to(roomCode).emit("pause", { currentTime });
    });

    // ─────────────────────────────────────────
    // SEEK
    // Fired when the host scrubs the video timeline
    // ─────────────────────────────────────────
    socket.on("seek", ({ roomCode, currentTime }) => {
      const room = activeRooms[roomCode];
      if (!room) return;

      if (room.hostSocketId !== socket.id) return;

      room.currentTime = currentTime;

      console.log(`⏭️  Seek in ${roomCode} to ${formatTime(currentTime)}`);

      socket.to(roomCode).emit("seek", {
        currentTime,
        serverTimestamp: Date.now(),
      });
    });

    // ─────────────────────────────────────────
    // SYNC REQUEST
    // Fired when a new user joins and needs
    // to know the exact current timestamp
    // ─────────────────────────────────────────
    socket.on("sync_request", ({ roomCode }) => {
      const room = activeRooms[roomCode];
      if (!room) return;

      // Send back the current room state to this specific socket
      socket.emit("sync_response", {
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        serverTimestamp: Date.now(),
      });
    });

    // ─────────────────────────────────────────
    // BUFFERING
    // Fired when a user's video is loading/buffering
    // We can show "waiting for [name]..." to others
    // ─────────────────────────────────────────
    socket.on("buffering", ({ roomCode }) => {
      const room = activeRooms[roomCode];
      if (!room) return;

      const member = room.members[socket.id];
      if (!member) return;

      member.isBuffering = true;

      // Tell everyone else this user is buffering
      socket.to(roomCode).emit("user_buffering", {
        userId: member.userId,
        name: member.name,
      });
    });

    // ─────────────────────────────────────────
    // BUFFERING DONE
    // Fired when a user's video finishes loading
    // ─────────────────────────────────────────
    socket.on("buffering_done", ({ roomCode }) => {
      const room = activeRooms[roomCode];
      if (!room) return;

      const member = room.members[socket.id];
      if (!member) return;

      member.isBuffering = false;

      socket.to(roomCode).emit("user_buffering_done", {
        userId: member.userId,
        name: member.name,
      });
    });

    // ─────────────────────────────────────────
    // CHAT MESSAGE
    // Fired when a user sends a chat message
    // ─────────────────────────────────────────
    socket.on("chat_message", ({ roomCode, message }) => {
      const room = activeRooms[roomCode];
      if (!room) return;

      const member = room.members[socket.id];
      if (!member) return;

      // Sanitize the message — remove HTML tags
      const cleanMessage = message
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .trim();

      if (!cleanMessage) return;

      // Max message length
      if (cleanMessage.length > 500) return;

      console.log(`💬 [${roomCode}] ${member.name}: ${cleanMessage}`);

      // Broadcast to EVERYONE in the room including sender
      // so their own message appears in the chat immediately
      io.to(roomCode).emit("chat_message", {
        userId: member.userId,
        name: member.name,
        avatar: member.avatar,
        message: cleanMessage,
        timestamp: Date.now(),
        // Mark if this is the sender's own message
        // The frontend uses this to style it differently
        socketId: socket.id,
      });
    });

    // ─────────────────────────────────────────
    // LEAVE ROOM
    // Fired when a user explicitly leaves the room
    // ─────────────────────────────────────────
    socket.on("leave_room", ({ roomCode }) => {
      handleUserLeave(socket, roomCode, io);
    });

    // ─────────────────────────────────────────
    // DISCONNECT
    // Fired automatically when a socket connection drops
    // This handles browser close, network loss, etc.
    // ─────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);

      // Find which room this socket was in and handle their exit
      // We loop through all rooms because the user might not
      // have sent a leave_room event before disconnecting
      for (const roomCode of Object.keys(activeRooms)) {
        const room = activeRooms[roomCode];
        if (room.members[socket.id]) {
          handleUserLeave(socket, roomCode, io);
          break;
        }
      }
    });

    // ═══════════════════════════════════════
    // WEBRTC P2P SIGNALING EVENTS
    // The server only relays handshake messages
    // — zero video data ever touches this server
    // ═══════════════════════════════════════

    // Host signals it has a stream ready in a room
    socket.on("p2p:host_ready", ({ roomCode }) => {
      console.log(`📡 P2P host ready in room: ${roomCode}`);
      // Join the p2p room channel
      socket.join(`p2p:${roomCode}`);
      // Store that this socket is the P2P host
      socket.p2pRoom = roomCode;
      socket.isP2PHost = true;
      // Tell any viewers already waiting that host is ready
      socket.to(`p2p:${roomCode}`).emit("p2p:host_ready");
    });

    // Viewer joins and wants to connect to host
    socket.on("p2p:viewer_join", ({ roomCode }) => {
      console.log(`👤 P2P viewer joined room: ${roomCode}`);
      socket.join(`p2p:${roomCode}`);
      socket.p2pRoom = roomCode;
      socket.isP2PHost = false;
      // Tell host a new viewer wants to connect
      // Host will initiate offer to this specific socket
      socket.to(`p2p:${roomCode}`).emit("p2p:viewer_joined", {
        viewerSocketId: socket.id,
      });
    });

    // Host sends WebRTC offer to a specific viewer
    socket.on("p2p:offer", ({ viewerSocketId, offer }) => {
      console.log(`📤 Offer from host to viewer: ${viewerSocketId}`);
      io.to(viewerSocketId).emit("p2p:offer", {
        offer,
        hostSocketId: socket.id,
      });
    });

    // Viewer sends WebRTC answer back to host
    socket.on("p2p:answer", ({ hostSocketId, answer }) => {
      console.log(`📥 Answer from viewer to host`);
      io.to(hostSocketId).emit("p2p:answer", {
        answer,
        viewerSocketId: socket.id,
      });
    });

    // ICE candidate relay — both directions
    socket.on("p2p:ice_candidate", ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit("p2p:ice_candidate", {
        candidate,
        fromSocketId: socket.id,
      });
    });

    // Host pauses — broadcast to all viewers in this p2p room
    socket.on("p2p:play", ({ roomCode, currentTime }) => {
      socket.to(`p2p:${roomCode}`).emit("p2p:play", { currentTime });
    });

    socket.on("p2p:pause", ({ roomCode, currentTime }) => {
      socket.to(`p2p:${roomCode}`).emit("p2p:pause", { currentTime });
    });

    socket.on("p2p:seek", ({ roomCode, currentTime }) => {
      socket.to(`p2p:${roomCode}`).emit("p2p:seek", { currentTime });
    });
  });
};

// ─────────────────────────────────────────
// HELPER — Handle User Leaving a Room
// Called both on explicit leave and on disconnect
// ─────────────────────────────────────────
const handleUserLeave = (socket, roomCode, io) => {
  const room = activeRooms[roomCode];
  if (!room) return;

  const member = room.members[socket.id];
  if (!member) return;

  const wasHost = room.hostSocketId === socket.id;

  console.log(
    `👋 ${member.name} left room ${roomCode}${wasHost ? " (was host)" : ""}`,
  );

  // Remove this member from the room
  delete room.members[socket.id];
  socket.leave(roomCode);

  // Get remaining members
  const remainingMembers = getMembersList(roomCode);

  if (remainingMembers.length === 0) {
    // No one left — clean up the room from memory
    delete activeRooms[roomCode];
    console.log(`🗑️  Room ${roomCode} removed from memory (empty)`);
    return;
  }

  if (wasHost) {
    // Host left — pass host role to the next member
    const newHostSocketId = Object.keys(room.members)[0];
    const newHost = room.members[newHostSocketId];

    room.hostSocketId = newHostSocketId;
    room.hostId = newHost.userId;

    console.log(`👑 Host transferred to ${newHost.name} in room ${roomCode}`);

    // Tell everyone the host changed
    io.to(roomCode).emit("host_changed", {
      newHostId: newHost.userId,
      newHostName: newHost.name,
      newHostSocketId,
      members: remainingMembers,
    });
  } else {
    // Regular member left — just update the members list
    io.to(roomCode).emit("user_left", {
      userId: member.userId,
      name: member.name,
      members: remainingMembers,
    });
  }
};

// ─────────────────────────────────────────
// HELPER — Get Members List
// Returns an array of member objects for a room
// ─────────────────────────────────────────
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



// ─────────────────────────────────────────
// HELPER — Format Time for Logging
// Converts seconds to MM:SS for cleaner logs
// ─────────────────────────────────────────
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// Export both the handler and the activeRooms
// activeRooms is exported so you can inspect it for debugging
module.exports = { socketHandler, activeRooms };
