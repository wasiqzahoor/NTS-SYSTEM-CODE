import mongoose, { Schema, Document } from "mongoose";
import { IProject } from "@/types";

type ProjectDocument = IProject & Document;

const ProjectSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: ["active", "completed", "on_hold", "inactive"],
      default: "active",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staffIds: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    // History / completion fields
    completedAt: {
      type: Date,
      default: null,
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedStaffIds: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    // Note: previousStatus field removed — it was never written to or read anywhere
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ managerId: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ staffIds: 1 });
ProjectSchema.index({ isArchived: 1 });

export default mongoose.models.Project || mongoose.model<ProjectDocument>("Project", ProjectSchema);