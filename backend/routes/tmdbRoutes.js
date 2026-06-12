const express = require("express");
const router = express.Router();
const axios = require("axios");
const { safeQuery } = require("../utils/db");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w1280";

// ─── Helper to get IMDB ID from TMDB ID ───
const getImdbId = async (tmdbId) => {
  try {
    const res = await axios.get(`${TMDB_BASE}/movie/${tmdbId}/external_ids`, {
      params: { api_key: TMDB_KEY },
    });
    return res.data.imdb_id || null;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────
// SEARCH TMDB MOVIES
// GET /api/tmdb/search?q=godfather
// ─────────────────────────────────────────
router.get("/search", protect, adminOnly, async (req, res) => {
  try {
    const { q, page = 1 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters",
      });
    }

    const response = await axios.get(`${TMDB_BASE}/search/movie`, {
      params: {
        api_key: TMDB_KEY,
        query: q.trim(),
        page,
        include_adult: false,
      },
    });

    const results = response.data.results || [];

    // Check which movies are already in our library
    const tmdbIds = results.map((m) => m.id.toString()).filter(Boolean);

    const existingMovies = await safeQuery((db) =>
      db.movie.findMany({
        where: { tmdbId: { in: tmdbIds } },
        select: { tmdbId: true },
      }),
    );

    const existingIds = new Set(existingMovies.map((m) => m.tmdbId));

    const movies = results.map((movie) => ({
      tmdbId: movie.id.toString(),
      title: movie.title,
      description: movie.overview || null,
      thumbnail: movie.poster_path ? `${TMDB_IMAGE}${movie.poster_path}` : null,
      backdropUrl: movie.backdrop_path
        ? `${TMDB_BACKDROP}${movie.backdrop_path}`
        : null,
      releaseYear: movie.release_date ? movie.release_date.split("-")[0] : null,
      rating: movie.vote_average || null,
      alreadyAdded: existingIds.has(movie.id.toString()),
    }));

    res.status(200).json({
      movies,
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    });
  } catch (error) {
    console.error("TMDB search error:", error.message);
    res.status(500).json({
      message: "Failed to search movies",
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────
// GET TRENDING / POPULAR MOVIES
// GET /api/tmdb/popular
// ─────────────────────────────────────────
router.get("/popular", protect, adminOnly, async (req, res) => {
  try {
    const { page = 1 } = req.query;

    const [popularRes, trendingRes] = await Promise.all([
      axios.get(`${TMDB_BASE}/movie/popular`, {
        params: { api_key: TMDB_KEY, page },
      }),
      axios.get(`${TMDB_BASE}/trending/movie/week`, {
        params: { api_key: TMDB_KEY },
      }),
    ]);

    const tmdbIds = [...popularRes.data.results, ...trendingRes.data.results]
      .map((m) => m.id.toString())
      .filter(Boolean);

    const existingMovies = await safeQuery((db) =>
      db.movie.findMany({
        where: { tmdbId: { in: tmdbIds } },
        select: { tmdbId: true },
      }),
    );

    const existingIds = new Set(existingMovies.map((m) => m.tmdbId));

    const normalize = (movie) => ({
      tmdbId: movie.id.toString(),
      title: movie.title,
      description: movie.overview || null,
      thumbnail: movie.poster_path ? `${TMDB_IMAGE}${movie.poster_path}` : null,
      backdropUrl: movie.backdrop_path
        ? `${TMDB_BACKDROP}${movie.backdrop_path}`
        : null,
      releaseYear: movie.release_date ? movie.release_date.split("-")[0] : null,
      rating: movie.vote_average || null,
      alreadyAdded: existingIds.has(movie.id.toString()),
    });

    res.status(200).json({
      popular: popularRes.data.results.map(normalize),
      trending: trendingRes.data.results.map(normalize),
    });
  } catch (error) {
    console.error("TMDB popular error:", error.message);
    res.status(500).json({ message: "Failed to fetch popular movies" });
  }
});

// ─────────────────────────────────────────
// ADD MOVIE FROM TMDB TO LIBRARY
// POST /api/tmdb/add
// Admin adds a movie to the WatchParty library
// ─────────────────────────────────────────
router.post("/add", protect, adminOnly, async (req, res) => {
  try {
    const { tmdbId } = req.body;

    if (!tmdbId) {
      return res.status(400).json({ message: "tmdbId required" });
    }

    // Check not already added
    const existing = await safeQuery((db) =>
      db.movie.findFirst({ where: { tmdbId: tmdbId.toString() } }),
    );

    if (existing) {
      return res.status(400).json({
        message: "This movie is already in your library",
        movie: existing,
      });
    }

    // Fetch full movie details from TMDB
    const [detailsRes, imdbId] = await Promise.all([
      axios.get(`${TMDB_BASE}/movie/${tmdbId}`, {
        params: {
          api_key: TMDB_KEY,
          append_to_response: "genres",
        },
      }),
      getImdbId(tmdbId),
    ]);

    const details = detailsRes.data;

    if (!imdbId) {
      return res.status(400).json({
        message:
          "Could not find IMDB ID for this movie. VidSrc requires an IMDB ID.",
      });
    }

    // Build the VidSrc embed URL
    const videoUrl = `https://vidsrc.to/embed/movie/${imdbId}`;

    const genres = details.genres
      ? details.genres.map((g) => g.name).join(", ")
      : null;

    const movie = await safeQuery((db) =>
      db.movie.create({
        data: {
          title: details.title,
          description: details.overview || null,
          videoUrl,
          thumbnail: details.poster_path
            ? `${TMDB_IMAGE}${details.poster_path}`
            : null,
          backdropUrl: details.backdrop_path
            ? `${TMDB_BACKDROP}${details.backdrop_path}`
            : null,
          cloudinaryId: `tmdb_${tmdbId}`,
          tmdbId: tmdbId.toString(),
          imdbId,
          releaseYear: details.release_date
            ? details.release_date.split("-")[0]
            : null,
          rating: details.vote_average || null,
          genres,
          duration: details.runtime || null,
          source: "tmdb",
        },
      }),
    );

    console.log(`✅ Added from TMDB: "${movie.title}" (${imdbId})`);

    res.status(201).json({
      message: `"${movie.title}" added to your library`,
      movie,
    });
  } catch (error) {
    console.error("Add TMDB movie error:", error.message);
    res.status(500).json({
      message: "Failed to add movie: " + error.message,
    });
  }
});




module.exports = router;
