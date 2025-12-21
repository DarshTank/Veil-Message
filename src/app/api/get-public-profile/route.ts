import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return Response.json(
        {
          success: false,
          message: "Username is required",
        },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({ username, isVerified: true });

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "User found",
        user: {
            username: user.username,
            bio: user.bio,
            isAcceptingMessage: user.isAcceptingMessage
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching public profile", error);
    return Response.json(
      {
        success: false,
        message: "Error fetching public profile",
      },
      { status: 500 }
    );
  }
}
