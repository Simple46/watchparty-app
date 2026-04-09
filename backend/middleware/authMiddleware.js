const jwt = require("jsonwebtoken");

// ─────────────────────────────────────────
// PROTECT MIDDLEWARE
// Use on any route that requires the user to be logged in
// ─────────────────────────────────────────
const protect = (req, res, next) => {
  // next is a function — calling next() means
  // "I am done, move on to the actual route handler"
  // If we don't call next(), the request just hangs forever

  try {
    // Step 1 — Look for the Authorization header in the request
    // The frontend sends it like this:
    // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    const authHeader = req.headers.authorization;

    // Step 2 — If there is no header or it does not start with "Bearer "
    // then no token was provided — reject the request
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. No token provided.",
      });
    }

    // Step 3 — Extract just the token part
    // authHeader = "Bearer eyJhbGci..."
    // Split by space gives ["Bearer", "eyJhbGci..."]
    // We want index [1] — the actual token
    const token = authHeader.split(" ")[1];

    // Step 4 — Verify the token is valid and has not expired
    // jwt.verify() does two things:
    // 1. Checks the signature using your JWT_SECRET
    // 2. Checks the expiry date
    // If either check fails, it throws an error which our catch handles
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 5 — Attach the decoded user info to the request object
    // decoded contains: { userId, email, role, iat, exp }
    // By attaching it to req.user, every route handler after
    // this middleware can access req.user.userId, req.user.role etc
    req.user = decoded;

    // Step 6 — All checks passed, move on to the route handler
    next();
  } catch (error) {
    // jwt.verify throws an error if:
    // - The token signature is invalid (tampered with)
    // - The token has expired
    // Both cases mean the user needs to log in again
    return res.status(401).json({
      message: "Not authorized. Invalid or expired token.",
    });
  }
};

// ─────────────────────────────────────────
// ADMIN ONLY MIDDLEWARE
// Use AFTER protect on routes only admins can access
// ─────────────────────────────────────────
const adminOnly = (req, res, next) => {
  // By the time this middleware runs, protect() has already run
  // So req.user is guaranteed to exist and be verified
  // We just need to check if their role is "admin"

  if (req.user.role !== "admin") {
    // User is logged in but is not an admin
    // status 403 means "Forbidden" — you are authenticated but not authorized
    return res.status(403).json({
      message: "Access denied. Admins only.",
    });
  }

  // User is an admin — let them through
  next();
};

// You use these together on admin routes like this:
// router.delete("/movies/:id", protect, adminOnly, deleteMovie)
// First protect checks if logged in
// Then adminOnly checks if admin
// Then deleteMovie actually runs

module.exports = { protect, adminOnly };
