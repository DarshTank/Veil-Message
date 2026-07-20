import { Schema, model, models, Document, Types } from "mongoose";

export interface IChatMessage extends Document {
  chatRoomId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  tenderized?: string;
  toxicityScore?: number;
  toxicityLevel?: string;
  mood?: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    chatRoomId: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 2000,
    },
    tenderized: {
      type: String,
      default: "",
    },
    toxicityScore: {
      type: Number,
      default: 0,
    },
    toxicityLevel: {
      type: String,
      default: "",
    },
    mood: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Snapchat-style 24-hour message deletion TTL Index
ChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Fast paginated lookups ordered by creation time
ChatMessageSchema.index({ chatRoomId: 1, createdAt: 1 });

const ChatMessageModel =
  models.ChatMessage || model<IChatMessage>("ChatMessage", ChatMessageSchema);

export default ChatMessageModel;
