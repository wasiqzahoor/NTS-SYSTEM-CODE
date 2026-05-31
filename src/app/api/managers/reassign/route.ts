import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";
import ActivityLog from "@/models/ActivityLog";

// POST - Reassign staff/projects/tasks from one manager to another
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { fromManagerId, toManagerId } = await req.json();

    if (!fromManagerId || !toManagerId) {
      return NextResponse.json({ error: "fromManagerId and toManagerId are required" }, { status: 400 });
    }

    await connectDB();

    // BUG-M1 FIX: Validate that toManagerId actually exists and is a manager
    const newManager = await User.findOne({ _id: toManagerId, role: "manager" });
    if (!newManager) {
      return NextResponse.json({ error: "Target manager not found or is not a manager" }, { status: 404 });
    }

    const fromManager = await User.findOne({ _id: fromManagerId, role: "manager" });
    if (!fromManager) {
      return NextResponse.json({ error: "Source manager not found" }, { status: 404 });
    }

    if (fromManagerId === toManagerId) {
      return NextResponse.json({ error: "Cannot reassign to the same manager" }, { status: 400 });
    }
    const staffResult = await User.updateMany(
      { managerId: fromManagerId, role: "staff" },
      { $set: { managerId: toManagerId, isActive: true } }
    );

    // Reassign projects
    const projectResult = await Project.updateMany(
      { managerId: fromManagerId },
      { $set: { managerId: toManagerId } }
    );

    // Reassign tasks (assignedBy)
    const taskResult = await Task.updateMany(
      { assignedBy: fromManagerId },
      { $set: { assignedBy: toManagerId } }
    );

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Reassigned manager resources",
      entityType: "user",
      entityId: fromManagerId,
      details: `Reassigned ${staffResult.modifiedCount} staff, ${projectResult.modifiedCount} projects, ${taskResult.modifiedCount} tasks from manager ${fromManagerId} to ${toManagerId}`,
    });

    return NextResponse.json({
      success: true,
      message: `Reassigned ${staffResult.modifiedCount} staff, ${projectResult.modifiedCount} projects, ${taskResult.modifiedCount} tasks successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
