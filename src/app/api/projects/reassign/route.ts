import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import ActivityLog from "@/models/ActivityLog";

// POST - Super admin reassigns a specific project to another manager
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { projectId, newManagerId } = await req.json();
    if (!projectId || !newManagerId) {
      return NextResponse.json({ error: "projectId and newManagerId are required" }, { status: 400 });
    }

    await connectDB();

    const project = await Project.findById(projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const oldManagerId = project.managerId;

    await Project.findByIdAndUpdate(projectId, { managerId: newManagerId });

    // Also update tasks in this project (assignedBy)
    await Task.updateMany({ projectId, assignedBy: oldManagerId }, { $set: { assignedBy: newManagerId } });

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Reassigned project manager",
      entityType: "project",
      entityId: projectId,
      details: `Project "${project.title}" reassigned from manager ${oldManagerId} to ${newManagerId}`,
    });

    return NextResponse.json({ success: true, message: "Project reassigned successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
