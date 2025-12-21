// import { getServerSession } from "next-auth";
// import { authOptions } from "../auth/[...nextauth]/options";
// import dbConnect from "@/lib/dbConnect";
// import UserModel from "@/model/User.model";
// import { User } from "next-auth";
// import mongoose from "mongoose";

// export async function GET(request: Request) {
//   await dbConnect();
//   const session = await getServerSession(authOptions);

//   const user: User = session?.user as User;
//   //   const user = session?.user;

//   if (!session || !session.user) {
//     return Response.json(
//       {
//         success: false,
//         message: "Not Auhenticated : get-messages",
//       },
//       { status: 401 }
//     );
//   }

//   const userID = new mongoose.Types.ObjectId(user._id as string | undefined);
//   //   const userId = session.user._id as string | undefined;

//   try {
//     const user = await UserModel.aggregate([
//       { $match: { id: userID } },
//       { $unwind: "$messages" },
//       { $sort: { "messages.createdAt": -1 } },
//       { $group: { _id: "$_id", messages: { $push: "$messages" } } },
//     ]);

//     if (!user || user.length === 0) {
//       return Response.json(
//         {
//           success: false,
//           message: "User not found : get-messages",
//         },
//         { status: 401 }
//       );
//     }

//     return Response.json(
//       {
//         success: true,
//         messages: user[0].messages,
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.log("An unexpexted error occured : get-message", error);
//     return Response.json(
//       {
//         success: false,
//         message: "Error : get-messages",
//       },
//       { status: 500 }
//     );
//   }
// }

import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import mongoose from "mongoose";
import { User } from "next-auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/options";

export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const user: User = session?.user as User;

  if (!session || !user) {
    return Response.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );
  }
  const userID = new mongoose.Types.ObjectId(user._id as string | undefined);
  try {
    const user = await UserModel.aggregate([
      { $match: { _id: userID } },
      { $unwind: "$messages" },
      { $sort: { "messages.createdAt": -1 } },
      { $group: { _id: "$_id", messages: { $push: "$messages" } } },
    ]).exec();

    if (!user || user.length === 0) {
      return Response.json(
        { message: "User not found", success: false },
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: true,
        messages: user[0].messages,
      },
      { status: 200 }
    );
    console.log(user[0].messages);
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    return Response.json(
      { message: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
