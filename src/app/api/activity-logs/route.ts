import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import User from "@/models/User";

// GET - Get activity logs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    let query: any = {};

    if (session.user.role === "super_admin") {
      // Super admin sees all logs
      if (entityType) query.entityType = entityType;
      if (entityId) query.entityId = entityId;
    } else if (session.user.role === "manager") {
      // Manager sees their own logs + their staff's logs
      const myStaff = await User.find({ managerId: session.user.id }).select("_id");
      const staffIds = myStaff.map((s) => s._id.toString());
      query.userId = { $in: [session.user.id, ...staffIds] };
      if (entityType) query.entityType = entityType;
    } else {
      // Staff sees only their own logs
      query.userId = session.user.id;
      if (entityType) query.entityType = entityType;
    }

    // Server-side search across all pages
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create activity log (internal use)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, entityType, entityId, details } = await req.json();

    await connectDB();

    const log = await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action,
      entityType,
      entityId: entityId || null,
      details,
    });

    return NextResponse.json({ success: true, data: log }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
