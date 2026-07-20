import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
  }

  try {
    const { recipientId, messageId, action } = await request.json();

    if (!recipientId || !messageId || !action) {
      return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ success: false, message: "Invalid action. Must be 'approve' or 'reject'." }, { status: 400 });
    }

    const deliveryStatus = action === "approve" ? "delivered" : "rejected";

    const result = await UserModel.updateOne(
      { _id: recipientId, "messages._id": messageId },
      { $set: { "messages.$.deliveryStatus": deliveryStatus } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: "Message not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Message has been successfully ${action}d.`,
    });
  } catch (error) {
    console.error("Admin review message error:", error);
    return NextResponse.json({ success: false, message: "Error reviewing message." }, { status: 500 });
  }
}
