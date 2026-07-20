import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import ConnectionModel from "@/model/Connection.model";
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
    // 1. Get connected user IDs
    const connections = await ConnectionModel.find({
      userId,
      status: "connected",
    }).select("connectedUserId");
    const connectedUserIds = connections.map((c) => c.connectedUserId);

    // 2. Get user IDs with pending connection requests (both sent and received)
    const pendingRequests = await ConnectionRequestModel.find({
      $or: [
        { senderId: userId, status: "pending" },
        { receiverId: userId, status: "pending" },
      ],
    });
    const pendingUserIds = pendingRequests.map((r) =>
      r.senderId.toString() === userId.toString() ? r.receiverId : r.senderId
    );

    // 3. Build exclusion set
    const exclusionSet = [
      userId,
      ...connectedUserIds,
      ...pendingUserIds,
    ];

    // 4. Sample up to 20 stranger profiles who are active, verified, setup completed, and not excluded
    const strangers = await UserModel.aggregate([
      {
        $match: {
          _id: { $nin: exclusionSet },
          status: "active",
          isVerified: true,
          isAccountSetupCompleted: true,
          role: "user",
        },
      },
      { $sample: { size: 20 } },
      {
        $project: {
          _id: 1,
          username: 1,
          bio: 1,
        },
      },
    ]);

    // 5. Decrypt bio for each stranger
    const processedStrangers = strangers.map((s) => ({
      _id: s._id.toString(),
      username: s.username,
      bio: decrypt(s.bio),
    }));

    return NextResponse.json({
      success: true,
      strangers: processedStrangers,
    });
  } catch (error) {
    console.error("Error in GET /api/discover:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
