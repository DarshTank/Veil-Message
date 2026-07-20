import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { User } from "next-auth";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import bcrypt from "bcryptjs";
import { decrypt } from "@/lib/encryption";

export async function POST() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user: User = session?.user as User;

  if (!session || !session.user) {
    return Response.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  if (user.role === "super-admin") {
    return Response.json({
      success: false,
      message: "Administrators cannot change account details from the user dashboard.",
    }, { status: 403 });
  }

  try {
    const dbUser = await UserModel.findById(user._id);
    if (!dbUser) {
      return Response.json({ success: false, message: "User not found." }, { status: 404 });
    }

    if (dbUser.authProvider === "google" && !dbUser.password) {
      return Response.json(
        { success: false, message: "Please complete your account setup first to use this feature." },
        { status: 400 }
      );
    }

    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(plainOtp, 10);

    dbUser.verifyCode = hashedOtp;
    dbUser.verifyCodeExpiry = new Date(Date.now() + 3600000);
    await dbUser.save();

    // Decrypt email to send to
    const plainEmail = decrypt(dbUser.email);
    const emailResponse = await sendVerificationEmail(plainEmail, dbUser.username, plainOtp);

    if (!emailResponse.Success) {
      return Response.json({ success: false, message: "Failed to send OTP email." }, { status: 500 });
    }

    return Response.json({ success: true, message: "OTP sent to your email." }, { status: 200 });
  } catch (error) {
    console.error("Send OTP error:", error);
    return Response.json({ success: false, message: "Error sending OTP." }, { status: 500 });
  }
}

