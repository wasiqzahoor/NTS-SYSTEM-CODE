import mongoose, { Schema, Document } from "mongoose";
import { ITask } from "@/types";

type TaskDocument = ITask & Document;

const TaskSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Task description is required"],
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "completed", "revision_requested", "finished"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    attachments: [{
      type: String,
    }],
    notes: {
      type: String,
      default: "",
    },
    dueDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    revisionNotes: {
      type: String,
      default: "",
    },
    finishedAt: {
      type: Date,
    },
    finishedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ projectId: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ assignedBy: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ dueDate: 1 });

export default mongoose.models.Task || mongoose.model<TaskDocument>("Task", TaskSchema);