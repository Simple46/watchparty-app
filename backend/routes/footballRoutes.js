const express = require("express");
const router = express.Router();
const axios = require("axios");
const { protect } = require("../middleware/authMiddleware");
const { safeQuery } = require("../utils/db");

const BASE_URL = "https://football-live-stream-api.p.rapidapi.com";

const getHeaders = () => ({
  "x-rapidapi-key": process.env.RAPIDAPI_KEY,
  "x-rapidapi-host":
    process.env.RAPIDAPI_HOST || "football-live-stream-api.p.rapidapi.com",
  "Content-Type": "application/json",
});

// ─────────────────────────────────────────
// SLUG BUILDER
// Constructs the slug needed for the /link endpoint
// Format: truc-tiep-tran-dau-{home}-vs-{away}-{id}
// ─────────────────────────────────────────
const buildMatchSlug = (homeName, awayName, matchId) => {
  const slugify = (str) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const homeSlug = slugify(homeName);
  const awaySlug = slugify(awayName);

  return `truc-tiep-tran-dau-${homeSlug}-vs-${awaySlug}-${matchId}`;
};

// ─────────────────────────────────────────
// GET ALL MATCHES (LIVE + UPCOMING)
// GET /api/football/all
// ─────────────────────────────────────────
router.get("/all", protect, async (req, res) => {
  try {
    console.log("⚽ Fetching all matches...");

    const response = await axios.get(`${BASE_URL}/all-match`, {
      headers: getHeaders(),
      timeout: 15000,
    });

    // API returns array directly or wrapped in result/data
    let rawMatches = [];
    const data = response.data;

    if (Array.isArray(data)) {
      rawMatches = data;
    } else if (data?.result) {
      rawMatches = Array.isArray(data.result)
        ? data.result
        : Object.values(data.result);
    } else if (data?.data) {
      rawMatches = Array.isArray(data.data)
        ? data.data
        : Object.values(data.data);
    } else {
      // Try converting object with numeric keys to array
      rawMatches = Object.values(data).filter(
        (v) => typeof v === "object" && v !== null && v.id,
      );
    }

    // Normalize each match
    const normalize = (match) => ({
      id: match.id,
      homeTeam: match.home_name || "Home",
      awayTeam: match.away_name || "Away",
      homeTeamLogo: match.home_flag || null,
      awayTeamLogo: match.away_flag || null,
      homeScore: match.score?.split(" - ")[0]?.trim() || "0",
      awayScore: match.score?.split(" - ")[1]?.trim() || "0",
      score: match.score || "0 - 0",
      league: match.league || "Football",
      status: match.status || "Upcoming",
      isLive: match.status === "Live",
      date: match.date || null,
      time: match.time || null,
      kickoff: match.kickoff || null,
      currentMinutes: match.currentMinutes || null,
      // Pre-build the slug so frontend doesn't need to
      slug: buildMatchSlug(
        match.home_name || "",
        match.away_name || "",
        match.id,
      ),
    });

    const allMatches = rawMatches.map(normalize);
    const liveMatches = allMatches.filter((m) => m.isLive);
    const upcomingMatches = allMatches.filter((m) => !m.isLive);

    console.log(
      `✅ ${liveMatches.length} live, ${upcomingMatches.length} upcoming`,
    );

    res.status(200).json({
      live: liveMatches,
      upcoming: upcomingMatches,
      total: allMatches.length,
    });
  } catch (error) {
    console.error("All matches error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Failed to fetch matches",
      error: error.response?.data || error.message,
    });
  }
});

// ─────────────────────────────────────────
// GET STREAM URL FOR A MATCH
// GET /api/football/stream-url/:matchId
// Calls /link/{slug} and returns the m3u8 URL
// ─────────────────────────────────────────
router.get("/stream-url/:matchId", protect, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { home, away } = req.query;

    if (!home || !away) {
      return res.status(400).json({
        message: "home and away query params required",
      });
    }

    const slug = buildMatchSlug(home, away, matchId);
    console.log(`🔗 Getting stream for slug: ${slug}`);

    const response = await axios.get(`${BASE_URL}/link/${slug}`, {
      headers: getHeaders(),
      timeout: 15000,
    });

    console.log(
      "Stream response:",
      JSON.stringify(response.data).substring(0, 300),
    );

    const data = response.data;

    // Extract m3u8 URL from response
    // Try multiple possible field names
    let streamUrl =
      data?.link ||
      data?.url ||
      data?.stream ||
      data?.m3u8 ||
      data?.hls ||
      data?.source ||
      null;

    // If response is an array of streams, take first one
    if (!streamUrl && Array.isArray(data)) {
      streamUrl = data[0]?.link || data[0]?.url || null;
    }

    // If response has streams/links array
    if (!streamUrl && data?.streams) {
      streamUrl = data.streams[0]?.url || data.streams[0]?.link || null;
    }

    if (!streamUrl && data?.links) {
      streamUrl = data.links[0]?.url || data.links[0]?.link || null;
    }

    if (!streamUrl) {
      console.error("Could not extract stream URL from:", data);
      return res.status(404).json({
        message: "No stream URL found for this match",
        rawResponse: data,
      });
    }

    console.log(`✅ Stream URL found: ${streamUrl.substring(0, 80)}...`);

    res.status(200).json({
      streamUrl,
      slug,
      matchId,
    });
  } catch (error) {
    console.error("Stream URL error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Failed to get stream URL",
      error: error.response?.data || error.message,
    });
  }
});

// ─────────────────────────────────────────
// PROXY THE ACTUAL M3U8 STREAM
// GET /api/football/proxy?url=...
// Required because m3u8 streams block direct
// browser requests without proper headers
// ─────────────────────────────────────────
router.get("/proxy", protect, async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ message: "url param required" });
    }

    const decodedUrl = decodeURIComponent(url);
    console.log(`📡 Proxying: ${decodedUrl.substring(0, 80)}...`);

    const streamResponse = await axios.get(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://google.com",
        Origin: "https://google.com",
      },
      responseType: "stream",
      timeout: 30000,
    });

    const contentType =
      streamResponse.headers["content-type"] || "application/vnd.apple.mpegurl";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");

    streamResponse.data.pipe(res);

    streamResponse.data.on("error", (err) => {
      console.error("Stream pipe error:", err.message);
      if (!res.headersSent) res.status(500).end();
    });

    req.on("close", () => streamResponse.data.destroy());
  } catch (error) {
    console.error("Proxy error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Stream proxy failed" });
    }
  }
});

// ─────────────────────────────────────────
// CREATE WATCH PARTY ROOM FOR A MATCH
// POST /api/football/create-room
// ─────────────────────────────────────────
router.post("/create-room", protect, async (req, res) => {
  try {
    const { matchId, homeTeam, awayTeam, league, score, streamUrl, thumbnail } =
      req.body;

    if (!matchId || !homeTeam || !awayTeam) {
      return res.status(400).json({
        message: "matchId, homeTeam and awayTeam are required",
      });
    }

    const title = `${homeTeam} vs ${awayTeam}`;

    // Check if an active room already exists for this match
    const existing = await safeQuery((db) =>
      db.movie.findFirst({
        where: {
          cloudinaryId: `match_${matchId}`,
          rooms: { some: { isActive: true } },
        },
        include: {
          rooms: {
            where: { isActive: true },
            take: 1,
          },
        },
      }),
    );

    if (existing?.rooms?.[0]) {
      return res.status(200).json({
        message: "Room already exists for this match",
        roomCode: existing.rooms[0].roomCode,
      });
    }

    // Build proxied stream URL through our backend
    const backendUrl =
      process.env.NODE_ENV === "production"
        ? process.env.RENDER_EXTERNAL_URL
        : `http://localhost:${process.env.PORT || 5000}`;

    const proxiedStreamUrl = streamUrl
      ? `${backendUrl}/api/football/proxy?url=${encodeURIComponent(streamUrl)}`
      : "";

    const movie = await safeQuery((db) =>
      db.movie.create({
        data: {
          title,
          description: `LIVE · ${league} · ${score}`,
          videoUrl: proxiedStreamUrl,
          thumbnail: thumbnail || null,
          cloudinaryId: `match_${matchId}`,
          size: null,
          duration: null,
        },
      }),
    );

    // Generate unique room code
    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let roomCode;
    let isUnique = false;
    while (!isUnique) {
      roomCode = generateCode();
      const exists = await safeQuery((db) =>
        db.room.findUnique({ where: { roomCode } }),
      );
      if (!exists) isUnique = true;
    }

    const room = await safeQuery((db) =>
      db.room.create({
        data: {
          roomCode,
          movieId: movie.id,
          hostId: req.user.userId,
          isActive: true,
        },
      }),
    );

    await safeQuery((db) =>
      db.roomMember.create({
        data: {
          roomId: room.id,
          userId: req.user.userId,
        },
      }),
    );

    console.log(`⚽ Room created: ${roomCode} — ${title}`);

    res.status(201).json({
      message: "Room created",
      roomCode: room.roomCode,
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({
      message: "Failed to create room: " + error.message,
    });
  }
});

module.exports = router;
