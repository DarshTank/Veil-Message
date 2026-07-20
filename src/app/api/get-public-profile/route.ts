import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { decrypt, decryptArray } from "@/lib/encryption";
import AdminModel from "@/model/Admin.model";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return Response.json({ success: false, message: "Username is required." }, { status: 400 });
    }

    const user = await UserModel.findOne({ username, isVerified: true });
    if (!user) {
      const admin = await AdminModel.findOne({ username });
      if (admin) {
        return Response.json(
          {
            success: true,
            message: "User found.",
            user: {
              username: admin.username,
              bio: "System Administrator",
              isAcceptingMessage: false,
              ghostReplies: [],
              isPublicBoard: false,
            },
          },
          { status: 200 }
        );
      }
      return Response.json({ success: false, message: "User not found." }, { status: 404 });
    }

    if (user.status === "suspended" || user.status === "banned") {
      return Response.json(
        { success: false, message: "This profile is not available." },
        { status: 403 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "User found.",
        user: {
          username: user.username,
          bio: decrypt(user.bio),
          isAcceptingMessage: user.isAcceptingMessage,
          ghostReplies: decryptArray(user.ghostReplies),
          isPublicBoard: user.isPublicBoard,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get public profile error:", error);
    return Response.json({ success: false, message: "Error fetching profile." }, { status: 500 });
  }
}
