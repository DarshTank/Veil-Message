import mongoose, { Schema, Document } from "mongoose";

export interface ISystemSetting extends Document {
  key: string;
  value: any;
  updatedAt: Date;
}

const SystemSettingSchema: Schema<ISystemSetting> = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

const SystemSettingModel =
  (mongoose.models.SystemSetting as mongoose.Model<ISystemSetting>) ||
  mongoose.model<ISystemSetting>("SystemSetting", SystemSettingSchema);

export default SystemSettingModel;
