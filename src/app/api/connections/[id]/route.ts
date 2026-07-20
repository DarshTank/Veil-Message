import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import ConnectionModel from "@/model/Connection.model";
import ChatRoomModel from "@/model/ChatRoom.model";
import mongoose from "mongoose";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
  const { id: connectionId } = await params;

  try {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const myConn = await ConnectionModel.findOne({
        _id: connectionId,
        userId,
      });

      if (!myConn) {
        throw new Error("Connection not found or not owned by caller.");
      }

      const connectedUserId = myConn.connectedUserId;
      const chatRoomId = myConn.chatRoomId;

      await ConnectionModel.deleteOne({ _id: connectionId }, { session: dbSession });
      await ConnectionModel.deleteOne(
        { userId: connectedUserId, connectedUserId: userId },
        { session: dbSession }
      );

      await ChatRoomModel.findByIdAndUpdate(
        chatRoomId,
        { status: "archived" },
        { session: dbSession }
      );

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json({
        success: true,
        message: "Connection removed and chat archived.",
      });
    } catch (err: unknown) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      console.error("Remove connection transaction failed:", err);
      const error = err as Error;
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Failed to remove connection.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in DELETE /api/connections/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
