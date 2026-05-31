// src/lib/email.ts
import nodemailer from "nodemailer";

interface EmailData {
  to_email: string;
  to_name: string;
  role: string;
  password: string;
  login_url: string;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

export async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"NTS Management" <${process.env.EMAIL_USER}>`,
      to: data.to_email,
      subject: `Welcome to NTS Management — Your Account Details`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a56db;">Welcome to NTS Management System</h2>
          <p>Hi <strong>${data.to_name}</strong>,</p>
          <p>Your account has been created. Here are your login credentials:</p>
          <table style="background:#f3f4f6; padding:16px; border-radius:8px; width:100%;">
            <tr><td><strong>Role:</strong></td><td>${data.role}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${data.to_email}</td></tr>
            <tr><td><strong>Temporary Password:</strong></td><td style="font-family:monospace;">${data.password}</td></tr>
          </table>
          <p style="margin-top:16px;">
            <a href="${data.login_url}" style="background:#1a56db; color:white; padding:10px 20px; border-radius:6px; text-decoration:none;">
              Login Now
            </a>
          </p>
          <p style="color:#6b7280; font-size:12px; margin-top:24px;">
            Please change your password after first login for security.
          </p>
        </div>
      `,
    });
    console.log("✅ Email sent to:", data.to_email);
    return true;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return false;
  }
}

export function createOnboardingEmail(name: string, email: string, password: string, role: string): EmailData {
  return {
    to_email: email,
    to_name: name,
    role: role,
    password: password,
    login_url: (process.env.NEXTAUTH_URL || "http://localhost:3000") + "/login",
  };
}

// BUG-H1 FIX: These helpers were misusing the `password` field for task data.
// They are also dead code (never called). Kept below as placeholder stubs
// in case email notifications for tasks are implemented in the future.
// When implementing, create a separate email template (not reusing the password field).

// export function createTaskAssignedEmail(...) { /* TODO: implement with correct template */ }
// export function createTaskStatusEmail(...) { /* TODO: implement with correct template */ }
// export function createDeadlineReminderEmail(...) { /* TODO: implement with correct template */ }