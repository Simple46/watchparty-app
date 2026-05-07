const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../utils/db");

// ─────────────────────────────────────────
// HELPER — Generate a JWT Token
// ─────────────────────────────────────────
// This function takes a user object and returns
// a signed token string containing their id, email, role
// We keep this as a separate function because both
// register and login need to create a token
const createToken = (user) => {
  return jwt.sign(
    // This is the PAYLOAD — the data stored inside the token
    // Keep it small — just enough to identify the user
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    // This is the SECRET KEY — used to sign and verify the token
    // It lives in your .env file so nobody else knows it
    process.env.JWT_SECRET,
    // Options — token expires in 7 days
    // After 7 days the user has to log in again
    { expiresIn: "7d" },
  );
};

// ─────────────────────────────────────────
// REGISTER
// POST /api/auth/register
// Creates a new user account
// ─────────────────────────────────────────
const register = async (req, res) => {
  try {
    // Step 1 — Destructure the fields from the request body
    // req.body contains whatever the frontend sent
    const { name, email, password } = req.body;

    // Step 2 — Validate that all required fields are present
    // If any field is missing, reject the request immediately
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide your name, email and password",
      });
    }

    // Step 3 — Check if the email is already registered
    // findUnique looks for exactly one record matching the condition
    const existingUser = await db.user.findUnique({
      where: { email: email },
    });

    // If a user with this email already exists, stop here
    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists",
      });
    }

    // Step 4 — Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Step 5 — Hash the password before saving
    // NEVER save plain text passwords to your database
    // If your database ever gets hacked, plain passwords
    // would expose all your users immediately
    // bcrypt.hash(plainTextPassword, saltRounds)
    // saltRounds: 10 is the industry standard — secure but fast enough
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 6 — Create the new user in the database
    const user = await db.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        role: "user", // everyone who registers is a regular user by default
        // admins are only created manually (like we did with the seed)
      },
    });

    // Step 7 — Generate a JWT token for the new user
    // We log them in immediately after registration
    // so they don't have to fill in the login form right after
    const token = createToken(user);

    // Step 8 — Send the response back to the frontend
    // status 201 means "Created" — something new was successfully created
    // Notice we NEVER send the password back — not even the hashed version
    res.status(201).json({
      message: "Account created successfully",
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("Register Error");

    console.error("Register error:", error);
    res.status(500).json({
      message: "Something went wrong. Please try again.",
      ...(process.env.NODE_ENV !== "production" && {
        error: error.message,
      }),
    });
  }
};

// ─────────────────────────────────────────
// LOGIN
// POST /api/auth/login
// Signs in an existing user
// ─────────────────────────────────────────
const login = async (req, res) => {
  try {
    // Step 1 — Get email and password from request body
    const { email, password } = req.body;

    // Step 2 — Validate both fields are present
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide your email and password",
      });
    }

    // Step 3 — Look up the user by email in the database
    const user = await db.user.findUnique({
      where: { email: email },
    });

    // Step 4 — If no user found with that email, reject the login
    // IMPORTANT: We say "Invalid email or password" — NOT "email not found"
    // This is intentional security practice — never reveal which part is wrong
    // Otherwise an attacker can figure out which emails are registered
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Step 5 — Compare the entered password with the stored hashed password
    // bcrypt.compare() handles this — it hashes the entered password
    // the same way and checks if the result matches
    const passwordMatch = await bcrypt.compare(password, user.password);

    // Step 6 — If passwords don't match, reject the login
    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Step 7 — Everything checks out — generate a JWT token
    const token = createToken(user);

    // Step 8 — Send back the token and user info
    // status 200 means "OK" — request was successful
    res.status(200).json({
      message: "Login successful",
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Something went wrong. Please try again.",
      ...(process.env.NODE_ENV !== "production" && {
        error: error.message,
      }),
    });
  }
};

// ─────────────────────────────────────────
// GET ME
// GET /api/auth/me
// Returns the currently logged in user's data
// ─────────────────────────────────────────
// This is used by the frontend on page load to check
// if there is a valid logged in user and get their data
const getMe = async (req, res) => {
  try {
    // req.user is attached by the protect middleware
    // which runs before this function — we will build
    // that middleware in the next step
    const user = await db.user.findUnique({
      where: { id: req.user.userId },
      // select means only return these specific fields
      // we explicitly exclude password this way
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    // If for some reason the user was deleted after
    // their token was issued, handle that edge case
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({ user: user });
  } catch (error) {

    console.error("GetMe error:", error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Export all three functions so the routes file can use them
module.exports = { register, login, getMe };
