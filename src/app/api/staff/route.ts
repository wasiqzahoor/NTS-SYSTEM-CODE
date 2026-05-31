import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail, createOnboardingEmail } from "@/lib/email";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Task from "@/models/Task";
import ChatMessage from "@/models/ChatMessage";
import ActivityLog from "@/models/ActivityLog";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// GET - List staff members
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    let staff;

    if (session.user.role === "super_admin") {
      staff = await User.find({ role: "staff" }).select("-password").sort({ createdAt: -1 });
    } else if (session.user.role === "manager") {
      staff = await User.find({ role: "staff", managerId: session.user.id }).select("-password").sort({ createdAt: -1 });
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: staff });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new staff member (Manager only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, email, phone, department, staffRole } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const tempPassword = randomBytes(8).toString("base64url") + "A1!";
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const newStaff = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "staff",
      phone: phone || "",
      department: department || "",
      staffRole: staffRole || "",
      managerId: session.user.id,
      isActive: true,
    });

    // FIX: Send email first, then log — do NOT return plaintext password in API response
    try {
      const emailData = createOnboardingEmail(name, email, tempPassword, "Staff");
      const emailSent = await sendEmail(emailData);
      if (!emailSent) {
        console.warn("⚠️ Email could not be sent to:", email);
      }
    } catch (emailErr) {
      console.error("⚠️ Email sending failed:", emailErr);
    }

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Created staff account",
      entityType: "user",
      entityId: newStaff._id,
      details: `Staff account created for ${name} (${email})`,
    });

    // FIX BUG #3: Removed plaintext password from server logs (security risk)
    console.log(`✅ New staff member created: ${name} (${email})`);

    // FIX BUG #1: Removed plaintext password from API response
    return NextResponse.json({
      success: true,
      message: "Staff member created successfully! Login credentials have been sent to their email.",
      data: {
        id: newStaff._id,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update staff member
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["super_admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, name, email, phone, department, staffRole, isActive } = await req.json();

    await connectDB();

    // FIX BUG #4: Manager can only update their own staff
    const staffMember = await User.findById(id);
    if (!staffMember) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }
    if (
      session.user.role === "manager" &&
      staffMember.managerId?.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden: not your staff member" }, { status: 403 });
    }

    // FIX: Check email uniqueness before updating
    if (email) {
      const emailConflict = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
      if (emailConflict) {
        return NextResponse.json({ error: "Email already in use by another account" }, { status: 409 });
      }
    }

    const staff = await User.findByIdAndUpdate(
      id,
      { name, email: email?.toLowerCase(), phone, department, staffRole, isActive },
      { new: true }
    ).select("-password");

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: isActive === false ? "Deactivated staff account" : "Updated staff account",
      entityType: "user",
      entityId: id,
      details: `Staff account updated for ${staff?.name}`,
    });

    return NextResponse.json({ success: true, data: staff });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete staff member
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
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
    }

    await connectDB();
    const staffMember = await User.findById(id);

    if (!staffMember) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // FIX BUG #4: Manager can only delete their own staff
    if (
      session.user.role === "manager" &&
      staffMember.managerId?.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden: not your staff member" }, { status: 403 });
    }

    await User.findByIdAndDelete(id);

    // BUG FIX: Clean up orphaned tasks and chat messages for this staff member
    const staffTasks = await Task.find({ assignedTo: id });
    const taskIds = staffTasks.map((t) => t._id);
    if (taskIds.length > 0) {
      await ChatMessage.deleteMany({ taskId: { $in: taskIds } });
      await Task.deleteMany({ assignedTo: id });
    }

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Deleted staff account",
      entityType: "user",
      entityId: id,
      details: `Staff account "${staffMember.name}" deleted along with ${taskIds.length} task(s) and their chat messages`,
    });

    return NextResponse.json({ success: true, message: "Staff member deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
