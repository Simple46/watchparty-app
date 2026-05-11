"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";

// This hook manages everything about a watch party room:
// - Connecting and joining the room
// - Tracking who is in the room
// - Syncing play/pause/seek events
// - Chat messages
// - Buffering state
//
// The video player component calls the functions from this hook
// to emit events, and listens to the state changes to update
export default function useRoom(roomCode, roomData) {
  const { user } = useAuth();
  const socket = getSocket();

  // ─── ROOM STATE ───
  const [members, setMembers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomJoined, setRoomJoined] = useState(false);

  // ─── CHAT STATE ───
  const [messages, setMessages] = useState([]);

  // ─── PLAYBACK SYNC STATE ───
  // These are the values your video player reads
  const [syncEvent, setSyncEvent] = useState(null);
  // syncEvent looks like: { type: "play"|"pause"|"seek", currentTime, serverTimestamp }

  // ─── BUFFERING STATE ───
  const [bufferingUsers, setBufferingUsers] = useState([]);

  // Track if this user is the host
  const isHost = user?.id === hostId;

  // Reference to track if we have already joined
  // Prevents double-joining on re-renders
  const hasJoined = useRef(false);

  // ─── JOIN OR CREATE ROOM ───
  const joinOrCreateRoom = useCallback(() => {
    if (!socket || !roomData || !user) return;

    const isHost = user.id === roomData.hostId;

    if (isHost) {
      // Host creates the room in the socket server
      socket.emit("create_room", {
        roomCode,
        movieId: roomData.movie.id,
        hostId: user.id,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar || null,
        },
      });
    } else {
      // Regular user joins an existing room
      socket.emit("join_room", {
        roomCode,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar || null,
        },
      });
    }
  }, [roomCode, roomData, user, socket]);

  // ─── ADD SYSTEM MESSAGE ───
  const addSystemMessage = useCallback((text) => {
    setMessages((prev) => [
      ...prev,
      {
        isSystem: true,
        message: text,
        timestamp: Date.now(),
        id: Math.random().toString(36).slice(2),
      },
    ]);
  }, []);

  // ─── SETUP SOCKET EVENTS ───
  useEffect(() => {
    if (!roomCode || !user || !roomData) return;
    if (!socket) return;

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);

      // Once connected, join or create the room
      if (!hasJoined.current) {
        hasJoined.current = true;
        joinOrCreateRoom();
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
      hasJoined.current = false;
    };

    // If already connected, join immediately
    if (socket.connected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsConnected(true);
      if (!hasJoined.current) {
        hasJoined.current = true;
        joinOrCreateRoom();
      }
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // ─── ROOM EVENTS ───

    // Room was successfully created (host only)
    socket.on("room_created", ({ members }) => {
      setMembers(members);
      setHostId(roomData.hostId);
      setRoomJoined(true);
    });

    // Current room state (received when joining)
    socket.on("room_state", ({ isPlaying, currentTime, hostId, members }) => {
      setMembers(members);
      setHostId(hostId);
      setRoomJoined(true);

      // Sync your video to the current room state
      setSyncEvent({
        type: isPlaying ? "play" : "pause",
        currentTime,
        serverTimestamp: Date.now(),
      });
    });

    // Someone new joined
    socket.on("user_joined", ({ user: joinedUser, members }) => {
      setMembers(members);
      addSystemMessage(`${joinedUser.name} joined the room`);
    });

    // Someone left
    socket.on("user_left", ({ name, members }) => {
      setMembers(members);
      addSystemMessage(`${name} left the room`);
    });

    // Host changed
    socket.on("host_changed", ({ newHostId, newHostName, members }) => {
      setHostId(newHostId);
      setMembers(members);
      addSystemMessage(`${newHostName} is now the host`);
    });

    // Room error
    socket.on("room_error", ({ message }) => {
      console.error("Room error:", message);
    });

    // ─── PLAYBACK SYNC EVENTS ───

    // Play event from host
    socket.on("play", ({ currentTime, serverTimestamp }) => {
      setSyncEvent({
        type: "play",
        currentTime,
        serverTimestamp,
      });
    });

    // Pause event from host
    socket.on("pause", ({ currentTime }) => {
      setSyncEvent({
        type: "pause",
        currentTime,
        serverTimestamp: Date.now(),
      });
    });

    // Seek event from host
    socket.on("seek", ({ currentTime, serverTimestamp }) => {
      setSyncEvent({
        type: "seek",
        currentTime,
        serverTimestamp,
      });
    });

    // Sync response — current timestamp from room
    socket.on(
      "sync_response",
      ({ isPlaying, currentTime, serverTimestamp }) => {
        setSyncEvent({
          type: isPlaying ? "play" : "pause",
          currentTime,
          serverTimestamp,
        });
      },
    );

    // ─── BUFFERING EVENTS ───
    socket.on("user_buffering", ({ userId, name }) => {
      setBufferingUsers((prev) => {
        if (prev.find((u) => u.userId === userId)) return prev;
        return [...prev, { userId, name }];
      });
    });

    socket.on("user_buffering_done", ({ userId }) => {
      setBufferingUsers((prev) => prev.filter((u) => u.userId !== userId));
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_created");
      socket.off("room_state");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("host_changed");
      socket.off("room_error");
      socket.off("play");
      socket.off("pause");
      socket.off("seek");
      socket.off("sync_response");
      socket.off("user_buffering");
      socket.off("user_buffering_done");
    };
  }, [roomCode, roomData, user, socket, joinOrCreateRoom, addSystemMessage]);

  // ─── EMIT PLAY ───
  // Called by the video player when host presses play
  const emitPlay = useCallback(
    (currentTime) => {
      if (!isHost) return;
      socket.emit("play", { roomCode, currentTime });
    },
    [isHost, roomCode, socket],
  );

  // ─── EMIT PAUSE ───
  const emitPause = useCallback(
    (currentTime) => {
      if (!isHost) return;
      socket.emit("pause", { roomCode, currentTime });
    },
    [isHost, roomCode, socket],
  );

  // ─── EMIT SEEK ───
  const emitSeek = useCallback(
    (currentTime) => {
      if (!isHost) return;
      socket.emit("seek", { roomCode, currentTime });
    },
    [isHost, roomCode, socket],
  );

  // ─── EMIT CHAT MESSAGE ───
  const emitChatMessage = useCallback(
    (message) => {
      if (!message.trim()) return;
      socket.emit("chat_message", { roomCode, message });
    },
    [roomCode, socket],
  );

  // ─── EMIT BUFFERING ───
  const emitBuffering = useCallback(() => {
    socket.emit("buffering", { roomCode });
  }, [roomCode, socket]);

  // ─── EMIT BUFFERING DONE ───
  const emitBufferingDone = useCallback(() => {
    socket.emit("buffering_done", { roomCode });
  }, [roomCode, socket]);

  // ─── REQUEST SYNC ───
  // Called when a new user joins to get the current timestamp
  const requestSync = useCallback(() => {
    socket.emit("sync_request", { roomCode });
  }, [roomCode, socket]);

  // ─── LEAVE ROOM ───
  const leaveRoom = useCallback(() => {
    socket.emit("leave_room", { roomCode });
    hasJoined.current = false;
  }, [roomCode, socket]);

  return {
    // State
    members,
    hostId,
    isHost,
    isConnected,
    roomJoined,
    messages,
    syncEvent,
    bufferingUsers,

    // Actions
    emitPlay,
    emitPause,
    emitSeek,
    emitChatMessage,
    emitBuffering,
    emitBufferingDone,
    requestSync,
    leaveRoom,
  };
}
