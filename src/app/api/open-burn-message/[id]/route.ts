import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { User } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { deleteAudioBlobs } from "@/lib/deleteAudioBlob";

/**
 * POST /api/open-burn-message/[id]
 * Marks a burn-after-read message as opened, then removes it from the DB.
 * Returns the decrypted content for one-time display before deletion.
 */
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

    // Check if burn message has audio and delete from Vercel Blob
    const targetUser = await UserModel.findOne(
      { _id: user._id, "messages._id": id, "messages.isBurnAfterRead": true },
      { "messages.$": 1 }
    );
    if (targetUser && Array.isArray(targetUser.messages) && targetUser.messages.length > 0) {
      const msgToDelete = targetUser.messages[0];
      if (msgToDelete?.audioUrl) {
        await deleteAudioBlobs([msgToDelete.audioUrl]);
      }
    }

    // Remove the message atomically
    const result = await UserModel.updateOne(
      { _id: user._id, "messages._id": id, "messages.isBurnAfterRead": true },
      { $pull: { messages: { _id: id } } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Message not found or already burned." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Message burned." });
  } catch (error) {
    console.error("Burn message error:", error);
    return NextResponse.json({ success: false, message: "Error burning message." }, { status: 500 });
  }
}
