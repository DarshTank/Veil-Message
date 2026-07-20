import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { User } from "next-auth";
import mongoose from "mongoose";

export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);

  const user: User = session?.user as User;

  if (!session || !session.user || !user._id || !mongoose.Types.ObjectId.isValid(user._id as string)) {
    return Response.json(
      {
        success: false,
        message: "Not Authenticated : accept-messages",
      },
      { status: 401 }
    );
  }

  const userID = user._id;

  if (user.role === "super-admin") {
    return Response.json(
      {
        success: true,
        message: "Message Acceptance status updated successfully (Admins cannot accept messages).",
        updatedUser: { isAcceptingMessage: false }
      },
      { status: 200 }
    );
  }

  const { acceptMessages } = await request.json();

  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      userID,
      {
        isAcceptingMessage: acceptMessages,
      },
      { new: true }
    );

    if (!updatedUser) {
      return Response.json(
        {
          success: false,
          message:
            "Fail to update user status to accept messages : accept-messages",
        },
        { status: 401 }
      );
    }

    return Response.json(
      {
        success: true,
        message:
          "Message Acceptance status updated sucessfully : accept-messages",
        updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(
      "Fail to update user status to accept messages : accept-messages",
      error
    );
    return Response.json(
      {
        success: false,
        message:
          "Fail to update user status to accept messages : accept-messages",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  await dbConnect();

  const session = await getServerSession(authOptions);

  const user: User = session?.user as User;

  if (!session || !session.user || !user._id || !mongoose.Types.ObjectId.isValid(user._id as string)) {
    return Response.json(
      {
        success: false,
        message: "Not Authenticated : accept-messages",
      },
      { status: 401 }
    );
  }

  const userID = user._id;

  if (user.role === "super-admin") {
    return Response.json(
      {
        success: true,
        isAcceptingMessage: false,
        isAcceptingMessages: false,
      },
      { status: 200 }
    );
  }

  try {
    const foundUser = await UserModel.findById(userID);

    if (!foundUser) {
      return Response.json(
        {
          success: false,
          message: "User not found : accept-messages",
        },
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: true,
        // Return both forms for compatibility
        isAcceptingMessage: foundUser.isAcceptingMessage,
        isAcceptingMessages: foundUser.isAcceptingMessage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(
      "Error in getting message acceptance status : accept-messages",
      error
    );
    return Response.json(
      {
        success: false,
        message: "Error in getting message acceptance status : accept-messages",
      },
      { status: 500 }
    );
  }
}
