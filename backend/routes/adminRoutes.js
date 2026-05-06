const express = require("express");
const router = express.Router();

// Import all the controller functions
const {
  getDashboardStats,
  uploadMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
  getAllRooms,
} = require("../controllers/adminController");

// Import the two middleware functions
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Import multer config for handling file uploads
// This must run before uploadMovie so that req.files is populated
const { uploadMovieFiles } = require("../utils/multerConfig");

// ─────────────────────────────────────────
// EVERY ROUTE BELOW HAS TWO GUARDS:
//
// protect   → checks a valid JWT token exists
//             rejects with 401 if not logged in
//
// adminOnly → checks the user role is "admin"
//             rejects with 403 if logged in but not admin
//
// Only after both pass does the controller function run
// ─────────────────────────────────────────

// GET /api/admin/dashboard
// Returns stats for the dashboard page
router.get("/dashboard", protect, adminOnly, getDashboardStats);

// POST /api/admin/upload
// Uploads a new movie
// uploadMovieFiles runs as middleware BEFORE uploadMovie
// It processes the multipart form data and puts files into req.files
// Without it, req.files would be undefined in the controller
router.post("/upload", protect, adminOnly, uploadMovieFiles, uploadMovie);

// GET /api/admin/movies
// Returns all movies
router.get("/movies", protect, adminOnly, getAllMovies);

// GET /api/admin/movies/:id
// Returns one specific movie
router.get("/movies/:id", protect, adminOnly, getMovieById);

// PUT /api/admin/movies/:id
// Updates a movie's title or description
router.put("/movies/:id", protect, adminOnly, updateMovie);

// DELETE /api/admin/movies/:id
// Deletes a movie from Cloudinary and the database
router.delete("/movies/:id", protect, adminOnly, deleteMovie);

// GET /api/admin/rooms
// Returns all watch party rooms
router.get("/rooms", protect, adminOnly, getAllRooms);

module.exports = router;
