const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;
const ALGO = "aes-256-cbc";

/**
 * Validates that the encryption key is present and correct length.
 */
function getKeyBuffer() {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes) in .env");
  }
  return Buffer.from(ENCRYPTION_KEY, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-CBC.
 */
function encrypt(text) {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, getKeyBuffer(), iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (err) {
    console.error("Encryption failed:", err);
    throw err;
  }
}

/**
 * Creates a SHA-256 hash of a string for use as a DB lookup key.
 */
function hashForLookup(text) {
  if (!text) return "";
  return crypto
    .createHash("sha256")
    .update(text.toLowerCase().trim())
    .digest("hex");
}

const USERS_DATA = [
  {
    username: "aarav_sharma",
    email: "aarav.sharma@example.in",
    bio: "Software engineer from Bengaluru, lover of chai and cricket. Let's connect!",
    country: "India",
    messages: [
      {
        content: "Hey Aarav, loved your latest blog post on system design!",
        mood: "curious"
      },
      {
        content: "Are you going to the tech meetup next weekend?",
        mood: "curious"
      },
      {
        content: "Spill the tea, who is your crush in the office?",
        mood: "confession"
      }
    ]
  },
  {
    username: "yuki_tanaka",
    email: "yuki.tanaka@example.jp",
    bio: "Digital artist based in Tokyo. Inspired by cyberpunk aesthetics and sushi. Send me some anonymous thoughts!",
    country: "Japan",
    messages: [
      {
        content: "Your artwork has such a cool vibe! What brushes do you use?",
        mood: "advice"
      },
      {
        content: "Have you ever thought about making an indie game?",
        mood: "curious"
      },
      {
        content: "I've been secretly following your art for two years now, you are my inspiration.",
        mood: "confession"
      }
    ]
  },
  {
    username: "clara_dupont",
    email: "clara.dupont@example.fr",
    bio: "Pastry chef from Paris. Tell me your deepest secrets, or just your favorite croissant recipe!",
    country: "France",
    messages: [
      {
        content: "Is it true that real croissants only use dry butter?",
        mood: "curious"
      },
      {
        content: "Your baking tutorials make me so hungry!",
        mood: "wit"
      },
      {
        content: "Can you give me advice on how to get the perfect sourdough crust?",
        mood: "advice"
      }
    ]
  },
  {
    username: "fatima_almansoor",
    email: "fatima.almansoor@example.ae",
    bio: "Architecture student in Dubai. Fascinated by modern skylines and calligraphy.",
    country: "United Arab Emirates",
    messages: [
      {
        content: "Your design portfolio is stunning! How long did that museum model take?",
        mood: "curious"
      },
      {
        content: "Any tips on mastering Arabic calligraphy for a beginner?",
        mood: "advice"
      }
    ]
  },
  {
    username: "mateo_silva",
    email: "mateo.silva@example.br",
    bio: "Musician from Rio de Janeiro. Samba, sun, and late night jams. Drop me a note!",
    country: "Brazil",
    messages: [
      {
        content: "That guitar cover of Girl from Ipanema was breathtaking!",
        mood: "wit"
      },
      {
        content: "Which local venues in Rio do you recommend for live samba?",
        mood: "advice"
      }
    ]
  }
];

async function seedUsers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in .env");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB.");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    const salt = await bcrypt.genSalt(10);
    const commonPasswordHash = await bcrypt.hash("password123", salt);

    for (const userData of USERS_DATA) {
      console.log(`Processing user: ${userData.username} (${userData.country})...`);

      // Delete existing user if any
      await usersCollection.deleteOne({ username: userData.username });

      // Encrypt and Hash fields
      const encryptedEmail = encrypt(userData.email);
      const emailHash = hashForLookup(userData.email);
      const encryptedBio = encrypt(userData.bio);

      // Process messages
      const processedMessages = userData.messages.map((msg, index) => {
        const encryptedContent = encrypt(msg.content);
        return {
          _id: new mongoose.Types.ObjectId(),
          content: encryptedContent,
          createdAt: new Date(Date.now() - (userData.messages.length - index) * 3600000), // Space out messages by 1 hr
          mood: msg.mood,
          toxicityScore: 0.01,
          toxicityLevel: "clean",
          tenderized: "",
          isBurnAfterRead: false,
          isOpened: false,
          isApprovedForBoard: false,
          isReported: false,
          reportReason: "",
          audioUrl: "",
          deliveryStatus: "delivered",
          senderId: "",
          senderUsername: "",
          flaggedReason: ""
        };
      });

      // Construct User document
      const userDoc = {
        username: userData.username,
        email: encryptedEmail,
        emailHash: emailHash,
        password: commonPasswordHash,
        bio: encryptedBio,
        verifyCode: "", // Empty as they are verified
        verifyCodeExpiry: new Date(Date.now() + 3600000),
        isVerified: true,
        isAcceptingMessage: true,
        messages: processedMessages,
        isShieldEnabled: true,
        ghostReplies: [],
        isPublicBoard: true, // Make public board active
        role: "user",
        status: "active",
        isFlagged: false,
        flagReason: "",
        toxicCount: 0,
        suspensionCount: 0,
        suspendedUntil: null,
        authProvider: "credentials",
        isAccountSetupCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await usersCollection.insertOne(userDoc);
      console.log(`✅ Seeded user @${userData.username}`);
    }

    console.log("\n🎉 All 5 diversified users seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seedUsers();
