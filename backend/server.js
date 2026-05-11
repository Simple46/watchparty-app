const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const { db, safeQuery } = require("./utils/db");

// Import routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const movieRoutes = require("./routes/movieRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        origin.includes("localhost") ||
        origin.includes(".vercel.app") ||
        origin === process.env.FRONTEND_URL
      ) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ─── CORS ───
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        origin.includes("localhost") ||
        origin.includes(".vercel.app") ||
        origin === process.env.FRONTEND_URL
      ) {
        return callback(null, true);
      }
      console.error(`CORS blocked: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    optionsSuccessStatus: 200,
  }),
);

// Handle ALL preflight requests immediately
app.options(/.*/, cors());

// ─── MIDDLEWARE ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── BASE ROUTE ───
app.get("/", (req, res) => {
  res.json({
    message: "WatchParty API is running ✅",
    timestamp: new Date().toISOString(),
  });
});

// ─── DATABASE TEST ROUTE ───
// Uses safeQuery so it automatically reconnects if needed
app.get("/test-db", async (req, res) => {
  try {
    const userCount = await safeQuery((db) => db.user.count());
    res.json({
      message: "Database connected successfully ✅",
      totalUsers: userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database test failed:", error.message);
    res.status(500).json({
      message: "Database connection failed ❌",
      error: error.message,
    });
  }
});

// ─── ROUTES ───
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/movies", movieRoutes);

// ─── GLOBAL ERROR HANDLER ───
// Catches any unhandled errors in routes
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({
    message: "Something went wrong. Please try again.",
  });
});

// ─── START SERVER ───
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});

// ─── KEEP RENDER ALIVE ───
// Render free tier spins down after 15 minutes
// We ping ourselves every 14 minutes to prevent this
if (process.env.NODE_ENV === "production") {
  const BACKEND_URL =
    process.env.RENDER_EXTERNAL_URL ||
    "https://watchparty-backend.onrender.com";

  // Initial delay of 1 minute before starting pings
  // Gives the server time to fully boot up first
  setTimeout(() => {
    setInterval(
      async () => {
        try {
          const https = require("https");
          https
            .get(`${BACKEND_URL}/`, (res) => {
              console.log(
                `💓 Keep-alive ping — status: ${res.statusCode} — ${new Date().toISOString()}`,
              );
            })
            .on("error", (err) => {
              console.error("Keep-alive ping failed:", err.message);
            });
        } catch (error) {
          console.error("Keep-alive error:", error.message);
        }
      },
      14 * 60 * 1000,
    ); // every 14 minutes

    console.log("💓 Keep-alive ping scheduled every 14 minutes ✅");
  }, 60 * 1000);
}
