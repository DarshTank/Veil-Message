import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import ConnectionRequestModel from "@/model/ConnectionRequest.model";
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
    // Ensure UserModel is registered before populate
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    UserModel;

    const requests = await ConnectionRequestModel.find({
      receiverId: userId,
      status: "pending",
    })
      .populate("senderId", "username bio status")
      .sort({ createdAt: -1 });

    const processedRequests = [];

    for (const req of requests) {
      const sender = req.senderId as unknown as {
        _id?: mongoose.Types.ObjectId;
        username?: string;
        bio?: string;
        status?: string;
      } | null;

      if (!sender || !sender._id) {
        continue;
      }

      if (sender.status === "banned") {
        await ConnectionRequestModel.deleteOne({ _id: req._id });
        continue;
      }

      processedRequests.push({
        _id: req._id.toString(),
        sender: {
          _id: sender._id.toString(),
          username: sender.username || "Unknown User",
          bio: decrypt(sender.bio || ""),
        },
        createdAt: req.createdAt,
      });
    }

    return NextResponse.json({
      success: true,
      requests: processedRequests,
    });
  } catch (error) {
    console.error("Error in GET /api/connections/requests/inbox:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
