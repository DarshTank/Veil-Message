import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import bcrypt from "bcryptjs";
import { usernameValidation } from "@/schemas/signUpSchema";

export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return Response.json(
      {
        success: false,
        message: "Not authenticated.",
      },
      { status: 401 }
    );
  }

  try {
    const dbUser = await UserModel.findById(session.user._id);

    if (!dbUser) {
      return Response.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 404 }
      );
    }

    const { username, password, chatProtectionPassword } = await request.json();

    // Chat protection password is required for all users
    if (!chatProtectionPassword || typeof chatProtectionPassword !== "string" || chatProtectionPassword.length < 4) {
      return Response.json(
        {
          success: false,
          message: "Chat protection password must be at least 4 characters long.",
        },
        { status: 400 }
      );
    }

    // Google OAuth users need to set username and account password as well
    if (dbUser.authProvider === "google") {
      const usernameResult = usernameValidation.safeParse(username);
      if (!usernameResult.success) {
        return Response.json(
          {
            success: false,
            message: usernameResult.error.errors[0]?.message || "Invalid username.",
          },
          { status: 400 }
        );
      }

      if (!password || typeof password !== "string" || password.length < 6) {
        return Response.json(
          {
            success: false,
            message: "Account password must be at least 6 characters long.",
          },
          { status: 400 }
        );
      }

      // Check if username is taken by another user
      const existingUser = await UserModel.findOne({ username });
      if (existingUser && existingUser._id.toString() !== dbUser._id.toString()) {
        return Response.json(
          {
            success: false,
            message: "Username is already taken.",
          },
          { status: 400 }
        );
      }

      const salt = await bcrypt.genSalt(10);
      dbUser.password = await bcrypt.hash(password, salt);
      dbUser.username = username;
    }

    dbUser.isAccountSetupCompleted = true;
    await dbUser.save();

    return Response.json(
      {
        success: true,
        message: "Account setup successfully completed.",
        user: {
          username: dbUser.username,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error setting up account:", error);
    return Response.json(
      {
        success: false,
        message: error.message || "An unexpected error occurred during account setup.",
      },
      { status: 500 }
    );
  }
}
