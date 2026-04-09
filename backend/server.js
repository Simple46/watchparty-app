const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const db = require("./utils/db");

// Import your auth routes
const authRoutes = require("./routes/authRoutes");

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Set up Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// ─── GLOBAL MIDDLEWARE ───
// These run on every single incoming request

// CORS — allows your frontend domain to talk to this backend
// credentials: true — allows cookies to be sent cross-origin
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Parses incoming JSON request bodies
// Without this, req.body would be undefined
app.use(express.json());

// Parses URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// Parses cookies attached to requests
app.use(cookieParser());

// ─── ROUTES ───

// Base route — just confirms the server is running
app.get("/", (req, res) => {
  res.json({ message: "WatchParty API is running ✅" });
});

// Database test route
app.get("/test-db", async (req, res) => {
  try {
    const userCount = await db.user.count();
    res.json({
      message: "Database connected successfully ✅",
      totalUser: userCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed ❌",
      error: error.message,
    });
  }
});

// Auth routes
// All routes defined in authRoutes.js will be prefixed with /api/auth
// So /register becomes /api/auth/register
// So /login becomes /api/auth/login
// So /me becomes /api/auth/me
app.use("/api/auth", authRoutes);

// We will add more route groups here in later sections
// app.use("/api/admin", adminRoutes);
// app.use("/api/movies", movieRoutes);
// app.use("/api/rooms", roomRoutes);

// ─── START SERVER ───
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});