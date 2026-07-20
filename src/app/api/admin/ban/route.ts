import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/encryption";
import { sendAccountBannedEmail } from "@/helpers/sendAccountStatusEmail";

export async function POST(request: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
  }

  try {
    const { userId, reason } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: "User ID is required." }, { status: 400 });
    }

    if (userId === session.user._id) {
      return NextResponse.json(
        { success: false, message: "You cannot ban your own account." },
        { status: 400 }
      );
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const banReason = reason || "Permanently banned by admin due to severe safety policy violations.";

    user.status = "banned";
    user.flagReason = banReason;
    await user.save();

    // Send email notification to banned user
    const userEmail = decrypt(user.email);
    if (userEmail) {
      await sendAccountBannedEmail(userEmail, user.username, banReason);
    }

    return NextResponse.json({
      success: true,
      message: `User "@${user.username}" has been permanently banned and notified via email.`,
    });
  } catch (error) {
    console.error("Admin ban user error:", error);
    return NextResponse.json({ success: false, message: "Error banning user." }, { status: 500 });
  }
}
