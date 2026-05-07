const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const db = require("./utils/db");

// Import routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes"); // ← add this line

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  // Add your actual Vercel URL here
  "https://watchparty-app-omega.vercel.app/",
  // Also allow any Vercel preview URLs
  /https:\/\/.*\.vercel\.app$/,
];


app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin
      // This covers Postman, mobile apps, and server-to-server calls
      if (!origin) return callback(null, true);

      // Check if the origin is in our allowed list
      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") {
          return allowed === origin;
        }
        // For regex patterns like our Vercel preview URL pattern
        return allowed.test(origin);
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.error(`CORS blocked: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
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
  }),
);

// Handle preflight requests explicitly
// This catches OPTIONS requests before they hit your routes
app.options("*", cors());

// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:3000",
//     credentials: true,
//   }),
// );
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Base route
app.get("/", (req, res) => {
  res.json({ message: "WatchParty API is running ✅" });
});

// Database test route
app.get("/test-db", async (req, res) => {
  try {
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

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes); // ← add this line

// More routes coming in later sections
// app.use("/api/movies", movieRoutes);
// app.use("/api/rooms", roomRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
