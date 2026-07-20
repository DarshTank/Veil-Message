import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { username, verifyCode } = await request.json();

    if (!username || !verifyCode) {
      return Response.json(
        { success: false, message: "Username and verification code are required." },
        { status: 400 }
      );
    }

    const decodedUsername = decodeURIComponent(username).trim();
    const cleanVerifyCode = verifyCode.toString().trim();

    // Case-insensitive user lookup
    const user = await UserModel.findOne({
      username: { $regex: new RegExp(`^${decodedUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (!user) {
      return Response.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return Response.json(
        { success: true, message: "Account is already verified. Please sign in." },
        { status: 200 }
      );
    }

    const isCodeNotExpired = new Date(user.verifyCodeExpiry) > new Date();
    if (!isCodeNotExpired) {
      return Response.json(
        { success: false, message: "Verification code has expired. Please click 'Resend Code' to get a new code." },
        { status: 400 }
      );
    }

    // Compare submitted OTP against stored bcrypt hash
    const isCodeValid = await bcrypt.compare(cleanVerifyCode, user.verifyCode);
    if (!isCodeValid) {
      return Response.json(
        { success: false, message: "Incorrect verification code." },
        { status: 400 }
      );
    }

    user.isVerified = true;
    user.verifyCode = ""; // Clear OTP after successful verification
    await user.save();

    return Response.json(
      { success: true, message: "Account verified successfully! You can now sign in." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verify-code error:", error);
    return Response.json(
      { success: false, message: "An unexpected error occurred during verification." },
      { status: 500 }
    );
  }
}
