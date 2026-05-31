import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";
import User from "@/models/User";
import Notification from "@/models/Notification";
import ActivityLog from "@/models/ActivityLog";

// GET - List tasks
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    let tasks;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    let query: any = {};
    if (projectId) query.projectId = projectId;
    if (status) query.status = status;

    if (session.user.role === "super_admin") {
      tasks = await Task.find(query)
        .populate("assignedTo", "name email avatar")
        .populate("assignedBy", "name email")
        .populate("projectId", "title")
        .sort({ createdAt: -1 });
    } else if (session.user.role === "manager") {
      query.assignedBy = session.user.id;
      tasks = await Task.find(query)
        .populate("assignedTo", "name email avatar")
        .populate("projectId", "title")
        .sort({ createdAt: -1 });
    } else {
      query.assignedTo = session.user.id;
      tasks = await Task.find(query)
        .populate("assignedBy", "name email")
        .populate("projectId", "title")
        .sort({ priority: -1, dueDate: 1 });
    }

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new task (Manager only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["manager", "super_admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, projectId, assignedTo, priority, dueDate, attachments } = await req.json();

    if (!title || !description || !projectId || !assignedTo) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }

    await connectDB();

    const newTask = await Task.create({
      title,
      description,
      projectId,
      assignedTo,
      assignedBy: session.user.id,
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      attachments: attachments || [],
      status: "todo",
    });

    // Notify assigned staff about new task
    await Notification.create({
      userId: assignedTo,
      title: "New Task Assigned",
      message: `${session.user.name} assigned you a new task: "${title}"`,
      type: "task_assigned",
      link: `/tasks`,
    });

    // Audit log
    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Created task",
      entityType: "task",
      entityId: newTask._id,
      details: `Task "${title}" created and assigned`,
    });

    const populatedTask = await Task.findById(newTask._id)
      .populate("assignedTo", "name email avatar")
      .populate("assignedBy", "name email")
      .populate("projectId", "title");

    // Real-time: notify assigned staff immediately
    if (global._io) {
      global._io?.to(`user_${assignedTo}`).emit("task-updated", {
        type: "new-task",
        task: populatedTask,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Task created successfully",
      data: populatedTask,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update task status
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status, notes, revisionNotes, attachments } = await req.json();

    await connectDB();
    const task = await Task.findById(id);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updateData: any = {};

    // BUG-C2 FIX: Enforce valid task status transitions for staff
    // Staff cannot go backwards (e.g. un-submit a review, or skip steps)
    const STAFF_ALLOWED_TRANSITIONS: Record<string, string[]> = {
      "todo": ["in_progress"],
      "in_progress": ["completed"],
      "revision_requested": ["in_progress"], // Can restart work after revision
    };

    if (session.user.role === "staff" && task.assignedTo.toString() === session.user.id) {
      if (status) {
        const allowedNext = STAFF_ALLOWED_TRANSITIONS[task.status] || [];
        if (allowedNext.includes(status)) {
          updateData.status = status;
          if (status === "completed") {
            updateData.completedAt = new Date();
          }
        }
        // If status transition is not allowed, silently ignore (updateData stays empty for status)
      }
      if (notes !== undefined) updateData.notes = notes;
      if (attachments !== undefined) updateData.attachments = attachments;
    }

    // Super admin can update any task
    if (session.user.role === "super_admin") {
      if (status) {
        updateData.status = status;
        if (status === "revision_requested") {
          updateData.revisionNotes = revisionNotes || "";
        }
        if (status === "completed") {
          updateData.approvedAt = new Date();
          updateData.approvedBy = session.user.id;
        }
        if (status === "finished") {
          updateData.finishedAt = new Date();
          updateData.finishedBy = session.user.id;
        }
        if (status === "todo") {
          // Revert from finished back to pending/todo
          updateData.finishedAt = null;
          updateData.finishedBy = null;
        }
      }
    }

    // Manager can only update tasks they assigned
    if (session.user.role === "manager" && task.assignedBy.toString() === session.user.id) {
      if (status) {
        updateData.status = status;
        if (status === "revision_requested") {
          updateData.revisionNotes = revisionNotes || "";
        }
        if (status === "completed") {
          updateData.approvedAt = new Date();
          updateData.approvedBy = session.user.id;
        }
        if (status === "finished") {
          updateData.finishedAt = new Date();
          updateData.finishedBy = session.user.id;
        }
        if (status === "todo") {
          updateData.finishedAt = null;
          updateData.finishedBy = null;
        }
      }
    }

    // BUG FIX: If no authorized update was built, reject the request
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Forbidden: you are not authorized to update this task" }, { status: 403 });
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true })
      .populate("assignedTo", "name email avatar")
      .populate("assignedBy", "name email")
      .populate("projectId", "title");

    // Only create notification + audit log if status actually changed
    if (status && updateData.status) {
      const isStaff = session.user.role === "staff";

      let notifType: string;
      let notifTitle: string;
      let notifMessage: string;
      let notifUserId: string;
      let notifLink: string;
      let auditAction: string;

      if (isStaff) {
        notifUserId = task.assignedBy.toString();
        notifLink = `/tasks`;

        if (status === "in_progress") {
          notifType = "task_updated";
          notifTitle = "Task Started";
          notifMessage = `${session.user.name} started working on: "${task.title}"`;
          auditAction = "Started task";
        } else if (status === "completed") {
          notifType = "task_updated";
          notifTitle = "Task Submitted for Review";
          notifMessage = `${session.user.name} has completed: "${task.title}" and submitted for your review`;
          auditAction = "Submitted task for review";
        } else {
          notifType = "task_updated";
          notifTitle = "Task Updated";
          notifMessage = `${session.user.name} updated task: "${task.title}"`;
          auditAction = "Updated task";
        }
      } else {
        notifUserId = task.assignedTo.toString();
        notifLink = `/tasks`;

        if (status === "completed") {
          notifType = "task_approved";
          notifTitle = "Task Approved ✓";
          notifMessage = `${session.user.name} approved your task: "${task.title}". Great work!`;
          auditAction = "Approved task";
        } else if (status === "revision_requested") {
          notifType = "task_revision";
          notifTitle = "Revision Requested";
          notifMessage = `${session.user.name} requested revision on: "${task.title}"${revisionNotes ? ` — "${revisionNotes}"` : ""}`;
          auditAction = "Requested revision on task";
        } else {
          notifType = "task_updated";
          notifTitle = "Task Updated by Manager";
          notifMessage = `${session.user.name} updated your task: "${task.title}"`;
          auditAction = "Updated task";
        }
      }

      await Notification.create({
        userId: notifUserId,
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        link: notifLink,
      });

      // Audit log
      await ActivityLog.create({
        userId: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: auditAction,
        entityType: "task",
        entityId: task._id,
        details: `Task "${task.title}" status changed to ${status}`,
      });
    }

    // Real-time: emit task update to all involved parties
    if (global._io) {
      const taskData = updatedTask;
      const involvedUsers = [
        updatedTask?.assignedTo?._id?.toString() || updatedTask?.assignedTo?.toString(),
        updatedTask?.assignedBy?._id?.toString() || updatedTask?.assignedBy?.toString(),
      ].filter(Boolean);
      involvedUsers.forEach((uid) => {
        global._io?.to(`user_${uid}`).emit("task-updated", { type: "update", task: taskData });
      });
    }

    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete task (Manager or Super Admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["super_admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    await connectDB();
    const task = await Task.findById(id);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // FIX: Manager can only delete their own tasks (IDOR prevention)
    if (
      session.user.role === "manager" &&
      task.assignedBy.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden: not your task" }, { status: 403 });
    }

    // Notify staff that their task was deleted
    await Notification.create({
      userId: task.assignedTo.toString(),
      title: "Task Removed",
      message: `The task "${task.title}" has been removed by your manager`,
      type: "task_updated",
      link: `/tasks`,
    });

    // Audit log
    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Deleted task",
      entityType: "task",
      entityId: task._id,
      details: `Task "${task.title}" was deleted`,
    });

    await Task.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}