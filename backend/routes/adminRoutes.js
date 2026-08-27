const {
  getCloudinarySignature,
  saveMovie,
  getDashboardStats,
  uploadMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
  getAllRooms,
  closeRoom,
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middleware/authMiddleware");
const { uploadMovieFiles } = require("../utils/multerConfig");
const express = require("express");
const router = express.Router();

router.get("/cloudinary-signature", protect, adminOnly, getCloudinarySignature);
router.post("/save-movie", protect, adminOnly, saveMovie);
router.get("/dashboard", protect, adminOnly, getDashboardStats);
router.post("/upload", protect, adminOnly, uploadMovieFiles, uploadMovie);
router.get("/movies", protect, adminOnly, getAllMovies);
router.get("/movies/:id", protect, adminOnly, getMovieById);
router.put("/movies/:id", protect, adminOnly, updateMovie);
router.delete("/movies/:id", protect, adminOnly, deleteMovie);
router.get("/rooms", protect, adminOnly, getAllRooms);
// POST /api/admin/rooms/:id/close
router.post("/rooms/:id/close", protect, adminOnly, closeRoom);

module.exports = router;