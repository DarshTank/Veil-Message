import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import ConnectionModel from "@/model/Connection.model";
import { decrypt } from "@/lib/encryption";
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

  const userId = new mongoose.Types.ObjectId(session.user._id);

  try {
    const connections = await ConnectionModel.find({
      userId,
      status: "connected",
    })
      .populate("connectedUserId", "username bio")
      .populate("chatRoomId", "status");

    const processedConnections = connections.map((conn) => {
      const partner = conn.connectedUserId as unknown as { _id?: mongoose.Types.ObjectId; username?: string; bio?: string } | null;
      const room = conn.chatRoomId as unknown as { _id?: mongoose.Types.ObjectId; status?: string } | null;

      return {
        _id: conn._id.toString(),
        connectedUser: {
          _id: partner?._id?.toString() || "",
          username: partner?.username || "",
          bio: partner ? decrypt(partner.bio || "") : "",
        },
        chatRoomId: room?._id?.toString() || "",
        chatRoomStatus: room?.status || "active",
        createdAt: conn.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      connections: processedConnections,
    });
  } catch (error) {
    console.error("Error in GET /api/connections:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
