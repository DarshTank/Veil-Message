import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import { NextResponse } from "next/server";
import { signUpSchema } from "@/schemas/signUpSchema";
import { encrypt, hashForLookup } from "@/lib/encryption";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const result = signUpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: result.error.format() },
        { status: 400 }
      );
    }

    const { username, email, password } = result.data;
    const emailHash = hashForLookup(email);
    const encryptedEmail = encrypt(email);

    // Check verified username conflict
    const existingByUsername = await UserModel.findOne({ username, isVerified: true });
    if (existingByUsername) {
      return NextResponse.json(
        { success: false, message: "Username is already taken." },
        { status: 400 }
      );
    }

    // Check email conflict (by hash for security)
    const existingByEmail = await UserModel.findOne({ emailHash });

    // Generate OTP and hash it
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(plainOtp, 10);
    const otpExpiry = new Date(Date.now() + 3600000); // 1 hour

    if (existingByEmail) {
      if (existingByEmail.isVerified) {
        return NextResponse.json(
          { success: false, message: "An account with that email already exists." },
          { status: 400 }
        );
      }
      // Unverified → refresh their OTP
      const hashedPassword = await bcrypt.hash(password, 10);
      existingByEmail.password = hashedPassword;
      existingByEmail.verifyCode = hashedOtp;
      existingByEmail.verifyCodeExpiry = otpExpiry;
      await existingByEmail.save();
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      await UserModel.create({
        username,
        email: encryptedEmail,
        emailHash,
        password: hashedPassword,
        verifyCode: hashedOtp,
        verifyCodeExpiry: otpExpiry,
        isVerified: false,
        isAcceptingMessage: true,
        authProvider: "credentials",
        role: "user",
        status: "active",
        isAccountSetupCompleted: false,
        messages: [],
      });
    }

    // Send the plaintext OTP via email
    const emailResponse = await sendVerificationEmail(email, username, plainOtp);
    if (!emailResponse.Success) {
      return NextResponse.json(
        { success: false, message: "Failed to send verification email." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Account created. Please verify your email." },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Sign-up error:", error);
    const mongoErr = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoErr.code === 11000) {
      const field = Object.keys(mongoErr.keyPattern ?? {})[0];
      return NextResponse.json(
        { success: false, message: `${field === "username" ? "Username" : "Email"} is already taken.` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
