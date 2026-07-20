import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import UserReportModel from "@/model/UserReport.model";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return Response.json(
      { success: false, message: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  try {
    const { reportedUsername, category, reason } = await request.json();

    if (!reportedUsername || typeof reportedUsername !== "string") {
      return Response.json(
        { success: false, message: "Reported username is required." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return Response.json(
        { success: false, message: "Please provide a reason for the report." },
        { status: 400 }
      );
    }

    const trimmedUsername = reportedUsername.trim();
    const trimmedReason = reason.trim();

    // Prevent reporting oneself
    if (session.user.username.toLowerCase() === trimmedUsername.toLowerCase()) {
      return Response.json(
        { success: false, message: "You cannot report your own account." },
        { status: 400 }
      );
    }

    // Find the user being reported
    const reportedUser = await UserModel.findOne({
      username: new RegExp(`^${trimmedUsername}$`, "i"),
    });

    if (!reportedUser) {
      return Response.json(
        { success: false, message: "User to report not found." },
        { status: 404 }
      );
    }

    const validCategories = ["harassment", "spam", "inappropriate", "impersonation", "other"];
    const reportCategory = validCategories.includes(category) ? category : "other";

    // Create the report
    const newReport = await UserReportModel.create({
      reporterId: session.user._id,
      reporterUsername: session.user.username,
      reportedUserId: reportedUser._id,
      reportedUsername: reportedUser.username,
      category: reportCategory,
      reason: trimmedReason,
      status: "pending",
    });

    // Optionally mark reported user as flagged if multiple reports or flag exists
    if (!reportedUser.isFlagged) {
      reportedUser.isFlagged = true;
      reportedUser.flagReason = `User reported by @${session.user.username}: ${trimmedReason.slice(0, 100)}`;
      await reportedUser.save();
    }

    return Response.json({
      success: true,
      message: `Report for @${reportedUser.username} has been submitted to the moderation team.`,
      reportId: newReport._id,
    });
  } catch (error) {
    console.error("Error submitting user report:", error);
    return Response.json(
      { success: false, message: "Failed to submit user report. Please try again." },
      { status: 500 }
    );
  }
}
