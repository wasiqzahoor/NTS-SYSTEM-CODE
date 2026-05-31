import mongoose, { Schema, Document } from "mongoose";
import { IChatMessage } from "@/types";

type ChatMessageDocument = IChatMessage & Document;

const ChatMessageSchema = new Schema(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["super_admin", "manager", "staff"],
      required: true,
    },
    message: {
      type: String,
      default: "",
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    // Media support
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String,
      enum: ["image", "video", null],
      default: null,
    },
    // Soft delete: store array of userIds who deleted this message
    deletedFor: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    // Hard delete (deleted for everyone)
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

ChatMessageSchema.index({ taskId: 1, createdAt: -1 });

export default mongoose.models.ChatMessage || mongoose.model<ChatMessageDocument>("ChatMessage", ChatMessageSchema);