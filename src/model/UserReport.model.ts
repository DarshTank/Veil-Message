import { Schema, model, models, Document, Types } from "mongoose";

export interface UserReport extends Document {
  reporterId: Types.ObjectId;
  reporterUsername: string;
  reportedUserId: Types.ObjectId;
  reportedUsername: string;
  category: "harassment" | "spam" | "inappropriate" | "impersonation" | "other";
  reason: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserReportSchema: Schema<UserReport> = new Schema(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterUsername: {
      type: String,
      required: true,
      trim: true,
    },
    reportedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUsername: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["harassment", "spam", "inappropriate", "impersonation", "other"],
      default: "other",
    },
    reason: {
      type: String,
      required: [true, "Reason for report is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

if (process.env.NODE_ENV === "development") {
  delete models.UserReport;
}

const UserReportModel =
  models.UserReport || model<UserReport>("UserReport", UserReportSchema);

export default UserReportModel;
