import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/encryption";
import { sendAccountSuspendedEmail } from "@/helpers/sendAccountStatusEmail";
import dayjs from "dayjs";

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
        { success: false, message: "You cannot suspend your own account." },
        { status: 400 }
      );
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const currentCount = user.suspensionCount || 0;

    // After 3 suspensions, user cannot be suspended anymore (only banned)
    if (currentCount >= 3) {
      return NextResponse.json(
        {
          success: false,
          message: "User has reached the maximum of 3 suspensions. They must be permanently banned.",
        },
        { status: 400 }
      );
    }

    // Progressive suspension rules:
    // 1st suspension: 7 days (1 week)
    // 2nd suspension: 30 days (1 month)
    // 3rd suspension: 60 days (2 months)
    let days = 7;
    let durationText = "1 week";

    if (currentCount === 1) {
      days = 30;
      durationText = "1 month";
    } else if (currentCount === 2) {
      days = 60;
      durationText = "2 months";
    }

    const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const flagReason = reason || `Suspended by admin for ${durationText} due to safety violations.`;

    user.status = "suspended";
    user.suspendedUntil = suspendedUntil;
    user.suspensionCount = currentCount + 1;
    user.flagReason = flagReason;

    await user.save();

    // Send email notification to suspended user
    const userEmail = decrypt(user.email);
    if (userEmail) {
      const formattedDate = dayjs(suspendedUntil).format("MMMM D, YYYY • h:mm A");
      await sendAccountSuspendedEmail(
        userEmail,
        user.username,
        flagReason,
        durationText,
        formattedDate
      );
    }

    return NextResponse.json({
      success: true,
      message: `User "@${user.username}" suspended for ${durationText} successfully. (Suspension ${user.suspensionCount}/3)`,
      suspendedUntil,
      suspensionCount: user.suspensionCount,
    });
  } catch (error) {
    console.error("Admin suspend user error:", error);
    return NextResponse.json({ success: false, message: "Error suspending user." }, { status: 500 });
  }
}
