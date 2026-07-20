import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import ConnectionRequestModel from "@/model/ConnectionRequest.model";
import ChatRoomModel from "@/model/ChatRoom.model";
import ChatMessageModel from "@/model/ChatMessage.model";
import mongoose from "mongoose";

export async function GET() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  const userId = session.user._id;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ success: true, pendingRequests: 0, unreadChats: {} });
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pendingRequests = await ConnectionRequestModel.countDocuments({
      receiverId: userObjectId,
      status: "pending",
    });

    const activeRooms = await ChatRoomModel.find({
      participants: userObjectId,
      status: "active",
    });

    const unreadChats: Record<string, number> = {};

    for (const room of activeRooms) {
      const lastRead = room.lastReadAt?.get(userId) || new Date(0);
      const effectiveMinDate = lastRead > twentyFourHoursAgo ? lastRead : twentyFourHoursAgo;

      const count = await ChatMessageModel.countDocuments({
        chatRoomId: room._id,
        createdAt: { $gt: effectiveMinDate },
        senderId: { $ne: userObjectId },
      });

      if (count > 0) {
        unreadChats[room._id.toString()] = count;
      }
    }

    return NextResponse.json({
      success: true,
      pendingRequests,
      unreadChats,
    });
  } catch (error) {
    console.error("Error in GET /api/notifications/counts:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
