import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { User } from "next-auth";
import { encrypt } from "@/lib/encryption";

/**
 * POST /api/ghost-reply — add a ghost reply
 * DELETE /api/ghost-reply — remove a ghost reply by index
 */
export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user: User = session?.user as User;

  if (!session || !user) {
    return Response.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  if (user.role === "super-admin") {
    return Response.json({
      success: false,
      message: "Administrators cannot publish ghost whispers.",
    }, { status: 400 });
  }

  try {
    const { reply } = await request.json();

    if (!reply || typeof reply !== "string" || reply.trim().length === 0) {
      return Response.json({ success: false, message: "Reply text is required." }, { status: 400 });
    }

    if (reply.length > 280) {
      return Response.json(
        { success: false, message: "Ghost reply must be under 280 characters." },
        { status: 400 }
      );
    }

    const encryptedReply = encrypt(reply.trim());

    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      { $push: { ghostReplies: encryptedReply } },
      { new: true }
    );

    if (!updatedUser) {
      return Response.json({ success: false, message: "User not found." }, { status: 404 });
    }

    return Response.json(
      { success: true, message: "Ghost reply published.", count: updatedUser.ghostReplies.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("Ghost reply POST error:", error);
    return Response.json({ success: false, message: "Error adding ghost reply." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user: User = session?.user as User;

  if (!session || !user) {
    return Response.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  if (user.role === "super-admin") {
    return Response.json({
      success: false,
      message: "Administrators cannot have ghost whispers.",
    }, { status: 400 });
  }

  try {
    const { index } = await request.json();

    const dbUser = await UserModel.findById(user._id);
    if (!dbUser) {
      return Response.json({ success: false, message: "User not found." }, { status: 404 });
    }

    if (typeof index !== "number" || index < 0 || index >= dbUser.ghostReplies.length) {
      return Response.json({ success: false, message: "Invalid index." }, { status: 400 });
    }

    dbUser.ghostReplies.splice(index, 1);
    await dbUser.save();

    return Response.json({ success: true, message: "Ghost reply removed." });
  } catch (error) {
    console.error("Ghost reply DELETE error:", error);
    return Response.json({ success: false, message: "Error removing ghost reply." }, { status: 500 });
  }
}
