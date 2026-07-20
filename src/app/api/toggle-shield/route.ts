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
      message: "AI Shield setting is disabled for administrators.",
      isShieldEnabled: false,
    });
  }

  try {
    const { isShieldEnabled } = await request.json();

    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      { isShieldEnabled: Boolean(isShieldEnabled) },
      { new: true }
    );

    if (!updatedUser) {
      return Response.json({ success: false, message: "User not found." }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: `AI Shield ${isShieldEnabled ? "enabled" : "disabled"}.`,
      isShieldEnabled: updatedUser.isShieldEnabled,
    });
  } catch (error) {
    console.error("Toggle shield error:", error);
    return Response.json({ success: false, message: "Error updating shield setting." }, { status: 500 });
  }
}
