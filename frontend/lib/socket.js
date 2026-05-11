import { io } from "socket.io-client";

// We store the socket instance outside of React
// so it persists across component renders and
// is never recreated unless we explicitly disconnect
let socket = null;

export const getSocket = () => {
  // Only create the socket if one doesn't exist yet
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL, {
      // Don't connect automatically on page load
      // We connect manually when the user enters a room
      autoConnect: false,

      // Try WebSocket first, fall back to HTTP polling
      // if WebSocket is not available (some corporate networks
      // block WebSockets)
      transports: ["websocket", "polling"],

      // Automatically try to reconnect if connection drops
      reconnection: true,

      // Wait 1 second between reconnection attempts
      reconnectionDelay: 1000,

      // Maximum wait between reconnections is 5 seconds
      reconnectionDelayMax: 5000,

      // Try to reconnect up to 5 times before giving up
      reconnectionAttempts: 5,

      // 20 second connection timeout
      timeout: 20000,
    });

    // Log connection events for debugging
    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("🔴 Socket connection error:", error.message);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempt(s)`);
    });
  }

  return socket;
};

// Call this when the user leaves the room
// to properly clean up the connection
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
