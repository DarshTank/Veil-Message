import { Schema, model, models, Document, Types } from "mongoose";

export interface IChatRoomKey {
  userId: Types.ObjectId;
  encryptedKey: string;
}

export interface IChatRoom extends Document {
  participants: [Types.ObjectId, Types.ObjectId];
  status: "active" | "archived";
  lastReadAt: Map<string, Date>;
  lastActiveAt?: Map<string, Date>;
  lastTypingAt?: Map<string, Date>;
  roomKeys?: IChatRoomKey[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatRoomSchema = new Schema<IChatRoom>(
  {
    participants: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      required: true,
      validate: [(arr: Types.ObjectId[]) => arr.length === 2, "ChatRoom requires exactly 2 participants"],
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
    lastReadAt: {
      type: Map,
      of: Date,
      default: {},
    },
    lastActiveAt: {
      type: Map,
      of: Date,
      default: {},
    },
    lastTypingAt: {
      type: Map,
      of: Date,
      default: {},
    },
    roomKeys: {
      type: [
        {
          userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          encryptedKey: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Fast lookup for room participants
ChatRoomSchema.index({ participants: 1 });

const ChatRoomModel =
  models.ChatRoom || model<IChatRoom>("ChatRoom", ChatRoomSchema);

export default ChatRoomModel;
