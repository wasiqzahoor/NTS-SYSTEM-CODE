import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "@/types";

type UserDocument = IUser & Document;

const UserSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // FIX BUG #4: Never return password in queries by default
    },
    role: {
      type: String,
      enum: ["super_admin", "manager", "staff"],
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      default: "",
    },
    managerRole: {
      type: String,
      default: "",
    },
    staffRole: {
      type: String,
      default: "",
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ managerId: 1 });

export default mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);
