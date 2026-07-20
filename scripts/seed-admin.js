const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

async function seedAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in .env");
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env to seed an admin account.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB.");

    const db = mongoose.connection.db;
    
    // Check if superadmin already exists
    const existing = await db.collection("admins").findOne({
      $or: [{ username: adminUsername }, { email: adminEmail }]
    });
    if (existing) {
      console.log(`ℹ️ Admin account (${adminEmail}) already exists in 'admins' collection.`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await db.collection("admins").insertOne({
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      role: "super-admin",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("🎉 Super Admin seeded successfully!");
    console.log(`Email: ${adminEmail}`);
    console.log(`Username: ${adminUsername}`);
  } catch (error) {
    console.error("❌ Error seeding Admin:", error);
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();
