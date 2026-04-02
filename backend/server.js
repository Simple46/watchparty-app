const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

// Load environment variables from .env file
dotenv.config();

const app = express();
const server = http.createServer(app);

// Set up Socket.io on the same server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route - just to confirm server is working
app.get("/", (req, res) => {
  res.json({ message: "WatchParty API is running ✅" });
});

// We will import and use routes here in later sections
// app.use("/api/auth", authRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api/movies", movieRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
