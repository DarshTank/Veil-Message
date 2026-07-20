import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";
import { decrypt } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/users/[id] — detailed user view with messages
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const user = (await UserModel.findById(id).lean()) as any;
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const decryptedMessages = (user.messages ?? []).map((msg: any) => ({
      ...msg,
      content: decrypt(msg.content as string),
      tenderized: msg.tenderized ? decrypt(msg.tenderized as string) : "",
    }));

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: decrypt(user.email as string),
        role: user.role,
        status: user.status,
        isFlagged: user.isFlagged,
        flagReason: user.flagReason,
        toxicCount: user.toxicCount,
        isVerified: user.isVerified,
        authProvider: user.authProvider,
        createdAt: (user as unknown as { createdAt?: Date }).createdAt,
        messageCount: user.messages?.length ?? 0,
        messages: decryptedMessages,
      },
    });
  } catch (error) {
    console.error("Admin user detail error:", error);
    return NextResponse.json({ success: false, message: "Error fetching user." }, { status: 500 });
  }
}

// POST /api/admin/users/[id] — actions: suspend | ban | unflag | unsuspend
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const { action, reason } = await request.json();
    const validActions = ["suspend", "ban", "unsuspend", "unflag"];

    if (!validActions.includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
    }

    // Prevent self-action
    if (id === session.user._id) {
      return NextResponse.json(
        { success: false, message: "You cannot perform this action on your own account." },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};

    switch (action) {
      case "suspend":
        update.status = "suspended";
        update.flagReason = reason ?? "Suspended by admin";
        break;
      case "ban":
        update.status = "banned";
        update.flagReason = reason ?? "Banned by admin";
        break;
      case "unsuspend":
        update.status = "active";
        update.suspendedUntil = null;
        break;
      case "unflag":
        update.isFlagged = false;
        update.flagReason = "";
        break;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(id, update, { new: true });
    if (!updatedUser) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Action "${action}" applied successfully.` });
  } catch (error) {
    console.error("Admin user action error:", error);
    return NextResponse.json({ success: false, message: "Error performing action." }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] — hard delete user
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    if (id === session.user._id) {
      return NextResponse.json(
        { success: false, message: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const deleted = await UserModel.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User deleted permanently." });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json({ success: false, message: "Error deleting user." }, { status: 500 });
  }
}
