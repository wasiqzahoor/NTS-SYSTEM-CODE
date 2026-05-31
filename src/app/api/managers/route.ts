import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sendEmail, createOnboardingEmail } from "@/lib/email";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// GET - List all managers (Super Admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const managers = await User.find({ role: "manager" }).select("-password").sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: managers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new manager (Super Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, email, phone, department, managerRole } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    if (!managerRole) {
      return NextResponse.json({ error: "Manager role/position is required" }, { status: 400 });
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const tempPassword = randomBytes(8).toString("base64url") + "A1!";
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const newManager = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "manager",
      phone: phone || "",
      department: department || "",
      managerRole: managerRole || "",
      isActive: true,
    });

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Created manager account",
      entityType: "user",
      entityId: newManager._id,
      details: `Manager account created for ${name} (${email})`,
    });

    // FIX BUG #3: Removed plaintext password from server logs (security risk)
    console.log(`✅ New manager created: ${name} (${email})`);

    // ✅ Send welcome email from SERVER SIDE
    try {
      const emailData = createOnboardingEmail(name, email, tempPassword, "Manager");
      await sendEmail(emailData);
    } catch (emailErr) {
      console.error("⚠️ Email sending failed:", emailErr);
      // Email fail ho to bhi user create hota rahega
    }

    return NextResponse.json({
      success: true,
      message: "Manager created successfully! Login credentials have been sent to their email.",
      data: {
        id: newManager._id,
        name: newManager.name,
        email: newManager.email,
        role: newManager.role,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update manager
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, name, email, phone, department, isActive, managerRole } = await req.json();

    await connectDB();

    // FIX BUG #2: Check email uniqueness and lowercase before updating
    if (email) {
      const emailConflict = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
      if (emailConflict) {
        return NextResponse.json({ error: "Email already in use by another account" }, { status: 409 });
      }
    }

    const manager = await User.findByIdAndUpdate(
      id,
      { name, email: email?.toLowerCase(), phone, department, isActive, ...(managerRole !== undefined && { managerRole }) },
      { new: true }
    ).select("-password");

    if (!manager) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    // Audit log
    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: isActive === false ? "Deactivated manager account" : "Updated manager account",
      entityType: "user",
      entityId: id,
      details: `Manager account updated for ${manager.name}`,
    });

    return NextResponse.json({ success: true, data: manager });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete manager (also deactivates their staff)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Manager ID is required" }, { status: 400 });
    }

    await connectDB();
    const manager = await User.findById(id);

    if (!manager) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    // Deactivate all staff under this manager
    const affectedStaff = await User.updateMany(
      { managerId: id, role: "staff" },
      { $set: { managerId: null, isActive: false } }
    );

    await User.findByIdAndDelete(id);

    // Audit log
    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Deleted manager account",
      entityType: "user",
      entityId: id,
      details: `Manager "${manager.name}" deleted. ${affectedStaff.modifiedCount} staff member(s) deactivated.`,
    });

    return NextResponse.json({
      success: true,
      message: `Manager deleted successfully. ${affectedStaff.modifiedCount} staff member(s) were deactivated.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
