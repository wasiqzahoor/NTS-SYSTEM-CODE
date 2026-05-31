import mongoose, { Schema, Document } from "mongoose";
import { INotification } from "@/types";

type NotificationDocument = INotification & Document;

const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["task_assigned", "task_updated", "task_approved", "task_revision", "deadline_reminder", "chat_message"],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<NotificationDocument>("Notification", NotificationSchema);
