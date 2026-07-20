import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { hashForLookup, decrypt } from "@/lib/encryption";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return Response.json({ success: false, message: "Email is required." }, { status: 400 });
    }

    const emailHash = hashForLookup(email);
    const user = await UserModel.findOne({ emailHash, isVerified: true });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return Response.json(
        { success: true, message: "If that email exists, a reset code has been sent." },
        { status: 200 }
      );
    }

    if (user.authProvider === "google") {
      return Response.json(
        { success: false, message: "This account uses Google Sign-In. No password to reset." },
        { status: 400 }
      );
    }

    if (user.status === "suspended" || user.status === "banned") {
      return Response.json(
        { success: false, message: "Account is not available." },
        { status: 403 }
      );
    }

    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(plainOtp, 10);

    user.verifyCode = hashedOtp;
    user.verifyCodeExpiry = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    const plainEmail = decrypt(user.email);
    await sendVerificationEmail(plainEmail, user.username, plainOtp);

    return Response.json(
      { success: true, message: "If that email exists, a reset code has been sent.", username: user.username },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return Response.json({ success: false, message: "Error processing request." }, { status: 500 });
  }
}
