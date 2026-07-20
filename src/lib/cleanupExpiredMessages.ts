import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import ChatMessageModel from "@/model/ChatMessage.model";
import ConfessionModel from "@/model/Confession.model";
import { deleteAudioBlobs } from "@/lib/deleteAudioBlob";

/**
 * Purges all direct chat messages, public anonymous messages, and voice notes
 * older than 24 hours (86,400,000 ms) directly from MongoDB and Vercel Blob storage.
 */
export async function cleanupExpiredMessages(): Promise<{ deletedUserMessages: number; deletedChatMessages: number; deletedConfessions?: number }> {
  await dbConnect();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // 1. Find all expired voice notes in User embedded messages to delete from Vercel Blob storage
    const usersWithExpiredVoiceNotes = await UserModel.find(
      { "messages.createdAt": { $lt: twentyFourHoursAgo }, "messages.audioUrl": { $ne: "" } },
      { "messages": 1 }
    );

    const audioUrlsToDelete: string[] = [];
    for (const user of usersWithExpiredVoiceNotes) {
      if (user.messages && Array.isArray(user.messages)) {
        for (const msg of user.messages) {
          if (msg.createdAt && new Date(msg.createdAt) < twentyFourHoursAgo && msg.audioUrl) {
            audioUrlsToDelete.push(msg.audioUrl);
          }
        }
      }
    }

    if (audioUrlsToDelete.length > 0) {
      await deleteAudioBlobs(audioUrlsToDelete);
    }

    // 2. Pull expired public messages & voice notes from all User embedded message arrays
    const userUpdateResult = await UserModel.updateMany(
      { "messages.createdAt": { $lt: twentyFourHoursAgo } },
      { $pull: { messages: { createdAt: { $lt: twentyFourHoursAgo } } } }
    );

    // 3. Delete expired direct chat messages from ChatMessage collection
    const chatDeleteResult = await ChatMessageModel.deleteMany({
      createdAt: { $lt: twentyFourHoursAgo },
    });

    // 4. Delete expired confessions from Confession collection
    const confessionDeleteResult = await ConfessionModel.deleteMany({
      createdAt: { $lt: twentyFourHoursAgo },
    });

    return {
      deletedUserMessages: userUpdateResult.modifiedCount || 0,
      deletedChatMessages: chatDeleteResult.deletedCount || 0,
      deletedConfessions: confessionDeleteResult.deletedCount || 0,
    };
  } catch (error) {
    console.error("Error running cleanupExpiredMessages:", error);
    return { deletedUserMessages: 0, deletedChatMessages: 0, deletedConfessions: 0 };
  }
}

