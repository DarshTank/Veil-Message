import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { username, otp, newPassword } = await request.json();

    if (!username || !otp || !newPassword) {
      return Response.json(
        { success: false, message: "Username, OTP, and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { success: false, message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({ username, isVerified: true });
    if (!user) {
      return Response.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const isCodeNotExpired = new Date(user.verifyCodeExpiry) > new Date();
    const isCodeValid = await bcrypt.compare(otp, user.verifyCode);

    if (!isCodeValid || !isCodeNotExpired) {
      return Response.json(
        { success: false, message: "Invalid or expired reset code." },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.verifyCode = ""; // Clear OTP
    await user.save();

    return Response.json({ success: true, message: "Password reset successfully." }, { status: 200 });
  } catch (error) {
    console.error("Reset password error:", error);
    return Response.json({ success: false, message: "Error resetting password." }, { status: 500 });
  }
}
