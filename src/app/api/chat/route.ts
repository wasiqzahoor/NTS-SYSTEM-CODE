import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import Task from "@/models/Task";
import Notification from "@/models/Notification";

// GET - Get chat messages for a task
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // FIX BUG #10: Unauthenticated = 401, not 403
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    await connectDB();

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const hasAccess =
      session.user.role === "super_admin" ||
      task.assignedBy.toString() === session.user.id ||
      task.assignedTo.toString() === session.user.id;

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await ChatMessage.find({
      taskId,
      deletedForEveryone: { $ne: true },
      deletedFor: { $nin: [session.user.id] },
    })
      .sort({ createdAt: 1 })
      .limit(100);

    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Send chat message (text or media)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, message, mediaUrl, mediaType } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }
    if (!message?.trim() && !mediaUrl) {
      return NextResponse.json({ error: "Message or media is required" }, { status: 400 });
    }

    await connectDB();

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const hasAccess =
      session.user.role === "super_admin" ||
      task.assignedBy.toString() === session.user.id ||
      task.assignedTo.toString() === session.user.id;

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Block sending messages on finished tasks — chat is archived/read-only
    if (task.status === "finished") {
      return NextResponse.json(
        { error: "This task is finished. Chat is archived and read-only." },
        { status: 403 }
      );
    }

    const newMessage = await ChatMessage.create({
      taskId,
      senderId: session.user.id,
      senderName: session.user.name,
      senderRole: session.user.role,
      message: message?.trim() || "",
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      deletedFor: [],
      deletedForEveryone: false,
    });

    const notifyUserId =
      task.assignedBy.toString() === session.user.id
        ? task.assignedTo
        : task.assignedBy;

    await Notification.create({
      userId: notifyUserId,
      title: "New Chat Message",
      message: `${session.user.name} sent a message in task: ${task.title}`,
      type: "chat_message",
      link: `/tasks/${taskId}`,
    });

    if (global._io) {
      global._io.to(`user_${notifyUserId}`).emit("new-message", {
        taskId,
        message: newMessage,
      });
      global._io.emit(`task-chat-${taskId}`, newMessage);
    }

    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a message
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");
    const deleteFor = searchParams.get("deleteFor");

    if (!messageId) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    await connectDB();

    const msg = await ChatMessage.findById(messageId);
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const isOwner = msg.senderId.toString() === session.user.id;
    const isAdminOrManager = ["super_admin", "manager"].includes(session.user.role);

    if (deleteFor === "everyone") {
      if (!isOwner && !isAdminOrManager) {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
      }
      await ChatMessage.findByIdAndUpdate(messageId, { deletedForEveryone: true });

      if (global._io) {
        global._io.emit(`message-deleted-${msg.taskId}`, { messageId, deleteFor: "everyone" });
      }
    } else {
      await ChatMessage.findByIdAndUpdate(messageId, {
        $addToSet: { deletedFor: session.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
