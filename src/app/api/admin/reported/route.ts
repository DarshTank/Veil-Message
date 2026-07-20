import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { decrypt } from "@/lib/encryption";

export async function GET() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return Response.json({ success: false, message: "Forbidden." }, { status: 403 });
  }

  try {
    const results = await UserModel.aggregate([
      { $unwind: "$messages" },
      { $match: { "messages.isReported": true } },
      { $sort: { "messages.createdAt": -1 } },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          username: 1,
          messageId: "$messages._id",
          content: "$messages.content",
          toxicityLevel: "$messages.toxicityLevel",
          toxicityScore: "$messages.toxicityScore",
          reportReason: "$messages.reportReason",
          createdAt: "$messages.createdAt",
        },
      },
    ]).exec();

    const reported = results.map((item) => ({
      ...item,
      content: decrypt(item.content as string),
    }));

    return Response.json({ success: true, reported });
  } catch (error) {
    console.error("Admin reported messages error:", error);
    return Response.json({ success: false, message: "Error fetching reported messages." }, { status: 500 });
  }
}
