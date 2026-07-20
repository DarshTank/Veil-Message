import dbConnect from "@/lib/dbConnect";
import UserReportModel from "@/model/UserReport.model";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return Response.json(
      { success: false, message: "Forbidden. Admin access required." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const { action, adminNotes } = await request.json();

    const report = await UserReportModel.findById(id);
    if (!report) {
      return Response.json(
        { success: false, message: "Report not found." },
        { status: 404 }
      );
    }

    if (action === "dismiss") {
      report.status = "dismissed";
    } else if (action === "resolve") {
      report.status = "resolved";
    } else if (action === "review") {
      report.status = "reviewed";
    } else {
      return Response.json(
        { success: false, message: "Invalid action." },
        { status: 400 }
      );
    }

    if (adminNotes && typeof adminNotes === "string") {
      report.adminNotes = adminNotes;
    }

    await report.save();

    return Response.json({
      success: true,
      message: `Report marked as ${report.status}.`,
      report,
    });
  } catch (error) {
    console.error("Error updating user report:", error);
    return Response.json(
      { success: false, message: "Failed to update report status." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return Response.json(
      { success: false, message: "Forbidden. Admin access required." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const report = await UserReportModel.findByIdAndDelete(id);

    if (!report) {
      return Response.json(
        { success: false, message: "Report not found." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Report deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting user report:", error);
    return Response.json(
      { success: false, message: "Failed to delete report." },
      { status: 500 }
    );
  }
}
