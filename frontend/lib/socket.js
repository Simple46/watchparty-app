import { io } from "socket.io-client";

let socket = null;

// Get or create the socket instance
// This does NOT connect automatically anymore —
// connection is controlled by AuthContext based on login state
export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("🔴 Socket connection error:", error.message);
    });
  }

  return socket;
};

// Called on login / app load with an active session
// Attaches the JWT so the backend knows who's connecting
export const connectSocket = (token) => {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) {
    s.connect();
  }
  return s;
};

// Called only on logout — NOT on leaving a room
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};