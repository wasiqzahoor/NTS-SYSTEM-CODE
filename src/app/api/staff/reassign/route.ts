import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";

// POST - Super admin reassigns a specific staff member to another manager
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { staffId, newManagerId } = await req.json();
    if (!staffId || !newManagerId) {
      return NextResponse.json({ error: "staffId and newManagerId are required" }, { status: 400 });
    }

    await connectDB();

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== "staff") {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const oldManagerId = staff.managerId;
    await User.findByIdAndUpdate(staffId, { managerId: newManagerId });

    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "Reassigned staff to new manager",
      entityType: "user",
      entityId: staffId,
      details: `Staff "${staff.name}" reassigned from manager ${oldManagerId} to ${newManagerId}`,
    });

    return NextResponse.json({ success: true, message: `${staff.name} reassigned successfully` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
