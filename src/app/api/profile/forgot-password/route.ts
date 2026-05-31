import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";

// Generates a readable random password: e.g. "Kx7$mP2!qR"
function generateNewPassword(): string {
  const base = randomBytes(8).toString("base64url").slice(0, 9);
  return base.charAt(0).toUpperCase() + base.slice(1) + "1!";
}

async function sendPasswordResetEmail(
  to_email: string,
  to_name: string,
  newPassword: string
): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const loginUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000") + "/login";

    await transporter.sendMail({
      from: `"NTS Management" <${process.env.EMAIL_USER}>`,
      to: to_email,
      subject: "NTS Management — Your New Password",
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:560px; margin:0 auto; background:#f9fafb; border-radius:12px; overflow:hidden;">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#0a0e17 0%,#111827 100%); padding:32px 32px 24px; text-align:center;">
            <div style="display:inline-block; background:rgba(0,212,255,0.15); border:1px solid rgba(0,212,255,0.3); border-radius:12px; padding:10px 18px; margin-bottom:16px;">
              <span style="color:#00D4FF; font-size:20px; font-weight:700; letter-spacing:2px;">NTS</span>
            </div>
            <h1 style="color:#ffffff; margin:0; font-size:20px; font-weight:600;">Password Recovery</h1>
            <p style="color:rgba(255,255,255,0.4); margin:8px 0 0; font-size:13px;">Your account credentials have been reset</p>
          </div>

          <!-- Body -->
          <div style="padding:28px 32px; background:#ffffff;">
            <p style="color:#374151; margin:0 0 16px; font-size:14px;">Hi <strong>${to_name}</strong>,</p>
            <p style="color:#374151; margin:0 0 20px; font-size:14px;">
              You requested a password reset for your NTS Management account. Here is your new temporary password:
            </p>

            <!-- Password Box -->
            <div style="background:#f3f4f6; border:1px solid #e5e7eb; border-left:4px solid #00D4FF; border-radius:8px; padding:16px 20px; margin:0 0 24px;">
              <p style="margin:0 0 4px; color:#6b7280; font-size:11px; text-transform:uppercase; letter-spacing:1px;">New Password</p>
              <p style="margin:0; font-family:'Courier New',monospace; font-size:22px; font-weight:700; color:#111827; letter-spacing:3px;">${newPassword}</p>
            </div>

            <a href="${loginUrl}" style="display:inline-block; background:#00D4FF; color:#050810; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; font-size:14px; margin-bottom:24px;">
              Login Now →
            </a>

            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px 16px; margin-top:4px;">
              <p style="margin:0; color:#92400e; font-size:12px;">
                ⚠️ For security, please change this password immediately after logging in via Settings → Change Password.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:16px 32px; background:#f9fafb; border-top:1px solid #e5e7eb; text-align:center;">
            <p style="margin:0; color:#9ca3af; font-size:11px;">
              If you did not request this, please contact your administrator immediately.<br/>
              NTS Management System
            </p>
          </div>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("❌ Password reset email failed:", error);
    return false;
  }
}

// POST /api/profile/forgot-password
// Logged-in user requests their own password to be reset & emailed
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).select("+password");
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate + hash new password
    const newPassword  = generateNewPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(session.user.id, { password: hashedPassword });

    // Send email
    const sent = await sendPasswordResetEmail(user.email, user.name, newPassword);

    if (!sent) {
      // Rollback is not critical here — log and inform
      return NextResponse.json(
        { error: "Password was reset but email could not be sent. Contact your admin." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A new password has been sent to ${user.email}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
