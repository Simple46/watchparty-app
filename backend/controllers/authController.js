const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db, safeQuery } = require("../utils/db"); // ← update this import

const createToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email and password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // ← Use safeQuery for every database operation
    const existingUser = await safeQuery((db) =>
      db.user.findUnique({ where: { email } }),
    );

    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await safeQuery((db) =>
      db.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "user",
        },
      }),
    );

    const token = createToken(user);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error.code === "P2002") {
      return res.status(400).json({
        message: "An account with this email already exists",
      });
    }
    res.status(500).json({
      message: "Something went wrong. Please try again.",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    // ← safeQuery handles reconnection automatically
    const user = await safeQuery((db) =>
      db.user.findUnique({ where: { email } }),
    );

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = createToken(user);

    res.status(200).json({
      message: "Login successful",
      token,
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
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await safeQuery((db) =>
      db.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      }),
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = { register, login, getMe };
