import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import ConnectionRequestModel from "@/model/ConnectionRequest.model";
import ChatRoomModel from "@/model/ChatRoom.model";
import ConnectionModel from "@/model/Connection.model";
import mongoose from "mongoose";

export async function PATCH(
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
  const { id: requestId } = await params;

  try {
    const { action } = await request.json();

    if (action !== "accept" && action !== "decline") {
      return NextResponse.json(
        { success: false, message: "Invalid action." },
        { status: 400 }
      );
    }

    const connReq = await ConnectionRequestModel.findById(requestId);
    if (!connReq) {
      return NextResponse.json(
        { success: false, message: "Connection request not found." },
        { status: 404 }
      );
    }

    if (connReq.receiverId.toString() !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    if (connReq.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "Request is no longer pending." },
        { status: 409 }
      );
    }

    if (action === "accept") {
      const dbSession = await mongoose.startSession();
      dbSession.startTransaction();

      try {
        connReq.status = "accepted";
        await connReq.save({ session: dbSession });

        const [chatRoom] = await ChatRoomModel.create(
          [
            {
              participants: [connReq.senderId, connReq.receiverId],
              status: "active",
              lastReadAt: new Map(),
            },
          ],
          { session: dbSession }
        );

        await ConnectionModel.create(
          [
            {
              userId: connReq.senderId,
              connectedUserId: connReq.receiverId,
              status: "connected",
              chatRoomId: chatRoom._id,
            },
            {
              userId: connReq.receiverId,
              connectedUserId: connReq.senderId,
              status: "connected",
              chatRoomId: chatRoom._id,
            },
          ],
          { session: dbSession, ordered: true }
        );

        await dbSession.commitTransaction();
        dbSession.endSession();

        return NextResponse.json({
          success: true,
          message: "Request accepted.",
          chatRoomId: chatRoom._id.toString(),
        });
      } catch (err) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        console.error("Accept transaction failed:", err);
        return NextResponse.json(
          { success: false, message: "Failed to accept connection." },
          { status: 500 }
        );
      }
    } else {
      await ConnectionRequestModel.deleteOne({ _id: requestId });
      return NextResponse.json({
        success: true,
        message: "Request declined.",
      });
    }
  } catch (error) {
    console.error("Error in PATCH /api/connections/request/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

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
  const { id: requestId } = await params;

  try {
    const connReq = await ConnectionRequestModel.findById(requestId);
    if (!connReq) {
      return NextResponse.json(
        { success: false, message: "Connection request not found." },
        { status: 404 }
      );
    }

    if (
      connReq.senderId.toString() !== userId &&
      connReq.receiverId.toString() !== userId
    ) {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    await ConnectionRequestModel.deleteOne({ _id: requestId });

    return NextResponse.json({
      success: true,
      message: "Connection request revoked.",
    });
  } catch (error) {
    console.error("Error in DELETE /api/connections/request/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
