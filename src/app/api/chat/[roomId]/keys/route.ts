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

  if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
    return NextResponse.json(
      { success: false, message: "Invalid room ID." },
      { status: 400 }
    );
  }

  try {
    const { keys } = await request.json();

    if (!keys || typeof keys !== "object" || Array.isArray(keys)) {
      return NextResponse.json(
        { success: false, message: "Invalid keys format." },
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
      (p: mongoose.Types.ObjectId) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    // Convert and validate the dictionary keys into schema format
    const newRoomKeys: { userId: mongoose.Types.ObjectId; encryptedKey: string }[] = [];

    for (const [partId, encKey] of Object.entries(keys)) {
      if (
        !partId ||
        !mongoose.Types.ObjectId.isValid(partId) ||
        typeof encKey !== "string" ||
        !encKey.trim()
      ) {
        return NextResponse.json(
          { success: false, message: `Invalid participant ID or encrypted key payload for participant "${partId}".` },
          { status: 400 }
        );
      }
      newRoomKeys.push({
        userId: new mongoose.Types.ObjectId(partId),
        encryptedKey: encKey.trim(),
      });
    }

    // Update the roomKeys field
    room.roomKeys = newRoomKeys;
    await room.save();

    return NextResponse.json({
      success: true,
      message: "Room keys stored successfully.",
    });
  } catch (error) {
    console.error("Error in POST /api/chat/[roomId]/keys:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
