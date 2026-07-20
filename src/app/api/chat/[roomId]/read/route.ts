import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import ChatRoomModel from "@/model/ChatRoom.model";
import mongoose from "mongoose";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  const userId = session.user._id;
  const { roomId } = await params;

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return NextResponse.json(
      { success: false, message: "Invalid room ID." },
      { status: 400 }
    );
  }

  try {
    const { lastMessageTimestamp } = await request.json();

    if (!lastMessageTimestamp) {
      return NextResponse.json(
        { success: false, message: "lastMessageTimestamp is required." },
        { status: 400 }
      );
    }

    const room = await ChatRoomModel.findById(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, message: "Chat room not found." },
        { status: 404 }
      );
    }

    const isParticipant = room.participants.some(
      (p: mongoose.Types.ObjectId) => p.toString() === userId
    );
    if (!isParticipant) {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    room.lastReadAt = room.lastReadAt || new Map();
    room.lastReadAt.set(userId, new Date(lastMessageTimestamp));
    await room.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/chat/[roomId]/read:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
