import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { User } from "next-auth";
import bcrypt from "bcryptjs";
import { encrypt, hashForLookup } from "@/lib/encryption";

export async function POST(request: Request) {
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
    const { otp, field, value } = await request.json();

    const dbUser = await UserModel.findById(user._id);
    if (!dbUser) {
      return Response.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Verify OTP (bcrypt compare)
    const isCodeNotExpired = new Date(dbUser.verifyCodeExpiry) > new Date();
    const isCodeValid = await bcrypt.compare(otp, dbUser.verifyCode);

    if (!isCodeValid || !isCodeNotExpired) {
      return Response.json({ success: false, message: "Invalid or expired OTP." }, { status: 400 });
    }

    if (field === "username") {
      const exists = await UserModel.findOne({ username: value });
      if (exists) {
        return Response.json({ success: false, message: "Username already taken." }, { status: 400 });
      }
      dbUser.username = value;
    } else if (field === "email") {
      const newEmailHash = hashForLookup(value);
      const exists = await UserModel.findOne({ emailHash: newEmailHash });
      if (exists) {
        return Response.json({ success: false, message: "Email already taken." }, { status: 400 });
      }
      dbUser.email = encrypt(value);
      dbUser.emailHash = newEmailHash;
    } else if (field === "password") {
      dbUser.password = await bcrypt.hash(value, 10);
    } else {
      return Response.json({ success: false, message: "Invalid field." }, { status: 400 });
    }

    // Clear OTP after successful use
    dbUser.verifyCode = "";
    await dbUser.save();

    return Response.json(
      { success: true, message: `${field} updated successfully.` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update account error:", error);
    return Response.json({ success: false, message: "Error updating account." }, { status: 500 });
  }
}
