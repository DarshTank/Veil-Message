import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { User } from "next-auth";

export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user: User = session?.user as User;

  if (!session || !user) {
    return Response.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  if (user.role === "super-admin") {
    return Response.json({
      success: true,
      message: "Confessions Board is disabled for administrators.",
      isPublicBoard: false,
    });
  }

  try {
    const { isPublicBoard } = await request.json();

    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      { isPublicBoard: Boolean(isPublicBoard) },
      { new: true }
    );

    if (!updatedUser) {
      return Response.json({ success: false, message: "User not found." }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: `Confessions Board ${isPublicBoard ? "enabled" : "disabled"}.`,
      isPublicBoard: updatedUser.isPublicBoard,
    });
  } catch (error) {
    console.error("Toggle public board error:", error);
    return Response.json({ success: false, message: "Error updating board setting." }, { status: 500 });
  }
}
