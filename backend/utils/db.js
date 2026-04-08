const { PrismaClient } = require("@prisma/client");

// This prevents creating too many database connections
// during development when files reload frequently
const globalForPrisma = global;

const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

module.exports = db;
