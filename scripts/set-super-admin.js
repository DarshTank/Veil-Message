const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");

dotenv.config({ path: path.join(__dirname, "../.env") });

function hashForLookup(text) {
  if (!text) return "";
  return crypto
    .createHash("sha256")
    .update(text.toLowerCase().trim())
    .digest("hex");
}

async function setSuperAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in .env");
    process.exit(1);
  }

  const targetEmail = process.argv[2] || process.env.ADMIN_EMAIL;
  if (!targetEmail) {
    console.error("❌ Please provide target admin email: node scripts/set-super-admin.js <email> or set ADMIN_EMAIL in .env");
    process.exit(1);
  }

  const targetUsername = process.env.ADMIN_USERNAME || targetEmail.split("@")[0];
  const emailHash = hashForLookup(targetEmail);

  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB.");

    const db = mongoose.connection.db;

    // 1. Remove legacy default superadmin record if present
    const removeResult = await db.collection("admins").deleteMany({
      $or: [
        { username: "superadmin" },
        { email: "superadmin@veil.com" }
      ]
    });
    if (removeResult.deletedCount > 0) {
      console.log(`Deleted ${removeResult.deletedCount} default superadmin record(s) from 'admins' collection.`);
    }

    // 2. Scan user documents and upgrade matching account
    const allUsers = await db.collection("users").find({}).toArray();
    let updatedCount = 0;
    for (const u of allUsers) {
      let userEmail = "";
      if (u.email) {
        if (u.email.includes(":")) {
          try {
            const [ivHex, encryptedHex] = u.email.split(":");
            const iv = Buffer.from(ivHex, "hex");
            const encrypted = Buffer.from(encryptedHex, "hex");
            const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
            const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
            userEmail = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
          } catch (e) {
            userEmail = u.email;
          }
        } else {
          userEmail = u.email;
        }
      }
      if (userEmail.toLowerCase().trim() === targetEmail.toLowerCase().trim() || u.emailHash === emailHash) {
        await db.collection("users").updateOne(
          { _id: u._id },
          { $set: { role: "super-admin", emailHash } }
        );
        updatedCount++;
        console.log(`✅ Upgraded user account @_id=${u._id} (username: ${u.username}) to super-admin!`);
      }
    }

    // 3. Upsert into 'admins' collection
    await db.collection("admins").updateOne(
      { email: targetEmail },
      {
        $set: {
          username: targetUsername,
          email: targetEmail,
          role: "super-admin",
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log(`✅ Upserted admin record for ${targetEmail} in 'admins' collection.`);

    console.log(`🎉 SUCCESS: Super admin rights assigned to ${targetEmail}`);
  } catch (error) {
    console.error("❌ Error setting super admin:", error);
  } finally {
    await mongoose.disconnect();
  }
}

setSuperAdmin();
