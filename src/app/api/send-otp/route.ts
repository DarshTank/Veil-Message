import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { User } from "next-auth";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request) {
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

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verifyCodeExpiry = new Date(Date.now() + 3600000); // 1 hour

    dbUser.verifyCode = verifyCode;
    dbUser.verifyCodeExpiry = verifyCodeExpiry;
    await dbUser.save();

    // Send email
    const emailResponse = await sendVerificationEmail(
      dbUser.email,
      dbUser.username,
      verifyCode
    );

    if (!emailResponse.Success) {
      return Response.json(
        {
          success: false,
          message: emailResponse.message,
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "OTP sent successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending OTP", error);
    return Response.json(
      {
        success: false,
        message: "Error sending OTP",
      },
      { status: 500 }
    );
  }
}
