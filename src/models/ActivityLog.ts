import mongoose, { Schema, Document } from "mongoose";
import { IActivityLog } from "@/types";

type ActivityLogDocument = IActivityLog & Document;

const ActivityLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ["super_admin", "manager", "staff"],
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      enum: ["user", "project", "task", "chat"],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: false,
      default: null,
    },
    details: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

ActivityLogSchema.index({ userId: 1 });
ActivityLogSchema.index({ entityType: 1, entityId: 1 });
ActivityLogSchema.index({ createdAt: -1 });

export default mongoose.models.ActivityLog || mongoose.model<ActivityLogDocument>("ActivityLog", ActivityLogSchema);