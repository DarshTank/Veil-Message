import dbConnect from "@/lib/dbConnect";
import ConfessionModel from "@/model/Confession.model";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!session || !user) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ success: false, message: "Content is required." }, { status: 400 });
    }

    const trimmed = content.trim();
    if (trimmed.length < 1) {
      return NextResponse.json({ success: false, message: "Confession content cannot be empty." }, { status: 400 });
    }
    if (trimmed.length > 500) {
      return NextResponse.json({ success: false, message: "Confession cannot exceed 500 characters." }, { status: 400 });
    }

    const confession = await ConfessionModel.findById(id);
    if (!confession) {
      return NextResponse.json({ success: false, message: "Confession not found." }, { status: 404 });
    }

    if (confession.username !== user.username) {
      return NextResponse.json({ success: false, message: "Forbidden: You do not own this confession." }, { status: 403 });
    }

    confession.content = trimmed;
    await confession.save();

    return NextResponse.json({ success: true, message: "Confession updated successfully!", confession });
  } catch (error) {
    console.error("Edit confession error:", error);
    return NextResponse.json({ success: false, message: "Error updating confession." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!session || !user) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    const { id } = await context.params;

    const confession = await ConfessionModel.findById(id);
    if (!confession) {
      return NextResponse.json({ success: false, message: "Confession not found." }, { status: 404 });
    }

    if (confession.username !== user.username) {
      return NextResponse.json({ success: false, message: "Forbidden: You do not own this confession." }, { status: 403 });
    }

    await ConfessionModel.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Confession deleted successfully!" });
  } catch (error) {
    console.error("Delete confession error:", error);
    return NextResponse.json({ success: false, message: "Error deleting confession." }, { status: 500 });
  }
}
