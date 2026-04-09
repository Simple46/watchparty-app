const express = require("express");
const router = express.Router();

// Import the controller functions
const { register, login, getMe } = require("../controllers/authController");

// Import the middleware
const { protect } = require("../middleware/authMiddleware");

// ─────────────────────────────────────────
// PUBLIC ROUTES
// These do not require a token
// Anyone can hit these endpoints
// ─────────────────────────────────────────

// POST /api/auth/register
// Called when someone fills in the registration form
router.post("/register", register);

// POST /api/auth/login
// Called when someone fills in the login form
router.post("/login", login);

// ─────────────────────────────────────────
// PROTECTED ROUTES
// These require a valid JWT token
// ─────────────────────────────────────────

// GET /api/auth/me
// Called by the frontend on app load to get the current user
// protect runs first — if no valid token, request is rejected
// If token is valid, getMe runs and returns the user data
router.get("/me", protect, getMe);

module.exports = router;
