import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { Message } from "@/model/User.model";
import { encrypt } from "@/lib/encryption";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { analyzeMessage, AIAnalysis } from "@/lib/aiMessageAnalyzer";

// ── Input sanitization ────────────────────────────────────────────────────────

function sanitizeInput(text: string): string {
  // Strip HTML tags and trim
  return text.replace(/<[^>]*>/g, "").trim();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { username, content, isBurnAfterRead = false, audioUrl = "" } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json({ success: false, message: "Username is required." }, { status: 400 });
    }

    const sanitizedContent = sanitizeInput(content ?? "");

    // If this is a voice message, content can be empty
    if (!sanitizedContent && !audioUrl) {
      return NextResponse.json(
        { success: false, message: "Message content or audio is required." },
        { status: 400 }
      );
    }

    // Enforce max length
    if (sanitizedContent.length > 500) {
      return NextResponse.json(
        { success: false, message: "Message too long. Maximum 500 characters." },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({ username });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    if (user.status === "suspended" || user.status === "banned") {
      return NextResponse.json(
        { success: false, message: "This profile is not available." },
        { status: 403 }
      );
    }

    if (!user.isAcceptingMessage) {
      return NextResponse.json(
        { success: false, message: "This user is not accepting messages right now." },
        { status: 403 }
      );
    }

    // ── AI Analysis (skip for voice-only messages) ──────────────────────────
    let analysis: AIAnalysis = {
      mood: "curious",
      toxicityScore: 0,
      toxicityLevel: "clean",
      tenderized: "",
    };

    if (sanitizedContent) {
      analysis = await analyzeMessage(sanitizedContent);
    }

    // ── Profanity & Toxicity Filtering (Quarantine system) ──────────────────
    const PROFANITY_REGEX = /\b(fuck|shit|bitch|cunt|asshole|whore|bastard|dick|pussy)\b/i;
    const hasProfanity = PROFANITY_REGEX.test(sanitizedContent);
    const isAbusive = analysis.toxicityLevel === "toxic" || analysis.toxicityLevel === "harsh" || hasProfanity;

    // Get sender token (if logged in)
    const senderToken = await getToken({ req: request });
    if (!senderToken) {
      return NextResponse.json(
        { success: false, message: "Not authenticated. Please sign in to send messages." },
        { status: 401 }
      );
    }
    const senderId = senderToken?._id || "";

    let deliveryStatus: "delivered" | "pending" | "rejected" = "delivered";
    let flaggedReason = "";

    if (isAbusive) {
      deliveryStatus = "pending";
      flaggedReason = hasProfanity
        ? "Contains blacklisted profanity words"
        : `AI flagged: ${analysis.toxicityLevel} content (Score: ${Math.round(analysis.toxicityScore * 100)}%)`;

      // Auto-flag the sender's account if they are authenticated and send toxic content
      if (senderId && analysis.toxicityLevel === "toxic") {
        await UserModel.findByIdAndUpdate(senderId, {
          $inc: { toxicCount: 1 },
        });
        const senderInfo = await UserModel.findById(senderId);
        if (senderInfo && senderInfo.toxicCount >= 3 && !senderInfo.isFlagged) {
          await UserModel.findByIdAndUpdate(senderId, {
            isFlagged: true,
            flagReason: "Auto-flagged: 3+ toxic messages sent",
          });
        }
      }
    }

    // ── Encrypt content before saving ───────────────────────────────────────
    const encryptedContent = sanitizedContent ? encrypt(sanitizedContent) : "";
    const encryptedTenderized = analysis.tenderized ? encrypt(analysis.tenderized) : "";

    const newMessage = {
      content: encryptedContent,
      createdAt: new Date(),
      mood: analysis.mood,
      toxicityScore: analysis.toxicityScore,
      toxicityLevel: analysis.toxicityLevel,
      tenderized: encryptedTenderized,
      isBurnAfterRead: Boolean(isBurnAfterRead),
      isOpened: false,
      isApprovedForBoard: false,
      isReported: false,
      reportReason: "",
      audioUrl: audioUrl || "",
      deliveryStatus,
      senderId: "",
      senderUsername: "",
      flaggedReason,
    };

    user.messages.push(newMessage as unknown as Message);
    await user.save();

    if (deliveryStatus === "pending") {
      return NextResponse.json(
        { success: true, message: "Message flagged for review. It will be delivered once approved by an admin." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Message sent successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
