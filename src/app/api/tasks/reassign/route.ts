import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";
import Notification from "@/models/Notification";
import ActivityLog from "@/models/ActivityLog";

// POST - Reassign a finished task to another staff member (restores to todo)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["manager", "super_admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { taskId, assignedTo } = await req.json();
    if (!taskId || !assignedTo) {
      return NextResponse.json({ error: "taskId and assignedTo are required" }, { status: 400 });
    }

    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Only finished tasks can be reassigned from history
    if (task.status !== "finished") {
      return NextResponse.json({ error: "Only finished tasks can be reassigned" }, { status: 400 });
    }

    // BUG FIX: Manager can only reassign tasks they originally assigned (IDOR prevention)
    if (
      session.user.role === "manager" &&
      task.assignedBy.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden: not your task" }, { status: 403 });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        $set: {
          assignedTo,
          status: "todo",
          finishedAt: null,
          finishedBy: null,
          completedAt: null,
          approvedAt: null,
          approvedBy: null,
        },
      },
      { new: true }
    )
      .populate("assignedTo", "name email avatar")
      .populate("assignedBy", "name email")
      .populate("projectId", "title");

    await Notification.create({
      userId: assignedTo,
      title: "Task Reassigned",
      message: `${session.user.name} assigned you a task: "${task.title}"`,
      type: "task_assigned",
      link: `/tasks`,
    });

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Reassigned finished task",
      entityType: "task",
      entityId: task._id,
      details: `Task "${task.title}" reassigned to new staff member`,
    });

    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
