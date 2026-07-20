import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import ConnectionModel from "@/model/Connection.model";
import ConnectionRequestModel from "@/model/ConnectionRequest.model";
import mongoose from "mongoose";

export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  const senderId = new mongoose.Types.ObjectId(session.user._id);

  try {
    const { receiverId } = await request.json();

    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return NextResponse.json(
        { success: false, message: "receiverId is required." },
        { status: 400 }
      );
    }

    if (receiverId === session.user._id) {
      return NextResponse.json(
        { success: false, message: "You cannot connect with yourself." },
        { status: 400 }
      );
    }

    const receiver = await UserModel.findById(receiverId);
    if (!receiver) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    if (receiver.status === "suspended" || receiver.status === "banned") {
      return NextResponse.json(
        { success: false, message: "This user is unavailable." },
        { status: 403 }
      );
    }

    const targetId = new mongoose.Types.ObjectId(receiverId);

    // Duplicate pending or accepted request check
    const existingRequest = await ConnectionRequestModel.findOne({
      $or: [
        { senderId, receiverId: targetId },
        { senderId: targetId, receiverId: senderId },
      ],
      status: { $in: ["pending", "accepted"] },
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "A connection request already exists between these users.",
        },
        { status: 409 }
      );
    }

    // Existing connection check
    const existingConnection = await ConnectionModel.findOne({
      userId: senderId,
      connectedUserId: targetId,
      status: "connected",
    });

    if (existingConnection) {
      return NextResponse.json(
        { success: false, message: "You are already connected with this user." },
        { status: 409 }
      );
    }

    const connectionRequest = await ConnectionRequestModel.create({
      senderId,
      receiverId: targetId,
      status: "pending",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Connection request sent.",
        requestId: connectionRequest._id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/connections/request:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
