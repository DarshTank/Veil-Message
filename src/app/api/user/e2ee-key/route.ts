import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";

export async function GET() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  try {
    const user = await UserModel.findById(session.user._id).select("publicKey encryptedPrivateKey");
    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found.",
        publicKey: null,
        encryptedPrivateKey: null,
      });
    }

    return NextResponse.json({
      success: true,
      publicKey: user.publicKey || null,
      encryptedPrivateKey: user.encryptedPrivateKey || null,
    });
  } catch (error) {
    console.error("Error in GET /api/user/e2ee-key:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  try {
    const { publicKey, encryptedPrivateKey } = await request.json();

    if (!publicKey || !encryptedPrivateKey) {
      return NextResponse.json(
        { success: false, message: "Missing required key fields." },
        { status: 400 }
      );
    }

    const user = await UserModel.findById(session.user._id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    user.publicKey = publicKey;
    user.encryptedPrivateKey = encryptedPrivateKey;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "E2EE keys registered successfully.",
    });
  } catch (error) {
    console.error("Error in POST /api/user/e2ee-key:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
