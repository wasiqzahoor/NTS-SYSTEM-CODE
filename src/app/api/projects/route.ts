import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import ChatMessage from "@/models/ChatMessage";
import Notification from "@/models/Notification";
import ActivityLog from "@/models/ActivityLog";

// GET - List projects
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("archived") === "true";

    let query: any = {};

    if (session.user.role === "super_admin") {
      query = includeArchived ? { isArchived: true } : { isArchived: { $ne: true } };
    } else if (session.user.role === "manager") {
      query = includeArchived
        ? { managerId: session.user.id, isArchived: true }
        : { managerId: session.user.id, isArchived: { $ne: true } };
    } else {
      if (includeArchived) {
        query = {
          isArchived: true,
          $or: [{ staffIds: session.user.id }, { archivedStaffIds: session.user.id }],
        };
      } else {
        query = { staffIds: session.user.id, isArchived: { $ne: true } };
      }
    }

    const projects = await Project.find(query)
      .populate("managerId", "name email")
      .populate("staffIds", "name email")
      .populate("completedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new project (Manager only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // BUG-C3 FIX: super_admin should also be able to create projects
    if (!["manager", "super_admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, startDate, endDate, staffIds } = await req.json();

    if (!title || !description || !startDate || !endDate) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    await connectDB();

    const newProject = await Project.create({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      managerId: session.user.id,
      staffIds: staffIds || [],
      status: "active",
      isArchived: false,
    });

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Created project",
      entityType: "project",
      entityId: newProject._id,
      details: `Project "${title}" created`,
    });

    const populatedProject = await Project.findById(newProject._id)
      .populate("staffIds", "name email");

    if (global._io && staffIds?.length) {
      staffIds.forEach((staffId: string) => {
        global._io.to(`user_${staffId}`).emit("task-updated", {
          type: "new-project",
          project: populatedProject,
        });
      });
    }

    return NextResponse.json({
      success: true,
      message: "Project created successfully",
      data: populatedProject,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update project (also handles complete, restore, status toggle)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["super_admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, action } = body;

    await connectDB();
    const project = await Project.findById(id).populate("staffIds", "name email _id");
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // FIX BUG #3: Manager can only modify their own project
    if (
      session.user.role === "manager" &&
      project.managerId.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden: not your project" }, { status: 403 });
    }

    if (action === "complete") {
      const staffIdList = project.staffIds.map((s: any) => s._id || s);

      await Project.findByIdAndUpdate(id, {
        status: "completed",
        completedAt: new Date(),
        completedBy: session.user.id,
        isArchived: true,
        archivedStaffIds: staffIdList,
        staffIds: [],
      });

      const notifPromises = staffIdList.map((staffId: any) =>
        Notification.create({
          userId: staffId.toString(),
          title: "Project Completed",
          message: `Project "${project.title}" has been marked as completed`,
          type: "task_updated",
          link: "/projects",
        })
      );
      await Promise.all(notifPromises);

      await ActivityLog.create({
        userId: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: "Completed project",
        entityType: "project",
        entityId: id,
        details: `Project "${project.title}" marked as completed and moved to history`,
      });

      const updated = await Project.findById(id).populate("completedBy", "name");
      return NextResponse.json({ success: true, data: updated, message: "Project completed and moved to history" });
    }

    if (action === "restore") {
      const archivedStaff = project.archivedStaffIds || [];
      await Project.findByIdAndUpdate(id, {
        status: "active",
        isArchived: false,
        completedAt: null,
        completedBy: null,
        staffIds: archivedStaff,
      });

      // FIX BUG #9: Reset finished tasks back to todo on project restore
      await Task.updateMany(
        { projectId: id, status: "finished" },
        { $set: { status: "todo", finishedAt: null, finishedBy: null } }
      );

      // BUG-M2 FIX: Notify restored staff members that project is active again
      if (archivedStaff.length > 0) {
        const restoreNotifPromises = archivedStaff.map((staffId: any) =>
          Notification.create({
            userId: staffId.toString(),
            title: "Project Restored",
            message: `Project "${project.title}" has been restored to active. Your tasks are available again.`,
            type: "task_updated",
            link: "/projects",
          })
        );
        await Promise.all(restoreNotifPromises);
      }

      await ActivityLog.create({
        userId: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: "Restored project",
        entityType: "project",
        entityId: id,
        details: `Project "${project.title}" restored from history to active`,
      });

      const updated = await Project.findById(id).populate("staffIds", "name email");
      return NextResponse.json({ success: true, data: updated, message: "Project restored to active" });
    }

    if (action === "toggleStatus") {
      const { newStatus } = body;
      const allowed = ["active", "inactive", "on_hold"];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      await Project.findByIdAndUpdate(id, { status: newStatus });

      await ActivityLog.create({
        userId: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: "Changed project status",
        entityType: "project",
        entityId: id,
        details: `Project "${project.title}" status changed to ${newStatus}`,
      });

      const updated = await Project.findById(id).populate("staffIds", "name email");
      return NextResponse.json({ success: true, data: updated });
    }

    // Normal update
    const { title, description, startDate, endDate, status, staffIds } = body;
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { title, description, startDate, endDate, status, staffIds },
      { new: true }
    ).populate("staffIds", "name email");

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Updated project",
      entityType: "project",
      entityId: id,
      details: `Project "${updatedProject?.title}" updated${status ? ` — status: ${status}` : ""}`,
    });

    return NextResponse.json({ success: true, data: updatedProject });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete project and notify affected staff
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
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    await connectDB();
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // FIX BUG #3: Manager can only delete their own project
    if (
      session.user.role === "manager" &&
      project.managerId.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden: not your project" }, { status: 403 });
    }

    const tasksToDelete = await Task.find({ projectId: id });

    const notifPromises = tasksToDelete.map((task) =>
      Notification.create({
        userId: task.assignedTo.toString(),
        title: "Project Removed",
        message: `Project "${project.title}" and your task "${task.title}" have been removed`,
        type: "task_updated",
        link: "/tasks",
      })
    );
    await Promise.all(notifPromises);

    // FIX BUG #8: Also delete chat messages for all tasks in this project
    const taskIds = tasksToDelete.map((t) => t._id);
    if (taskIds.length > 0) {
      await ChatMessage.deleteMany({ taskId: { $in: taskIds } });
    }

    await Task.deleteMany({ projectId: id });

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Deleted project",
      entityType: "project",
      entityId: id,
      details: `Project "${project.title}" deleted along with ${tasksToDelete.length} task(s)`,
    });

    await Project.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Project and ${tasksToDelete.length} associated task(s) deleted successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
