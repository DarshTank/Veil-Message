import { Schema, model, models, Document, Types } from "mongoose";

export interface IConnectionRequest extends Document {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionRequestSchema = new Schema<IConnectionRequest>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Prevent duplicate active requests between the same pair
ConnectionRequestSchema.index(
  { senderId: 1, receiverId: 1 },
  { unique: true }
);
// Fast inbox queries
ConnectionRequestSchema.index({ receiverId: 1, status: 1 });
// Fast outbox queries
ConnectionRequestSchema.index({ senderId: 1, status: 1 });

const ConnectionRequestModel =
  models.ConnectionRequest ||
  model<IConnectionRequest>("ConnectionRequest", ConnectionRequestSchema);

export default ConnectionRequestModel;
