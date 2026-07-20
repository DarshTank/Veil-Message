/**
 * seed-admin.ts
 * Run once to promote an existing user to admin by username.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/seed-admin.ts <username>
 *
 * Example:
 *   npx ts-node --project tsconfig.json scripts/seed-admin.ts darsh
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function seedAdmin() {
  const username = process.argv[2];

  if (!username) {
    console.error("❌ Usage: npx ts-node scripts/seed-admin.ts <username>");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    const result = await mongoose.connection.db
      ?.collection("users")
      .updateOne({ username }, { $set: { role: "admin", status: "active" } });

    if (!result || result.matchedCount === 0) {
      console.error(`❌ No user found with username: "${username}"`);
      console.log("Make sure the user has signed up and verified their account first.");
    } else if (result.modifiedCount === 0) {
      console.log(`ℹ️  User @${username} is already an admin.`);
    } else {
      console.log(`✅ User @${username} has been promoted to admin successfully!`);
    }
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();
