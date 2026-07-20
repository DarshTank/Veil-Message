import dbConnect from "@/lib/dbConnect";
import ConfessionModel from "@/model/Confession.model";
import { cleanupExpiredMessages } from "@/lib/cleanupExpiredMessages";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(request: Request) {
  await dbConnect();

  try {
    // Purge expired messages (>24 hours) from DB
    await cleanupExpiredMessages();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const myOnly = searchParams.get("my") === "true";
    const limit = 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      createdAt: { $gt: twentyFourHoursAgo },
    };

    if (myOnly) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return Response.json({ success: false, message: "Not authenticated." }, { status: 401 });
      }
      query.username = session.user.username;
    } else {
      query.isReported = { $ne: true };
    }

    const results = await ConfessionModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const boardMessages = results.map((item) => ({
      _id: item._id,
      content: item.content,
      username: item.username,
      createdAt: item.createdAt,
    }));

    return Response.json({ success: true, boardMessages }, { status: 200 });
  } catch (error) {
    console.error("Board fetch error:", error);
    return Response.json({ success: false, message: "Error fetching board." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!session || !user) {
      return Response.json({ success: false, message: "Not authenticated. Please sign in to post confessions." }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return Response.json({ success: false, message: "Confession content is required." }, { status: 400 });
    }

    const trimmed = content.trim();
    if (trimmed.length < 1) {
      return Response.json({ success: false, message: "Confession content cannot be empty." }, { status: 400 });
    }
    if (trimmed.length > 500) {
      return Response.json({ success: false, message: "Confession cannot exceed 500 characters." }, { status: 400 });
    }

    const newConfession = new ConfessionModel({
      username: user.username,
      content: trimmed,
    });

    await newConfession.save();

    return Response.json(
      { success: true, message: "Confession posted successfully!", confession: newConfession },
      { status: 201 }
    );
  } catch (error) {
    console.error("Post confession error:", error);
    return Response.json({ success: false, message: "Error posting confession." }, { status: 500 });
  }
}
