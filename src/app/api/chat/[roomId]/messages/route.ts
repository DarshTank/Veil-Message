import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import ChatRoomModel from "@/model/ChatRoom.model";
import ChatMessageModel from "@/model/ChatMessage.model";
import mongoose from "mongoose";

import { cleanupExpiredMessages } from "@/lib/cleanupExpiredMessages";

// GET handler
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  const userId = session.user._id;
  const { roomId } = await params;

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return NextResponse.json(
      { success: false, message: "Invalid room ID." },
      { status: 400 }
    );
  }

  try {
    // Purge expired direct chat messages & public messages (>24 hours) from DB
    await cleanupExpiredMessages();

    const room = await ChatRoomModel.findById(roomId).populate("participants", "username publicKey");
    if (!room) {
      return NextResponse.json(
        { success: false, message: "Chat room not found." },
        { status: 404 }
      );
    }

    const isParticipant = room.participants.some(
      (p: unknown) => (p as { _id: mongoose.Types.ObjectId })._id.toString() === userId
    );
    if (!isParticipant) {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    const partner = room.participants.find(
      (p: unknown) => (p as { _id: mongoose.Types.ObjectId })._id.toString() !== userId
    ) as unknown as { _id: mongoose.Types.ObjectId; username: string; publicKey?: string } | null;
    const partnerUsername = partner?.username || "Stranger";
    const partnerPublicKey = partner?.publicKey || null;

    await ChatRoomModel.findByIdAndUpdate(roomId, {
      $set: {
        [`lastActiveAt.${userId}`]: new Date(),
        [`lastReadAt.${userId}`]: new Date(),
      },
    });

    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const after = searchParams.get("after");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      50
    );

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const query: Record<string, unknown> = {
      chatRoomId: new mongoose.Types.ObjectId(roomId),
      createdAt: { $gt: twentyFourHoursAgo }
    };

    if (before) {
      const beforeDate = new Date(before);
      if (beforeDate > twentyFourHoursAgo) {
        query.createdAt = { $lt: beforeDate, $gt: twentyFourHoursAgo };
      } else {
        return NextResponse.json({
          success: true,
          messages: [],
          hasMore: false,
          isArchived: room.status === "archived",
          partnerUsername,
          partnerPublicKey,
          partnerLastReadAt: null,
          partnerStatus: "",
          activeMessageIds: [],
          roomKeys: room.roomKeys || [],
        });
      }
    } else if (after) {
      const afterDate = new Date(after);
      const effectiveAfter = afterDate > twentyFourHoursAgo ? afterDate : twentyFourHoursAgo;
      query.createdAt = { $gt: effectiveAfter };
    }

    const sortOrder = after ? 1 : -1;

    const messagesQuery = ChatMessageModel.find(query)
      .sort({ createdAt: sortOrder })
      .populate("senderId", "username");

    if (!after) {
      messagesQuery.limit(limit);
    }

    const messages = await messagesQuery;

    if (!after) {
      messages.reverse();
    }

    let hasMore = false;
    if (!after && messages.length > 0) {
      const oldestLoaded = messages[0].createdAt;
      const countRemaining = await ChatMessageModel.countDocuments({
        chatRoomId: new mongoose.Types.ObjectId(roomId),
        createdAt: { $lt: oldestLoaded, $gt: twentyFourHoursAgo },
      });
      hasMore = countRemaining > 0;
    }

    const processedMessages = messages.map((msg) => {
      const sender = msg.senderId as unknown as { _id?: mongoose.Types.ObjectId; username?: string } | null;
      return {
        _id: msg._id.toString(),
        sender: {
          _id: sender?._id?.toString() || "",
          username: sender?.username || "",
        },
        content: msg.content,
        tenderized: msg.tenderized || "",
        toxicityScore: msg.toxicityScore || 0,
        toxicityLevel: msg.toxicityLevel || "",
        mood: msg.mood || "",
        createdAt: msg.createdAt,
      };
    });

    const partnerId = partner?._id?.toString();
    
    // Fetch fresh room status to capture real-time typing and active timestamps
    const freshRoom = await ChatRoomModel.findById(roomId).select("lastReadAt lastActiveAt lastTypingAt status");

    const getMapValue = (mapOrObj: unknown, key: string) => {
      if (!mapOrObj || !key) return null;
      if (mapOrObj instanceof Map) return mapOrObj.get(key) || null;
      if (typeof mapOrObj === "object") return (mapOrObj as Record<string, Date>)[key] || null;
      return null;
    };

    const partnerLastReadAt = partnerId ? getMapValue(freshRoom?.lastReadAt, partnerId) : null;
    const partnerLastActiveAt = partnerId ? getMapValue(freshRoom?.lastActiveAt, partnerId) : null;
    const isPartnerOnline = Boolean(partnerLastActiveAt && (Date.now() - new Date(partnerLastActiveAt).getTime() < 8000));

    const partnerLastTypingAt = partnerId ? getMapValue(freshRoom?.lastTypingAt, partnerId) : null;
    const isPartnerTyping = Boolean(partnerLastTypingAt && (Date.now() - new Date(partnerLastTypingAt).getTime() < 5000));

    const activeMessages = await ChatMessageModel.find({
      chatRoomId: new mongoose.Types.ObjectId(roomId),
      createdAt: { $gt: twentyFourHoursAgo }
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("_id");
    const activeMessageIds = activeMessages.map(m => m._id.toString());

    return NextResponse.json({
      success: true,
      messages: processedMessages,
      hasMore,
      isArchived: room.status === "archived",
      partnerUsername,
      partnerId,
      partnerPublicKey,
      partnerLastReadAt,
      partnerStatus: isPartnerOnline ? "online" : "",
      isPartnerTyping,
      activeMessageIds,
      roomKeys: room.roomKeys || [],
    });
  } catch (error) {
    console.error("Error in GET /api/chat/[roomId]/messages:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  const userId = session.user._id;
  const { roomId } = await params;

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return NextResponse.json(
      { success: false, message: "Invalid room ID." },
      { status: 400 }
    );
  }

  try {
    const { content, tenderized, toxicityScore, toxicityLevel, mood } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0 || content.length > 2000) {
      return NextResponse.json(
        { success: false, message: "Message must be between 1 and 2,000 characters." },
        { status: 400 }
      );
    }

    const room = await ChatRoomModel.findById(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, message: "Chat room not found." },
        { status: 404 }
      );
    }

    const isParticipant = room.participants.some(
      (p: mongoose.Types.ObjectId) => p.toString() === userId
    );
    if (!isParticipant) {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    if (room.status === "archived") {
      return NextResponse.json(
        { success: false, message: "This connection has been removed. The chat is now read-only." },
        { status: 403 }
      );
    }

    const chatMsg = await ChatMessageModel.create({
      chatRoomId: new mongoose.Types.ObjectId(roomId),
      senderId: new mongoose.Types.ObjectId(userId),
      content,
      tenderized: tenderized || "",
      toxicityScore: toxicityScore || 0,
      toxicityLevel: toxicityLevel || "",
      mood: mood || "",
    });

    // Unset typing status immediately when message is sent
    await ChatRoomModel.findByIdAndUpdate(roomId, {
      $unset: { [`lastTypingAt.${userId}`]: "" },
    });

    const populatedMsg = await ChatMessageModel.findById(chatMsg._id).populate(
      "senderId",
      "username"
    );

    const sender = populatedMsg?.senderId as unknown as { _id?: mongoose.Types.ObjectId; username?: string } | null;

    return NextResponse.json(
      {
        success: true,
        message: {
          _id: chatMsg._id.toString(),
          sender: {
            _id: sender?._id?.toString() || "",
            username: sender?.username || "",
          },
          content: chatMsg.content,
          tenderized: chatMsg.tenderized || "",
          toxicityScore: chatMsg.toxicityScore || 0,
          toxicityLevel: chatMsg.toxicityLevel || "",
          mood: chatMsg.mood || "",
          createdAt: chatMsg.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/chat/[roomId]/messages:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  const userId = session.user._id;
  const { roomId } = await params;

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return NextResponse.json(
      { success: false, message: "Invalid room ID." },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { success: false, message: "Invalid message ID." },
        { status: 400 }
      );
    }

    const message = await ChatMessageModel.findById(messageId);
    if (!message) {
      return NextResponse.json(
        { success: false, message: "Message not found." },
        { status: 404 }
      );
    }

    if (message.chatRoomId.toString() !== roomId) {
      return NextResponse.json(
        { success: false, message: "Message does not belong to this room." },
        { status: 400 }
      );
    }

    // Only allow the sender of the message to delete it
    if (message.senderId.toString() !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    await ChatMessageModel.findByIdAndDelete(messageId);

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully.",
    });
  } catch (error) {
    console.error("Error in DELETE /api/chat/[roomId]/messages:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
