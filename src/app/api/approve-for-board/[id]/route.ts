import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { User } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user: User = session?.user as User;

  if (!session || !user) {
    return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    // Get current state to toggle
    const dbUser = await UserModel.findOne(
      { _id: user._id, "messages._id": id },
      { "messages.$": 1 }
    );

    if (!dbUser || !dbUser.messages[0]) {
      return NextResponse.json({ success: false, message: "Message not found." }, { status: 404 });
    }

    const currentState = dbUser.messages[0].isApprovedForBoard;

    await UserModel.updateOne(
      { _id: user._id, "messages._id": id },
      { $set: { "messages.$.isApprovedForBoard": !currentState } }
    );

    return NextResponse.json({
      success: true,
      message: !currentState ? "Message approved for board." : "Message removed from board.",
      isApproved: !currentState,
    });
  } catch (error) {
    console.error("Approve for board error:", error);
    return NextResponse.json({ success: false, message: "Error updating board status." }, { status: 500 });
  }
}
