import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { User } from "next-auth";
import { encrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user: User = session?.user as User;

  if (!session || !session.user) {
    return Response.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  if (user.role === "super-admin") {
    return Response.json({
      success: true,
      message: "Bio updated successfully (Admins cannot have a public bio).",
    }, { status: 200 });
  }

  try {
    const { bio } = await request.json();

    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      { bio: bio ? encrypt(bio) : "" },
      { new: true }
    );

    if (!updatedUser) {
      return Response.json({ success: false, message: "User not found." }, { status: 404 });
    }

    return Response.json({ success: true, message: "Bio updated successfully." }, { status: 200 });
  } catch (error) {
    console.error("Update bio error:", error);
    return Response.json({ success: false, message: "Error updating bio." }, { status: 500 });
  }
}
