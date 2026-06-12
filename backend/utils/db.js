const { PrismaClient } = require("@prisma/client");

let db;

// This function creates a fresh Prisma instance
// We use a function instead of a direct instantiation
// so we can recreate it when connections drop
function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Log errors in all environments
    // Log queries only in development
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

// Create the initial instance
db = createPrismaClient();

// This function safely runs any database operation
// If it fails due to a connection error it reconnects and retries
// This is the key function that makes everything stable
async function safeQuery(operation) {
  try {
    return await operation(db);
  } catch (error) {
    // These error codes mean the connection was lost
    const isConnectionError =
      error.code === "P1001" || // Can't connect
      error.code === "P1002" || // Connection timed out
      error.code === "P1008" || // Operations timed out
      error.code === "P1017" || // Server closed connection
      error.message.includes("Connection pool timeout") ||
      error.message.includes("prepared statement") ||
      error.message.includes("Connection terminated") ||
      error.message.includes("ECONNRESET") ||
      error.message.includes("ENOTFOUND");

    if (isConnectionError) {
      console.log("🔄 Database connection lost. Reconnecting...");

      try {
        // Disconnect the broken client
        await db.$disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors — connection is already broken
      }

      // Create a completely fresh Prisma client
      db = createPrismaClient();

      // Wait 2 seconds for the connection to establish
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("✅ Reconnected. Retrying operation...");

      // Retry the original operation with the new connection
      return await operation(db);
    }

    // Not a connection error — throw it as normal
    throw error;
  }
}

module.exports = { db, safeQuery };

// const { PrismaClient } = require("@prisma/client");

// const globalForPrisma = global;

// const db =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     datasources: {
//       db: {
//         url: process.env.DATABASE_URL,
//       },
//     },
//     log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
//   });

// // Reuse the client during hot reloads in development
// if (process.env.NODE_ENV !== "production") {
//   globalForPrisma.prisma = db;
// }

// // Simple wrapper for queries
// async function safeQuery(operation) {
//   return operation(db);
// }

// module.exports = { db, safeQuery };
