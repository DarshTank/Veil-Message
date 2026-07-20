import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import { decrypt } from "@/lib/encryption";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { username } = await request.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { success: false, message: "Username is required." },
        { status: 400 }
      );
    }

    const decodedUsername = decodeURIComponent(username).trim();

    // Case-insensitive user lookup
    const user = await UserModel.findOne({
      username: { $regex: new RegExp(`^${decodedUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { success: true, message: "Account is already verified. Please sign in." },
        { status: 200 }
      );
    }

    // Generate fresh 6-digit OTP
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(plainOtp, 10);
    const otpExpiry = new Date(Date.now() + 3600000); // 1 hour

    user.verifyCode = hashedOtp;
    user.verifyCodeExpiry = otpExpiry;
    await user.save();

    // Decrypt user email and send verification email
    const plainEmail = decrypt(user.email);
    const emailResponse = await sendVerificationEmail(plainEmail, user.username, plainOtp);

    if (!emailResponse.Success) {
      return NextResponse.json(
        { success: false, message: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "A new 6-digit verification code has been sent to your email." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Resend verification code error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error while resending verification code." },
      { status: 500 }
    );
  }
}
