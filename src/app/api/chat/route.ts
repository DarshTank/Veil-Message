import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import ConnectionModel from "@/model/Connection.model";
import ChatMessageModel from "@/model/ChatMessage.model";
import { decrypt } from "@/lib/encryption";
import mongoose from "mongoose";

/**
 * GET /api/chat
 * Returns all active connections with:
 * - Partner username and bio
 * - Last message content + timestamp
 * - Unread count per room
 * - Online status of partner
 */
export async function GET() {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  const userId = new mongoose.Types.ObjectId(session.user._id);

  try {
    // Fetch all active connections for this user
    const connections = await ConnectionModel.find({
      userId,
      status: "connected",
    })
      .populate("connectedUserId", "username bio")
      .populate("chatRoomId")
      .sort({ updatedAt: -1 });

    // Build the chat list with last message and unread counts
    const chatList = await Promise.all(
      connections.map(async (conn) => {
        const partner = conn.connectedUserId as unknown as {
          _id?: mongoose.Types.ObjectId;
          username?: string;
          bio?: string;
        } | null;
        const room = conn.chatRoomId as unknown as {
          _id?: mongoose.Types.ObjectId;
          status?: string;
          lastReadAt?: Map<string, Date>;
          lastActiveAt?: Map<string, Date>;
          roomKeys?: { userId: mongoose.Types.ObjectId; encryptedKey: string }[];
        } | null;

        const roomId = room?._id;
        const roomIdStr = roomId?.toString() || "";

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Get last message for this chat room (within 24 hours)
        let lastMessage = null;
        if (roomId) {
          interface PopulatedMessage {
            _id: mongoose.Types.ObjectId;
            content: string;
            createdAt: Date;
            senderId: {
              _id: mongoose.Types.ObjectId;
              username: string;
            } | null;
          }

          const lastMsg = (await ChatMessageModel.findOne({
            chatRoomId: roomId,
            createdAt: { $gt: twentyFourHoursAgo },
          })
            .sort({ createdAt: -1 })
            .populate("senderId", "username")
            .lean()) as PopulatedMessage | null;

          if (lastMsg) {
            const sender = lastMsg.senderId;
            const isEncrypted = lastMsg.content.startsWith('{"ciphertext":');
            lastMessage = {
              content: isEncrypted || lastMsg.content.length <= 80
                ? lastMsg.content
                : lastMsg.content.substring(0, 80) + "…",
              timestamp: lastMsg.createdAt.toISOString(),
              isMe: sender?._id?.toString() === userId.toString(),
              senderUsername: sender?.username || "",
            };
          }
        }

        // Calculate unread count
        let unreadCount = 0;
        if (roomId && room?.lastReadAt) {
          const myLastRead = room.lastReadAt.get(userId.toString());
          if (myLastRead) {
            unreadCount = await ChatMessageModel.countDocuments({
              chatRoomId: roomId,
              createdAt: { $gt: new Date(Math.max(new Date(myLastRead).getTime(), twentyFourHoursAgo.getTime())) },
              senderId: { $ne: userId },
            });
          } else {
            // Never read — count all messages from partner
            unreadCount = await ChatMessageModel.countDocuments({
              chatRoomId: roomId,
              createdAt: { $gt: twentyFourHoursAgo },
              senderId: { $ne: userId },
            });
          }
        }

        // Check online status
        const partnerIdStr = partner?._id?.toString();
        const partnerLastActiveAt =
          partnerIdStr && room?.lastActiveAt
            ? room.lastActiveAt.get(partnerIdStr)
            : null;
        const isOnline =
          partnerLastActiveAt &&
          Date.now() - new Date(partnerLastActiveAt).getTime() < 6000;

        // Get current user's encrypted room key
        const myRoomKey = room?.roomKeys?.find(
          (k) => k.userId.toString() === userId.toString()
        )?.encryptedKey || null;

        return {
          _id: conn._id.toString(),
          chatRoomId: roomIdStr,
          isArchived: room?.status === "archived",
          partner: {
            _id: partner?._id?.toString() || "",
            username: partner?.username || "",
            bio: partner ? decrypt(partner.bio || "") : "",
          },
          lastMessage,
          unreadCount,
          isOnline: !!isOnline,
          connectedAt: conn.createdAt,
          myRoomKey,
        };
      })
    );

    // Sort: unread first, then by last message time, then by connection date
    chatList.sort((a, b) => {
      // Unread chats first
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;

      // Then by last message timestamp (most recent first)
      const aTime = a.lastMessage?.timestamp
        ? new Date(a.lastMessage.timestamp).getTime()
        : 0;
      const bTime = b.lastMessage?.timestamp
        ? new Date(b.lastMessage.timestamp).getTime()
        : 0;
      if (aTime !== bTime) return bTime - aTime;

      // Finally by connection date
      return (
        new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
      );
    });

    return NextResponse.json({
      success: true,
      chats: chatList,
    });
  } catch (error) {
    console.error("Error in GET /api/chat:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
