import { NextResponse } from "next/server";
import { cleanupExpiredMessages } from "@/lib/cleanupExpiredMessages";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}` && authHeader !== cronSecret) {
      return NextResponse.json(
        { success: false, message: "Unauthorized cleanup request." },
        { status: 401 }
      );
    }
  }

  try {
    const stats = await cleanupExpiredMessages();
    return NextResponse.json({
      success: true,
      message: "Expired messages and voice notes (>24 hours) successfully cleaned up.",
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to cleanup messages." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
