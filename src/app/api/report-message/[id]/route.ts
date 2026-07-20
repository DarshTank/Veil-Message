import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import ConfessionModel from "@/model/Confession.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await context.params;
    const { reason } = await request.json();

    // Find which user owns this message
    const userWithMessage = await UserModel.findOne({ "messages._id": id });

    if (userWithMessage) {
      await UserModel.updateOne(
        { "messages._id": id },
        {
          $set: {
            "messages.$.isReported": true,
            "messages.$.reportReason": reason ?? "Reported by viewer",
          },
        }
      );
      return NextResponse.json({ success: true, message: "Message reported. We will review it." });
    }

    // Try finding in ConfessionModel
    const confession = await ConfessionModel.findById(id);
    if (confession) {
      confession.isReported = true;
      confession.reportReason = reason ?? "Reported by viewer";
      await confession.save();
      return NextResponse.json({ success: true, message: "Confession reported. We will review it." });
    }

    return NextResponse.json({ success: false, message: "Message/Confession not found." }, { status: 404 });
  } catch (error) {
    console.error("Report message error:", error);
    return NextResponse.json({ success: false, message: "Error reporting message." }, { status: 500 });
  }
}
