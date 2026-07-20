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
      senderId: userId,
      status: "pending",
    })
      .populate("receiverId", "username bio status")
      .sort({ createdAt: -1 });

    const processedRequests = [];

    for (const req of requests) {
      const receiver = req.receiverId as unknown as {
        _id?: mongoose.Types.ObjectId;
        username?: string;
        bio?: string;
        status?: string;
      } | null;

      if (!receiver || !receiver._id) {
        continue;
      }

      if (receiver.status === "banned") {
        await ConnectionRequestModel.deleteOne({ _id: req._id });
        continue;
      }

      processedRequests.push({
        _id: req._id.toString(),
        receiver: {
          _id: receiver._id.toString(),
          username: receiver.username || "Unknown User",
          bio: decrypt(receiver.bio || ""),
        },
        createdAt: req.createdAt,
      });
    }

    return NextResponse.json({
      success: true,
      requests: processedRequests,
    });
  } catch (error) {
    console.error("Error in GET /api/connections/requests/sent:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
