import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { User } from "next-auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user: User = session?.user as User;

  if (!session || !session.user) {
    return Response.json(
      {
        success: false,
        message: "Not Authenticated",
      },
      { status: 401 }
    );
  }

  try {
    const { otp, field, value } = await request.json();

    const dbUser = await UserModel.findById(user._id);
    if (!dbUser) {
      return Response.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // Verify OTP
    const isCodeValid = dbUser.verifyCode === otp;
    const isCodeNotExpired = new Date(dbUser.verifyCodeExpiry) > new Date();

    if (!isCodeValid || !isCodeNotExpired) {
      return Response.json(
        {
          success: false,
          message: "Invalid or expired OTP",
        },
        { status: 400 }
      );
    }

    // Update Field
    if (field === "username") {
      const existingUser = await UserModel.findOne({ username: value });
      if (existingUser) {
        return Response.json(
          { success: false, message: "Username already taken" },
          { status: 400 }
        );
      }
      dbUser.username = value;
    } else if (field === "email") {
        const existingUser = await UserModel.findOne({ email: value });
        if (existingUser) {
          return Response.json(
            { success: false, message: "Email already taken" },
            { status: 400 }
          );
        }
      dbUser.email = value;
    } else if (field === "password") {
      const hashedPassword = await bcrypt.hash(value, 10);
      dbUser.password = hashedPassword;
    } else {
      return Response.json(
        { success: false, message: "Invalid field" },
        { status: 400 }
      );
    }

    // Clear OTP
    // dbUser.verifyCode = ""; // Optional: Clear OTP after use
    // dbUser.verifyCodeExpiry = new Date();

    await dbUser.save();

    return Response.json(
      {
        success: true,
        message: `${field} updated successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating account", error);
    return Response.json(
      {
        success: false,
        message: "Error updating account",
      },
      { status: 500 }
    );
  }
}
