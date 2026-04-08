const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const db = require("./utils/db"); // ← add this line

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ message: "WatchParty API is running ✅" });
});

// ← Add this test route
app.get("/test-db", async (req, res) => {
  try {
    // Try to count users in the database
    const userCount = await db.user.count();
    res.json({
      message: "Database connected successfully ✅",
      totalUsers: userCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed ❌",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
