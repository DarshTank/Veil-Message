import dbConnect from "@/lib/dbConnect";
import UserReportModel from "@/model/UserReport.model";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return Response.json(
      { success: false, message: "Forbidden. Admin access required." },
      { status: 403 }
    );
  }

  try {
    const reports = await UserReportModel.find()
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Error fetching user reports:", error);
    return Response.json(
      { success: false, message: "Error fetching user reports." },
      { status: 500 }
    );
  }
}
