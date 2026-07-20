import mongoose, { Schema, Document } from "mongoose";

export interface Confession extends Document {
  username: string;
  content: string;
  isReported: boolean;
  reportReason: string;
  createdAt: Date;
}

const ConfessionSchema: Schema<Confession> = new Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
  },
  content: {
    type: String,
    required: [true, "Confession content is required"],
  },
  isReported: {
    type: Boolean,
    default: false,
  },
  reportReason: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent Mongoose from creating multiple models during Next.js hot reloads in development
if (process.env.NODE_ENV === "development" && mongoose.models.Confession) {
  delete mongoose.models.Confession;
}

const ConfessionModel =
  mongoose.models.Confession ||
  mongoose.model<Confession>("Confession", ConfessionSchema);

export default ConfessionModel;
