import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { decrypt } from "@/lib/encryption";

export async function GET(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super-admin") {
    return Response.json({ success: false, message: "Forbidden." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = 20;
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") ?? "";
    const filterStatus = searchParams.get("status"); // active | suspended | banned
    const filterFlagged = searchParams.get("flagged") === "true";

    const query: Record<string, unknown> = {};
    if (search) {
      query.username = { $regex: search, $options: "i" };
    }
    if (filterStatus) {
      query.status = filterStatus;
    }
    if (filterFlagged) {
      query.isFlagged = true;
    }

    const [users, total, flaggedCount] = await Promise.all([
      UserModel.find(query)
        .select("username email role status suspendedUntil suspensionCount isFlagged flagReason toxicCount authProvider createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
      UserModel.countDocuments({ isFlagged: true }),
    ]);

    const safeUsers = (users as any[]).map((u) => ({
      _id: u._id,
      username: u.username,
      email: u.email ? decrypt(u.email as string) : "",
      role: u.role,
      status: u.status,
      suspendedUntil: u.suspendedUntil,
      suspensionCount: u.suspensionCount || 0,
      isFlagged: u.isFlagged,
      flagReason: u.flagReason,
      toxicCount: u.toxicCount,
      authProvider: u.authProvider,
      createdAt: u.createdAt,
    }));

    return Response.json({ success: true, users: safeUsers, total, flaggedCount, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin users list error:", error);
    return Response.json({ success: false, message: "Error fetching users." }, { status: 500 });
  }
}
