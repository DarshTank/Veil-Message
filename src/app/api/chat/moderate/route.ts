import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { analyzeMessage } from "@/lib/aiMessageAnalyzer";

function sanitizeInput(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Content is required." },
        { status: 400 }
      );
    }

    const sanitized = sanitizeInput(content);
    const analysis = await analyzeMessage(sanitized);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Error in POST /api/chat/moderate:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
