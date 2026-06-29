"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";

export default function useRoom(roomCode, roomData) {
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomJoined, setRoomJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [syncEvent, setSyncEvent] = useState(null);
  const [bufferingUsers, setBufferingUsers] = useState([]);

  const hasJoined = useRef(false);
  const roomCodeRef = useRef(roomCode);
  const userRef = useRef(user);
  const roomDataRef = useRef(roomData);

  // Keep refs up to date
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);

  const isHost = user?.id === hostId;

  const addSystemMessage = useCallback((text) => {
    setMessages((prev) => [
      ...prev,
      {
        isSystem: true,
        message: text,
        timestamp: Date.now(),
        id: `sys_${Date.now()}_${Math.random()}`,
      },
    ]);
  }, []);

  const joinOrCreateRoom = useCallback(() => {
    const socket = getSocket();
    const currentUser = userRef.current;
    const currentRoomData = roomDataRef.current;
    const currentRoomCode = roomCodeRef.current;

    if (!socket?.connected || !currentUser || !currentRoomData) {
      return;
    }

    const amIHost = currentUser.id === currentRoomData.hostId;

    if (amIHost) {
      socket.emit("create_room", {
        roomCode: currentRoomCode,
        movieId: currentRoomData.movie.id,
        hostId: currentUser.id,
        user: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar || null,
        },
      });
    } else {
      socket.emit("join_room", {
        roomCode: currentRoomCode,
        user: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar || null,
        },
      });
    }
  }, []);

  useEffect(() => {
    if (!roomCode || !user || !roomData) return;

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    // ─── CONNECTION ───
    const onConnect = () => {
      setIsConnected(true);
      if (!hasJoined.current) {
        hasJoined.current = true;
        // Small delay to ensure socket is fully ready
        setTimeout(joinOrCreateRoom, 100);
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
      hasJoined.current = false;
    };

    // ─── ROOM EVENTS ───
    const onRoomCreated = ({ members: m }) => {
      setMembers(m);
      setHostId(roomData.hostId);
      setRoomJoined(true);
      addSystemMessage(
        "Watch party started! Share the room code with friends.",
      );
    };

    const onRoomState = ({
      isPlaying,
      currentTime,
      hostId: hId,
      members: m,
    }) => {
      setMembers(m);
      setHostId(hId);
      setRoomJoined(true);
      setSyncEvent({
        type: isPlaying ? "play" : "pause",
        currentTime,
        serverTimestamp: Date.now(),
      });
    };

    const onUserJoined = ({ user: joinedUser, members: m }) => {
      setMembers(m);
      if (joinedUser.id !== user.id) {
        addSystemMessage(`${joinedUser.name} joined the room`);
      }
    };

    const onUserLeft = ({ name, members: m }) => {
      setMembers(m);
      addSystemMessage(`${name} left the room`);
    };

    const onHostChanged = ({ newHostId, newHostName, members: m }) => {
      setHostId(newHostId);
      setMembers(m);
      if (newHostId === user.id) {
        addSystemMessage("You are now the host — you control playback");
      } else {
        addSystemMessage(`${newHostName} is now the host`);
      }
    };

    const onRoomError = ({ message: msg }) => {
      console.error("Room error:", msg);
      addSystemMessage(`Error: ${msg}`);
    };

    // ─── SYNC EVENTS ───
    const onPlay = ({ currentTime, serverTimestamp }) => {
      setSyncEvent({ type: "play", currentTime, serverTimestamp });
    };

    const onPause = ({ currentTime }) => {
      setSyncEvent({
        type: "pause",
        currentTime,
        serverTimestamp: Date.now(),
      });
    };

    const onSeek = ({ currentTime, serverTimestamp }) => {
      setSyncEvent({ type: "seek", currentTime, serverTimestamp });
    };

    const onSyncResponse = ({ isPlaying, currentTime, serverTimestamp }) => {
      setSyncEvent({
        type: isPlaying ? "play" : "pause",
        currentTime,
        serverTimestamp,
      });
    };

    // ─── BUFFERING ───
    const onUserBuffering = ({ userId, name }) => {
      setBufferingUsers((prev) => {
        if (prev.find((u) => u.userId === userId)) return prev;
        return [...prev, { userId, name }];
      });
    };

    const onUserBufferingDone = ({ userId }) => {
      setBufferingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    // ─── CHAT ───
    const onChatMessage = (messageData) => {
      setMessages((prev) => [
        ...prev,
        {
          ...messageData,
          // isMine is true if this socket sent it
          isMine: messageData.socketId === socket.id,
          isSystem: false,
        },
      ]);
    };

    // Register all listeners
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_created", onRoomCreated);
    socket.on("room_state", onRoomState);
    socket.on("user_joined", onUserJoined);
    socket.on("user_left", onUserLeft);
    socket.on("host_changed", onHostChanged);
    socket.on("room_error", onRoomError);
    socket.on("play", onPlay);
    socket.on("pause", onPause);
    socket.on("seek", onSeek);
    socket.on("sync_response", onSyncResponse);
    socket.on("user_buffering", onUserBuffering);
    socket.on("user_buffering_done", onUserBufferingDone);
    socket.on("chat_message", onChatMessage);

    // If socket is already connected join immediately
    if (socket.connected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsConnected(true);
      if (!hasJoined.current) {
        hasJoined.current = true;
        setTimeout(joinOrCreateRoom, 100);
      }
    }

    // Find the return cleanup function in useRoom.js
    // Inside the big useEffect that registers socket listeners
    // Update the return statement to this:

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_created", onRoomCreated);
      socket.off("room_state", onRoomState);
      socket.off("user_joined", onUserJoined);
      socket.off("user_left", onUserLeft);
      socket.off("host_changed", onHostChanged);
      socket.off("room_error", onRoomError);
      socket.off("play", onPlay);
      socket.off("pause", onPause);
      socket.off("seek", onSeek);
      socket.off("sync_response", onSyncResponse);
      socket.off("user_buffering", onUserBuffering);
      socket.off("user_buffering_done", onUserBufferingDone);
      socket.off("chat_message", onChatMessage);

      // Reset hasJoined on cleanup so Strict Mode second
      // mount can join properly
      hasJoined.current = false;
    };
  }, [roomCode, user?.id, roomData?.hostId]);

  // ─── ACTIONS ───
  // All actions use getSocket() to always get the current socket
  const emitPlay = useCallback(
    (currentTime) => {
      if (!isHost) return;
      getSocket()?.emit("play", {
        roomCode: roomCodeRef.current,
        currentTime,
      });
    },
    [isHost],
  );

  const emitPause = useCallback(
    (currentTime) => {
      if (!isHost) return;
      getSocket()?.emit("pause", {
        roomCode: roomCodeRef.current,
        currentTime,
      });
    },
    [isHost],
  );

  const emitSeek = useCallback(
    (currentTime) => {
      if (!isHost) return;
      getSocket()?.emit("seek", {
        roomCode: roomCodeRef.current,
        currentTime,
      });
    },
    [isHost],
  );

  const emitChatMessage = useCallback((message) => {
    if (!message?.trim()) return;
    const socket = getSocket();
    if (!socket?.connected) {
      console.warn("Socket not connected — cannot send message");
      return;
    }
    socket.emit("chat_message", {
      roomCode: roomCodeRef.current,
      message: message.trim(),
    });
  }, []);

  const emitBuffering = useCallback(() => {
    getSocket()?.emit("buffering", {
      roomCode: roomCodeRef.current,
    });
  }, []);

  const emitBufferingDone = useCallback(() => {
    getSocket()?.emit("buffering_done", {
      roomCode: roomCodeRef.current,
    });
  }, []);

  const requestSync = useCallback(() => {
    getSocket()?.emit("sync_request", {
      roomCode: roomCodeRef.current,
    });
  }, []);

 const leaveRoom = useCallback(() => {
  getSocket()?.emit("leave_room", {
    roomCode: roomCodeRef.current,
  });
  hasJoined.current = false;
  // Do NOT disconnect the socket here — it stays alive
  // for presence and chat even after leaving the room
}, []);

  return {
    members,
    hostId,
    isHost,
    isConnected,
    roomJoined,
    messages,
    syncEvent,
    bufferingUsers,
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
