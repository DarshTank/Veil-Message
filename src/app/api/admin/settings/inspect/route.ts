import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import SystemSettingModel from "@/model/SystemSetting.model";

// GET /api/admin/settings/inspect - Get current inspect protection state
export async function GET() {
  await dbConnect();
  try {
    const setting = await SystemSettingModel.findOne({ key: "inspectProtection" });
    return NextResponse.json({
      success: true,
      inspectProtectionEnabled: setting ? Boolean(setting.value) : false,
    });
  } catch (error) {
    console.error("Error fetching inspect protection setting:", error);
    return NextResponse.json(
      { success: false, inspectProtectionEnabled: false },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/inspect - Toggle inspect protection setting (Admin only)
export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "super-admin") {
    return NextResponse.json(
      { success: false, message: "Unauthorized. Super Admin access required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { enabled } = body;

    const updatedSetting = await SystemSettingModel.findOneAndUpdate(
      { key: "inspectProtection" },
      { value: Boolean(enabled) },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      inspectProtectionEnabled: Boolean(updatedSetting.value),
      message: `Inspect & Right-click protection ${
        updatedSetting.value ? "enabled" : "disabled"
      } successfully.`,
    });
  } catch (error) {
    console.error("Error updating inspect protection setting:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
