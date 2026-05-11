"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket, disconnectSocket } from "../lib/socket";

// Custom hook that manages a socket connection
// Returns the socket instance and a connected state
export default function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Get or create the socket instance
    const socket = getSocket();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socket);

    // Connect the socket
    if (!socket.connected) {
      socket.connect();
    }

    // Track connection state
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Set initial connection state
    setIsConnected(socket.connected);

    // Cleanup when component unmounts
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return {
    socket,
    isConnected,
  };
}
