import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import AdminModel from "@/model/Admin.model";
import { hashForLookup, decrypt } from "@/lib/encryption";

export const authOptions: NextAuthOptions = {
  providers: [
    // ── Google OAuth ────────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Email / Password ────────────────────────────────────────────────────
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await dbConnect();
        try {
          const identifier = credentials?.identifier ?? "";
          const password = credentials?.password ?? "";

          // 1. Check Admin Collection first
          const admin = await AdminModel.findOne({
            $or: [{ username: identifier }, { email: identifier }],
          });

          if (admin && admin.passwordHash) {
            const isPasswordCorrect = await bcrypt.compare(
              password,
              admin.passwordHash
            );
            if (!isPasswordCorrect) {
              throw new Error("Incorrect password.");
            }
            return {
              _id: admin._id.toString(),
              username: admin.username,
              email: admin.email,
              role: "super-admin",
            } as any;
          }

          // 2. Check regular User Collection
          const emailHash = hashForLookup(identifier);
          const user = await UserModel.findOne({
            $or: [{ username: identifier }, { emailHash }],
          });

          if (!user) {
            throw new Error("No account found with that email or username.");
          }
          if (!user.isVerified) {
            throw new Error("Please verify your email before signing in.");
          }
          if (user.status === "suspended") {
            if (user.suspendedUntil && new Date() > new Date(user.suspendedUntil)) {
              // Suspension expired — auto-restore to active status
              user.status = "active";
              user.suspendedUntil = null;
              await user.save();
            } else {
              const remainingMs = user.suspendedUntil ? new Date(user.suspendedUntil).getTime() - Date.now() : 0;
              const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
              throw new Error(
                `Your account is suspended. Remaining time: ${remainingDays} days.`
              );
            }
          }
          if (user.status === "banned") {
            throw new Error("Your account has been permanently banned.");
          }
          if (user.authProvider === "google") {
            throw new Error(
              "This account uses Google Sign-In. Please use the Google button."
            );
          }

          if (!user.password) {
            throw new Error("Incorrect password.");
          }

          const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
          );
          if (!isPasswordCorrect) {
            throw new Error("Incorrect password.");
          }

          return user as never;
        } catch (err: any) {
          throw new Error(err?.message || String(err));
        }
      },
    }),
  ],

  callbacks: {
    // ── Google sign-in: upsert user in MongoDB ──────────────────────────────
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        await dbConnect();
        try {
          const emailHash = hashForLookup(profile.email);
          let user = await UserModel.findOne({ emailHash });

          if (!user) {
            // First-time Google sign-in → create account
            const baseUsername = profile.email
              .split("@")[0]
              .replace(/[^a-zA-Z0-9_]/g, "")
              .slice(0, 20);
            // Ensure unique username
            let username = baseUsername;
            let suffix = 1;
            while (await UserModel.findOne({ username })) {
              username = `${baseUsername}${suffix++}`;
            }

            const { encrypt } = await import("@/lib/encryption");
            user = await UserModel.create({
              username,
              email: encrypt(profile.email),
              emailHash,
              password: "",
              isVerified: true,
              isAcceptingMessage: true,
              authProvider: "google",
              role: "user",
              status: "active",
              bio: "",
              verifyCode: "",
              verifyCodeExpiry: new Date(),
              isAccountSetupCompleted: false,
            });
          } else {
            // Returning Google user — check status
            if (user.status === "suspended") return false;
            if (user.status === "banned") return false;
          }
          return true;
        } catch (err) {
          console.error("Google sign-in error:", err);
          return false;
        }
      }
      return true;
    },

    // ── JWT: attach user metadata from DB ───────────────────────────────────
    async jwt({ token, user, trigger, session }) {
      try {
        // 1. Initial Sign In: populate token from user payload
        if (user) {
          const rawId = (user as any)._id?.toString() || (user as any).id;
          if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
            token._id = rawId;
          }
          token.username = (user as any).username;
          token.email = (user as any).email;
          token.role = (user as any).role || "user";
          token.isVerified = (user as any).isVerified ?? true;
          token.isAcceptingMessages = (user as any).isAcceptingMessage ?? true;
          token.isShieldEnabled = (user as any).isShieldEnabled ?? false;
          token.bio = (user as any).bio || "";
          token.status = (user as any).status || "active";
          token.authProvider = (user as any).authProvider || "credentials";
          token.isAccountSetupCompleted = (user as any).isAccountSetupCompleted ?? true;
        }

        // 2. Trigger Update: sync profile edits from client
        if (trigger === "update" && session) {
          if (session.user?.username) token.username = session.user.username;
          if (session.user?.isAccountSetupCompleted !== undefined) {
            token.isAccountSetupCompleted = session.user.isAccountSetupCompleted;
          }
          if (session.user?.isAcceptingMessages !== undefined) {
            token.isAcceptingMessages = session.user.isAcceptingMessages;
          }
          if (session.user?.isShieldEnabled !== undefined) {
            token.isShieldEnabled = session.user.isShieldEnabled;
          }
          if (session.user?.bio !== undefined) {
            token.bio = session.user.bio;
          }
        }

        const isValidObjectId = token._id && mongoose.Types.ObjectId.isValid(token._id as string);

        // 3. Fast Path: If token is already populated with essential fields & valid ObjectId, return immediately
        if (
          isValidObjectId &&
          token.username &&
          token.role &&
          token.isAccountSetupCompleted !== undefined &&
          trigger !== "update"
        ) {
          return token;
        }

        // 4. Fallback for initial OAuth or unpopulated tokens: fetch DB once
        await dbConnect();

        const adminSearch = [];
        if (token.username) adminSearch.push({ username: token.username });
        if (token.email) adminSearch.push({ email: token.email });

        if (adminSearch.length > 0) {
          const admin = await AdminModel.findOne({ $or: adminSearch });
          if (admin) {
            token._id = admin._id.toString();
            token.username = admin.username;
            token.email = admin.email;
            token.role = "super-admin";
            token.isAccountSetupCompleted = true;
            return token;
          }
        }

        const userId = (token._id as string) || (token.sub as string);
        const email = token.email;
        const emailHash = email ? hashForLookup(email) : undefined;

        let dbUser = null;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
          dbUser = await UserModel.findById(userId);
        }
        if (!dbUser && emailHash) {
          dbUser = await UserModel.findOne({ emailHash });
        }
        if (!dbUser && token.username) {
          dbUser = await UserModel.findOne({ username: token.username });
        }

        if (dbUser) {
          token._id = dbUser._id?.toString();
          token.username = dbUser.username;
          token.email = dbUser.email ? decrypt(dbUser.email) : "";
          token.isVerified = dbUser.isVerified;
          token.isAcceptingMessages = dbUser.isAcceptingMessage;
          token.isShieldEnabled = dbUser.isShieldEnabled;
          token.bio = dbUser.bio ? decrypt(dbUser.bio) : "";
          token.role = dbUser.role || "user";
          token.status = dbUser.status;
          token.authProvider = dbUser.authProvider;
          token.isAccountSetupCompleted = dbUser.isAccountSetupCompleted;
        }

        if (token.email && token.email.includes(":")) {
          token.email = decrypt(token.email);
        }
      } catch (err) {
        console.error("JWT callback error:", err);
      }
      return token;
    },

    // ── Session: expose token fields to client ───────────────────────────────
    async session({ session, token }) {
      if (token) {
        session.user._id = token._id as string;
        session.user.username = token.username as string;
        session.user.email = (token.email as string) || "";
        session.user.isVerified = token.isVerified as boolean;
        session.user.isAcceptingMessages = token.isAcceptingMessages as boolean;
        session.user.isShieldEnabled = token.isShieldEnabled as boolean;
        session.user.bio = token.bio as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.authProvider = token.authProvider as string;
        session.user.isAccountSetupCompleted = token.isAccountSetupCompleted as boolean;
      }
      return session;
    },
  },

  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
