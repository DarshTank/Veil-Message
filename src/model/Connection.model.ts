import { Schema, model, models, Document, Types } from "mongoose";

export interface IConnection extends Document {
  userId: Types.ObjectId;
  connectedUserId: Types.ObjectId;
  status: "connected" | "removed";
  chatRoomId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    connectedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["connected", "removed"],
      default: "connected",
    },
    chatRoomId: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
  },
  { timestamps: true }
);

// Each user can have at most one Connection record per partner
ConnectionSchema.index({ userId: 1, connectedUserId: 1 }, { unique: true });
// Fast lookup for active connections
ConnectionSchema.index({ userId: 1, status: 1 });

const ConnectionModel =
  models.Connection || model<IConnection>("Connection", ConnectionSchema);

export default ConnectionModel;
