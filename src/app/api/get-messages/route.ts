import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import mongoose from "mongoose";
import { User } from "next-auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/options";
import { decrypt } from "@/lib/encryption";
import { Message } from "@/model/User.model";
import { deleteAudioBlobs } from "@/lib/deleteAudioBlob";

export async function GET() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user: User = session?.user as User;

  if (!session || !user || !user._id || !mongoose.Types.ObjectId.isValid(user._id as string)) {
    return Response.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  const userID = new mongoose.Types.ObjectId(user._id as string);

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find any expired voice notes for this user to purge from Vercel Blob
    const userDoc = await UserModel.findById(userID, { messages: 1 });
    if (userDoc && Array.isArray(userDoc.messages)) {
      const expiredAudioUrls = userDoc.messages
        .filter((m: Message) => m.createdAt && new Date(m.createdAt) < twentyFourHoursAgo && m.audioUrl)
        .map((m: Message) => m.audioUrl);
      if (expiredAudioUrls.length > 0) {
        await deleteAudioBlobs(expiredAudioUrls);
      }
    }

    // Prune messages older than 24 hours from the database to keep clean
    await UserModel.updateOne(
      { _id: userID },
      { $pull: { messages: { createdAt: { $lt: twentyFourHoursAgo } } } }
    );

    const result = await UserModel.aggregate([
      { $match: { _id: userID } },
      { $unwind: "$messages" },
      // Exclude already-burned messages, messages older than 24 hours, and quarantined messages
      { 
        $match: { 
          "messages.isOpened": { $ne: true },
          "messages.createdAt": { $gt: twentyFourHoursAgo },
          $or: [
            { "messages.deliveryStatus": "delivered" },
            { "messages.deliveryStatus": { $exists: false } },
            { "messages.deliveryStatus": null }
          ]
        } 
      },
      { $sort: { "messages.createdAt": -1 } },
      { $group: { _id: "$_id", messages: { $push: "$messages" } } },
    ]).exec();

    if (!result || result.length === 0) {
      // User exists but has no active messages — return empty array
      return Response.json({ success: true, messages: [] }, { status: 200 });
    }

    // Decrypt all encrypted fields before returning to client
    const decryptedMessages = (result[0].messages as Message[]).map((msg) => ({
      ...msg,
      content: decrypt(msg.content as string),
      tenderized: msg.tenderized ? decrypt(msg.tenderized as string) : "",
    }));

    return Response.json({ success: true, messages: decryptedMessages }, { status: 200 });
  } catch (error) {
    console.error("Get messages error:", error);
    return Response.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
