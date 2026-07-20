import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { decrypt } from "@/lib/encryption";
import { NextResponse } from "next/server";

export async function GET() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
  }

  try {
    const results = await UserModel.aggregate([
      { $unwind: "$messages" },
      { $match: { "messages.deliveryStatus": "pending" } },
      { $sort: { "messages.createdAt": -1 } },
      {
        $project: {
          _id: 0,
          recipientId: "$_id",
          recipientUsername: "$username",
          messageId: "$messages._id",
          content: "$messages.content",
          toxicityLevel: "$messages.toxicityLevel",
          toxicityScore: "$messages.toxicityScore",
          audioUrl: "$messages.audioUrl",
          senderId: "$messages.senderId",
          senderUsername: "$messages.senderUsername",
          flaggedReason: "$messages.flaggedReason",
          createdAt: "$messages.createdAt",
        },
      },
    ]).exec();

    const pending = results.map((item) => ({
      ...item,
      content: item.content ? decrypt(item.content as string) : "",
    }));

    return NextResponse.json({ success: true, pending });
  } catch (error) {
    console.error("Admin pending messages error:", error);
    return NextResponse.json({ success: false, message: "Error fetching pending messages." }, { status: 500 });
  }
}
