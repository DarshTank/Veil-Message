import { Schema, model, models, Document } from "mongoose";

// ─── Message Sub-document ────────────────────────────────────────────────────

export interface Message extends Document {
  // Core content (AES encrypted at rest)
  content: string;
  createdAt: Date;

  // Feature: Atmospheric Mood Auras
  mood: "confession" | "advice" | "wit" | "critique" | "curious";

  // Feature: AI Empathy Guard
  toxicityScore: number; // 0.0 – 1.0
  toxicityLevel: "clean" | "rude" | "harsh" | "toxic";
  tenderized: string; // AES encrypted; empty when not toxic

  // Feature: Burn After Read
  isBurnAfterRead: boolean;
  isOpened: boolean;

  // Feature: Confessions Board
  isApprovedForBoard: boolean;

  // Feature: Reporting
  isReported: boolean;
  reportReason: string;

  // Feature: Voice Messages
  audioUrl: string; // Vercel Blob URL — not sensitive, stored plaintext

  // Moderation & Quarantine
  deliveryStatus: "delivered" | "pending" | "rejected";
  senderId?: string;
  senderUsername?: string;
  flaggedReason?: string;
}

const MessageSchema: Schema<Message> = new Schema({
  content: { type: String, required: false, default: "" },
  createdAt: { type: Date, required: true, default: Date.now },

  mood: {
    type: String,
    enum: ["confession", "advice", "wit", "critique", "curious"],
    default: "curious",
  },

  toxicityScore: { type: Number, default: 0, min: 0, max: 1 },
  toxicityLevel: {
    type: String,
    enum: ["clean", "rude", "harsh", "toxic"],
    default: "clean",
  },
  tenderized: { type: String, default: "" },

  isBurnAfterRead: { type: Boolean, default: false },
  isOpened: { type: Boolean, default: false },

  isApprovedForBoard: { type: Boolean, default: false },

  isReported: { type: Boolean, default: false },
  reportReason: { type: String, default: "" },

  audioUrl: { type: String, default: "" },

  deliveryStatus: {
    type: String,
    enum: ["delivered", "pending", "rejected"],
    default: "delivered",
  },
  senderId: { type: String, default: "" },
  senderUsername: { type: String, default: "" },
  flaggedReason: { type: String, default: "" },
});

// ─── User Document ────────────────────────────────────────────────────────────

export interface User extends Document {
  // Core identity
  username: string; // public — stored plaintext
  email: string; // AES encrypted
  emailHash: string; // SHA-256 hash — used for DB lookups
  password: string; // bcrypt hashed; empty for Google OAuth users
  bio: string; // AES encrypted

  // Email verification / OTP
  verifyCode: string; // bcrypt hashed OTP
  verifyCodeExpiry: Date;
  isVerified: boolean;

  // Messaging settings
  isAcceptingMessage: boolean;
  messages: Message[];

  // Feature: AI Empathy Guard
  isShieldEnabled: boolean;

  // Feature: Ghost Replies
  ghostReplies: string[]; // each entry AES encrypted

  // Feature: Confessions Board
  isPublicBoard: boolean;

  // Admin / Safety
  role: "user" | "admin" | "super-admin";
  status: "active" | "suspended" | "banned";
  isFlagged: boolean;
  flagReason: string;
  toxicCount: number; // auto-incremented per toxic message sent
  suspensionCount: number;
  suspendedUntil?: Date | null;

  // OAuth
  authProvider: "credentials" | "google";
  isAccountSetupCompleted: boolean;

  // E2EE
  publicKey?: string;
  encryptedPrivateKey?: string;
}

const UserSchema: Schema<User> = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
    },
    emailHash: {
      type: String,
      unique: true,
      sparse: true, // allows null for accounts without email
    },
    password: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },

    verifyCode: {
      type: String,
      default: "",
    },
    verifyCodeExpiry: {
      type: Date,
      default: () => new Date(Date.now() + 3600000),
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    isAcceptingMessage: {
      type: Boolean,
      default: true,
    },
    messages: [MessageSchema],

    isShieldEnabled: {
      type: Boolean,
      default: true,
    },

    ghostReplies: {
      type: [String],
      default: [],
    },

    isPublicBoard: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["user", "admin", "super-admin"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "banned"],
      default: "active",
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: "",
    },
    toxicCount: {
      type: Number,
      default: 0,
    },
    suspensionCount: {
      type: Number,
      default: 0,
    },
    suspendedUntil: {
      type: Date,
      default: null,
    },

    authProvider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },
    isAccountSetupCompleted: {
      type: Boolean,
      default: false,
    },
    publicKey: {
      type: String,
      default: "",
    },
    encryptedPrivateKey: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt to User doc
  }
);

if (process.env.NODE_ENV === "development") {
  delete models.User;
}

const UserModel = models.User || model<User>("User", UserSchema);
export default UserModel;
