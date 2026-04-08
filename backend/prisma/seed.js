const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Hash the admin password before saving
  // Never save plain text passwords in a database
  const hashedPassword = await bcrypt.hash("admin123", 10);
  // The "10" is the salt rounds - higher = more secure but slower
  // 10 is the standard safe value

  // Create the admin user
  // upsert means: create if doesn't exist, update if it does
  // This way running the seed twice won't create duplicate admins
  const admin = await db.user.upsert({
    where: { email: "admin@watchparty.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@watchparty.com",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Admin user created ✅");
  console.log("Email:", admin.email);
  console.log("Password: admin123");
  console.log("⚠️  Change this password after first login!");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
