import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/admin/messages/[id] — admin can delete any message
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const result = await UserModel.updateOne(
      { "messages._id": id },
      { $pull: { messages: { _id: id } } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ success: false, message: "Message not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Message deleted by admin." });
  } catch (error) {
    console.error("Admin delete message error:", error);
    return NextResponse.json({ success: false, message: "Error deleting message." }, { status: 500 });
  }
}
