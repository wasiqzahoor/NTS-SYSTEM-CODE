import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  // BUG-C1 FIX: Block this route entirely in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await connectDB();

    // Check if any admin exists
    const existingAdmin = await User.findOne({ role: "super_admin" });
    if (existingAdmin) {
      return NextResponse.json({
        message: "Admin already exists. Use your configured credentials to login.",
      });
    }

    // Create admin
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await User.create({
      name: "Super Admin",
      email: "admin@nts.com",
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
    });

    return NextResponse.json({
      message: "Super Admin created successfully (development only)",
      credentials: {
        email: "admin@nts.com",
        password: "admin123",
        warning: "Change this password immediately after first login!",
      },
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
