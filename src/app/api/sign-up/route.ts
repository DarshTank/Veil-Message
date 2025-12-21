import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import { NextResponse } from "next/server";

import { signUpSchema } from "@/schemas/signUpSchema";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const result = signUpSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.format();
      console.log("Sign-up validation failed:", errors);
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors,
        },
        { status: 400 }
      );
    }

    const { username, email, password } = result.data;
    console.log("Processing sign-up for:", { username, email });

    // Check if a verified user exists by username
    const existingUserVerifiedByUsername = await UserModel.findOne({
      username,
      isVerified: true,
    });
    if (existingUserVerifiedByUsername) {
      console.log("Username already taken (verified):", username);
      return NextResponse.json(
        { success: false, message: "User already exists with that username" },
        { status: 400 }
      );
    }

    // Check if a user exists by email
    const existingUser = await UserModel.findOne({ email });
    // Generate a 6-digit verification code
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (existingUser) {
      // If the user exists and is already verified, return an error
      if (existingUser.isVerified) {
        console.log("Email already taken (verified):", email);
        return NextResponse.json(
          { success: false, message: "User already exists with that email" },
          { status: 400 }
        );
      } else {
        // User exists but is not verified; update their password and verification details
        const hashedPassword = await bcrypt.hash(password, 10);
        existingUser.password = hashedPassword;
        existingUser.verifyCode = verifyCode;
        existingUser.verifyCodeExpiry = new Date(Date.now() + 3600000); // 1 hour expiry
        await existingUser.save();
      }
    } else {
      // Create a new user if one doesn't already exist
      const hashedPassword = await bcrypt.hash(password, 10);
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);

      const newUser = new UserModel({
        username,
        email,
        password: hashedPassword,
        verifyCode,
        verifyCodeExpiry: expiryDate,
        isVerified: false,
        isAcceptingMessage: true,
        messages: [],
      });

      await newUser.save();
    }

    // Send verification email
    const emailResponse = await sendVerificationEmail(
      email,
      username,
      verifyCode
    );
    if (!emailResponse.Success) {
      return NextResponse.json(
        {
          success: false,
          message: emailResponse.message || "Failed to send verification email",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully. Please verify your email.",
      },
      { status: 201 }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error Registering User:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        {
          success: false,
          message: `${field === "username" ? "Username" : "Email"} is already taken`,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: "Error Registering User",
      },
      { status: 500 }
    );
  }
}
